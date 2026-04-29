import {
  Address,
  BASE_FEE,
  Contract,
  Networks,
  TransactionBuilder,
  rpc,
  nativeToScVal,
  scValToNative,
  StrKey,
  xdr,
} from "@stellar/stellar-sdk";

export const rpcUrl =
  (import.meta.env.VITE_STELLAR_RPC_URL as string) ||
  "https://soroban-testnet.stellar.org";
export const networkPassphrase = import.meta.env
  .VITE_STELLAR_NETWORK_PASSPHRASE as string || Networks.TESTNET;
export const streamVaultContractId = import.meta.env
  .VITE_STREAMVAULT_CONTRACT_ID as string;
export const tokenContracts = {
  USDC: import.meta.env.VITE_USDC_TOKEN_CONTRACT_ID as string,
  XLM: import.meta.env.VITE_XLM_TOKEN_CONTRACT_ID as string,
};

const server = new rpc.Server(rpcUrl);

export { scValToNative };

export interface ConfirmedTransaction {
  hash: string;
}

interface RawTransactionPoller {
  _getTransaction: (hash: string) => Promise<{
    status: string;
    ledger?: number;
    resultXdr?: string;
  }>;
}

export function requireConfig(value: string | undefined, label: string): string {
  if (!value) {
    throw new Error(`Missing ${label}. Check frontend environment variables.`);
  }

  return value;
}

export function isValidStellarAddress(address: string): boolean {
  return StrKey.isValidEd25519PublicKey(address);
}

export function parseSorobanError(error: unknown): string {
  if (error instanceof Error) {
    const match = error.message.match(/Error\(([^)]+)\)/);
    return match ? `Soroban error ${match[1]}` : error.message;
  }

  return "Soroban request failed without a structured error code";
}

export function tokenContractFor(symbol: "USDC" | "XLM"): string {
  return requireConfig(tokenContracts[symbol], `token contract for ${symbol}`);
}

export function toContractAmount(amount: number): bigint {
  return BigInt(Math.round(amount * 10_000_000));
}

export function fromContractAmount(amount: bigint | number | string): number {
  return Number(amount) / 10_000_000;
}

export function addressScVal(address: string): xdr.ScVal {
  return Address.fromString(address).toScVal();
}

export function i128ScVal(value: bigint): xdr.ScVal {
  return nativeToScVal(value, { type: "i128" });
}

export function u64ScVal(value: bigint | number): xdr.ScVal {
  return nativeToScVal(typeof value === "bigint" ? value : BigInt(value), {
    type: "u64",
  });
}

export async function simulateContract<T>(
  sourceAddress: string,
  method: string,
  args: xdr.ScVal[],
): Promise<T> {
  const source = await server.getAccount(sourceAddress);
  const contract = new Contract(
    requireConfig(streamVaultContractId, "VITE_STREAMVAULT_CONTRACT_ID"),
  );
  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(180)
    .build();

  const simulation = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(simulation)) {
    throw new Error(`Simulation failed: ${simulation.error}`);
  }
  if (!simulation.result) {
    throw new Error(`Simulation returned no value for ${method}`);
  }

  return scValToNative(simulation.result.retval) as T;
}

export async function invokeContract(
  sourceAddress: string,
  method: string,
  args: xdr.ScVal[],
  signTransaction: (transactionXdr: string) => Promise<string>,
): Promise<ConfirmedTransaction> {
  const source = await server.getAccount(sourceAddress);
  const contract = new Contract(
    requireConfig(streamVaultContractId, "VITE_STREAMVAULT_CONTRACT_ID"),
  );
  const rawTx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(180)
    .build();

  const simulation = await server.simulateTransaction(rawTx);
  if (rpc.Api.isSimulationError(simulation)) {
    throw new Error(`Simulation failed: ${simulation.error}`);
  }

  const preparedTx = rpc.assembleTransaction(rawTx, simulation).build();
  const signedXdr = await signTransaction(preparedTx.toXDR());
  const signedTx = TransactionBuilder.fromXDR(
    signedXdr,
    networkPassphrase,
  );
  const sent = await server.sendTransaction(signedTx);
  if (sent.status === "ERROR") {
    throw new Error(`Transaction rejected by RPC: ${sent.errorResult}`);
  }

  for (let attempt = 0; attempt < 45; attempt += 1) {
    await new Promise((resolve) => window.setTimeout(resolve, 1000));
    const result = await (server as unknown as RawTransactionPoller)._getTransaction(
      sent.hash,
    );
    if (result.status === "SUCCESS") {
      return {
        hash: sent.hash,
      };
    }
    if (result.status === "FAILED") {
      throw new Error(`Transaction failed on ledger ${result.ledger}`);
    }
  }

  throw new Error(`Timed out waiting for transaction ${sent.hash}`);
}
