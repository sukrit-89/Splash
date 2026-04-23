import {
  Address,
  BASE_FEE,
  Contract,
  Networks,
  TransactionBuilder,
  nativeToScVal,
  rpc,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";
import type { Stream } from "../types/stream";

const TESTNET_RPC_URL = "https://soroban-testnet.stellar.org";
const TOKEN_DECIMALS = 7;
const TOKEN_SCALE = 10n ** BigInt(TOKEN_DECIMALS);
const DEFAULT_TX_TIMEOUT_SECONDS = 180;
const POLL_INTERVAL_MS = 1000;
const MAX_POLL_ATTEMPTS = 45;

export type TokenSymbol = "USDC" | "XLM";

export type TransactionStep = "signing" | "submitting" | "confirmed";

export type StreamFormInput = {
  sender: string;
  recipient: string;
  token: TokenSymbol;
  amountPerDay: string;
  durationDays: string;
};

export const stellarConfig = {
  rpcUrl: import.meta.env.VITE_STELLAR_RPC_URL || TESTNET_RPC_URL,
  networkPassphrase: import.meta.env.VITE_STELLAR_NETWORK_PASSPHRASE || Networks.TESTNET,
  contractId: import.meta.env.VITE_STREAMVAULT_CONTRACT_ID || "",
  tokenContracts: {
    USDC: import.meta.env.VITE_USDC_TOKEN_CONTRACT_ID || "",
    XLM: import.meta.env.VITE_XLM_TOKEN_CONTRACT_ID || "",
  } satisfies Record<TokenSymbol, string>,
};

export const stellarRpc = new rpc.Server(stellarConfig.rpcUrl);

export function truncateAddress(address: string) {
  return address.length > 12 ? `${address.slice(0, 5)}...${address.slice(-5)}` : address;
}

export function validateContractConfig(token: TokenSymbol) {
  validateVaultConfig();
  if (!stellarConfig.tokenContracts[token]) {
    throw new Error(`Missing VITE_${token}_TOKEN_CONTRACT_ID.`);
  }
}

export function validateVaultConfig() {
  if (!stellarConfig.contractId) {
    throw new Error("Missing VITE_STREAMVAULT_CONTRACT_ID.");
  }
}

export function isValidStellarAddress(address: string) {
  try {
    Address.fromString(address);
    return true;
  } catch {
    return false;
  }
}

export function parseDecimalToUnits(value: string, decimals = TOKEN_DECIMALS) {
  const normalized = value.trim();
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error("Enter a positive numeric amount.");
  }

  const [whole, fraction = ""] = normalized.split(".");
  const padded = fraction.padEnd(decimals, "0").slice(0, decimals);
  const units = BigInt(whole) * 10n ** BigInt(decimals) + BigInt(padded || "0");

  if (units <= 0n) {
    throw new Error("Amount must be greater than zero.");
  }

  return units;
}

export function unitsToNumber(value: bigint) {
  return Number(value) / Number(TOKEN_SCALE);
}

export function unitsToDisplay(value: bigint, maximumFractionDigits = 7) {
  return unitsToNumber(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits,
  });
}

export function formToContractAmounts(input: Pick<StreamFormInput, "amountPerDay" | "durationDays">) {
  const dailyUnits = parseDecimalToUnits(input.amountPerDay);
  const durationDays = Number(input.durationDays);

  if (!Number.isFinite(durationDays) || durationDays <= 0) {
    throw new Error("Duration must be greater than zero days.");
  }

  const durationSeconds = BigInt(Math.round(durationDays * 86400));
  if (durationSeconds <= 0n) {
    throw new Error("Duration is too short.");
  }

  const ratePerSecond = dailyUnits / 86400n;
  if (ratePerSecond <= 0n) {
    throw new Error("Daily amount is too small for a non-zero per-second stream.");
  }

  return {
    ratePerSecond,
    durationSeconds,
    totalDeposit: ratePerSecond * durationSeconds,
  };
}

function scAddress(address: string) {
  return Address.fromString(address).toScVal();
}

function scI128(value: bigint) {
  return nativeToScVal(value, { type: "i128" });
}

function scU64(value: bigint | number) {
  return nativeToScVal(BigInt(value), { type: "u64" });
}

function asBigInt(value: unknown) {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  if (typeof value === "string") return BigInt(value);
  throw new Error("Unexpected numeric value returned from contract.");
}

function getStructValue(source: unknown, key: string) {
  if (source instanceof Map) return source.get(key);
  if (source && typeof source === "object") return (source as Record<string, unknown>)[key];
  return undefined;
}

function getStatus(value: unknown): Stream["status"] {
  const raw = String(value ?? "Active").toLowerCase();
  if (raw.includes("cancel")) return "cancelled";
  if (raw.includes("complete")) return "completed";
  return "active";
}

function streamFromNative(streamId: number, native: unknown, viewer: string): Stream {
  const sender = String(getStructValue(native, "sender") ?? "");
  const recipient = String(getStructValue(native, "recipient") ?? "");
  const tokenContractId = String(getStructValue(native, "token") ?? "");
  const ratePerSecond = asBigInt(getStructValue(native, "rate_per_second"));
  const totalDeposit = asBigInt(getStructValue(native, "total_deposit"));
  const alreadyWithdrawn = asBigInt(getStructValue(native, "already_withdrawn"));
  const startTimestamp = asBigInt(getStructValue(native, "start_timestamp"));
  const endTimestamp = asBigInt(getStructValue(native, "end_timestamp"));

  return {
    id: `stream-${streamId}`,
    streamId,
    role: viewer === recipient ? "recipient" : "sender",
    sender,
    recipient,
    token: tokenContractId === stellarConfig.tokenContracts.XLM ? "XLM" : "USDC",
    tokenContractId,
    ratePerSecond: unitsToNumber(ratePerSecond),
    totalDeposit: unitsToNumber(totalDeposit),
    withdrawn: unitsToNumber(alreadyWithdrawn),
    startTime: Number(startTimestamp) * 1000,
    endTime: Number(endTimestamp) * 1000,
    status: getStatus(getStructValue(native, "status")),
    lastSyncedAt: Date.now(),
  };
}

async function buildContractTx(sourceAddress: string, method: string, args: xdr.ScVal[]) {
  const account = await stellarRpc.getAccount(sourceAddress);
  const contract = new Contract(stellarConfig.contractId);
  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: stellarConfig.networkPassphrase,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(DEFAULT_TX_TIMEOUT_SECONDS)
    .build();

  return stellarRpc.prepareTransaction(transaction);
}

async function simulateContract(sourceAddress: string, method: string, args: xdr.ScVal[]) {
  const account = await stellarRpc.getAccount(sourceAddress);
  const contract = new Contract(stellarConfig.contractId);
  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: stellarConfig.networkPassphrase,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(DEFAULT_TX_TIMEOUT_SECONDS)
    .build();

  const simulation = await stellarRpc.simulateTransaction(transaction);
  if (rpc.Api.isSimulationError(simulation)) {
    throw new Error(`Simulation failed: ${simulation.error}`);
  }
  if (!simulation.result) {
    throw new Error("Contract did not return a result.");
  }
  return simulation.result.retval;
}

export async function submitSignedTransaction(signedXdr: string) {
  const signedTx = TransactionBuilder.fromXDR(signedXdr, stellarConfig.networkPassphrase);
  const submitted = await stellarRpc.sendTransaction(signedTx);

  if (submitted.status === "ERROR") {
    throw new Error(`Transaction rejected by RPC: ${submitted.errorResult?.toXDR("base64") ?? "unknown error"}`);
  }
  if (submitted.status !== "PENDING" && submitted.status !== "DUPLICATE") {
    throw new Error(`Transaction was not accepted: ${submitted.status}`);
  }

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    await new Promise((resolve) => window.setTimeout(resolve, POLL_INTERVAL_MS));
    const result = await stellarRpc.getTransaction(submitted.hash);

    if (result.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      return {
        hash: submitted.hash,
        returnValue: result.returnValue,
      };
    }
    if (result.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new Error(`Transaction failed: ${result.resultXdr.toXDR("base64")}`);
    }
  }

  throw new Error("Timed out waiting for transaction confirmation.");
}

export async function createStream(
  input: StreamFormInput,
  signTransaction: (xdr: string) => Promise<string>,
  onStep?: (step: TransactionStep) => void
) {
  validateContractConfig(input.token);
  if (!isValidStellarAddress(input.recipient)) {
    throw new Error("Recipient address is not a valid Stellar address.");
  }

  const tokenContractId = stellarConfig.tokenContracts[input.token];
  const amounts = formToContractAmounts(input);

  const prepared = await buildContractTx(input.sender, "create_stream", [
    scAddress(input.sender),
    scAddress(input.recipient),
    scAddress(tokenContractId),
    scI128(amounts.ratePerSecond),
    scU64(amounts.durationSeconds),
  ]);

  onStep?.("signing");
  const signedXdr = await signTransaction(prepared.toXDR());
  onStep?.("submitting");
  const submitted = await submitSignedTransaction(signedXdr);
  onStep?.("confirmed");

  const streamId = submitted.returnValue ? Number(scValToNative(submitted.returnValue)) : undefined;
  if (streamId === undefined || Number.isNaN(streamId)) {
    throw new Error("Stream was confirmed but no stream ID was returned.");
  }

  return getStream(input.sender, streamId);
}

export async function getStream(viewerAddress: string, streamId: number) {
  validateVaultConfig();
  const result = await simulateContract(viewerAddress, "get_stream", [scU64(streamId)]);
  return streamFromNative(streamId, scValToNative(result), viewerAddress);
}

export async function getStreamCount(sourceAddress: string) {
  validateVaultConfig();
  const result = await simulateContract(sourceAddress, "get_stream_count", []);
  return Number(scValToNative(result));
}

export async function getStreamsForWallet(viewerAddress: string) {
  const count = await getStreamCount(viewerAddress);
  const streams: Stream[] = [];

  for (let streamId = 0; streamId < count; streamId += 1) {
    try {
      const stream = await getStream(viewerAddress, streamId);
      if (stream.sender === viewerAddress || stream.recipient === viewerAddress) {
        streams.push(stream);
      }
    } catch {
      // Keep discovery resilient if a historical stream cannot be decoded.
    }
  }

  return streams;
}

export async function getClaimable(sourceAddress: string, streamId: number) {
  validateVaultConfig();
  const result = await simulateContract(sourceAddress, "get_claimable", [scU64(streamId)]);
  return unitsToNumber(asBigInt(scValToNative(result)));
}

export async function withdrawStream(
  recipient: string,
  streamId: number,
  signTransaction: (xdr: string) => Promise<string>,
  onStep?: (step: TransactionStep) => void
) {
  validateVaultConfig();
  const prepared = await buildContractTx(recipient, "withdraw", [scU64(streamId)]);
  onStep?.("signing");
  const signedXdr = await signTransaction(prepared.toXDR());
  onStep?.("submitting");
  const submitted = await submitSignedTransaction(signedXdr);
  onStep?.("confirmed");

  return submitted.returnValue ? unitsToNumber(asBigInt(scValToNative(submitted.returnValue))) : 0;
}

export async function cancelStream(
  sender: string,
  streamId: number,
  signTransaction: (xdr: string) => Promise<string>,
  onStep?: (step: TransactionStep) => void
) {
  validateVaultConfig();
  const prepared = await buildContractTx(sender, "cancel", [scU64(streamId)]);
  onStep?.("signing");
  const signedXdr = await signTransaction(prepared.toXDR());
  onStep?.("submitting");
  const submitted = await submitSignedTransaction(signedXdr);
  onStep?.("confirmed");

  const result = submitted.returnValue ? scValToNative(submitted.returnValue) : undefined;
  const recipientOwed = asBigInt(Array.isArray(result) ? result[0] : getStructValue(result, "0"));
  const senderRefund = asBigInt(Array.isArray(result) ? result[1] : getStructValue(result, "1"));

  return {
    recipientOwed: unitsToNumber(recipientOwed),
    senderRefund: unitsToNumber(senderRefund),
  };
}
