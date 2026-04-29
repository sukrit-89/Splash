import { useState } from "react";
import { useWallet } from "./useWallet";
import {
  addressScVal,
  fromContractAmount,
  i128ScVal,
  invokeContract,
  parseSorobanError,
  simulateContract,
  streamFactoryContractId,
  streamVaultContractId,
  toContractAmount,
  tokenContractFor,
  tokenContracts,
  u64ScVal,
} from "../lib/stellar";
import {
  addCachedActivity,
  addCachedWithdrawal,
  statusFromContract,
  tokenFromContract,
  upsertCachedStream,
  updateCachedStream,
  makeActivity,
} from "../lib/streamStorage";
import {
  ActivityEventType,
  Stream,
  StreamRole,
  StreamStatus,
  TokenSymbol,
} from "../types/stream";
import { ToastStatus, useToast } from "./useToast";

interface StreamActionState {
  isLoading: boolean;
  error: string | null;
}

interface CreateStreamInput {
  recipient: string;
  token: TokenSymbol.USDC | TokenSymbol.XLM;
  ratePerSecond: number;
  durationSeconds: number;
}

interface ContractStream {
  sender: unknown;
  recipient: unknown;
  token: unknown;
  rate_per_second: bigint | number | string;
  total_deposit: bigint | number | string;
  already_withdrawn: bigint | number | string;
  flow_burned?: bigint | number | string;
  blend_position?: bigint | number | string;
  yield_earned?: bigint | number | string;
  start_timestamp: bigint | number | string;
  end_timestamp: bigint | number | string;
  status: unknown;
}

function stringifyAddress(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value && typeof value === "object" && "toString" in value) {
    return String(value);
  }

  return "";
}

function numberFrom(value: bigint | number | string): number {
  return Number(value);
}

function nativeStreamToStream(
  id: string,
  native: ContractStream,
  walletAddress: string,
): Stream {
  const sender = stringifyAddress(native.sender);
  const recipient = stringifyAddress(native.recipient);
  const tokenAddress = stringifyAddress(native.token);
  const token = tokenFromContract(
    tokenAddress,
    tokenContracts.USDC,
    tokenContracts.XLM,
  );
  const startTimestamp = numberFrom(native.start_timestamp);

  return {
    id,
    sender,
    recipient,
    token,
    totalDeposit: fromContractAmount(native.total_deposit),
    ratePerSecond: fromContractAmount(native.rate_per_second),
    alreadyWithdrawn: fromContractAmount(native.already_withdrawn),
    flowBurned: fromContractAmount(native.flow_burned ?? 0),
    blendPosition: fromContractAmount(native.blend_position ?? 0),
    yieldEarned: fromContractAmount(native.yield_earned ?? 0),
    lifetimeReceived:
      recipient === walletAddress ? fromContractAmount(native.already_withdrawn) : 0,
    startTimestamp,
    endTimestamp: numberFrom(native.end_timestamp),
    createdAt: startTimestamp,
    status: statusFromContract(native.status),
    role: recipient === walletAddress ? StreamRole.Recipient : StreamRole.Sender,
  };
}

async function loadStreamFromContract(
  sourceAddress: string,
  streamId: string,
): Promise<Stream> {
  const native = await simulateContract<ContractStream>(
    sourceAddress,
    "get_stream",
    [u64ScVal(BigInt(streamId))],
  );
  return nativeStreamToStream(streamId, native, sourceAddress);
}

async function getNextStreamId(sourceAddress: string): Promise<string> {
  const count = await simulateContract<bigint | number | string>(
    sourceAddress,
    "get_stream_count",
    [],
  );
  return String(count);
}

async function getClaimableFromContract(
  sourceAddress: string,
  streamId: string,
): Promise<number> {
  const claimable = await simulateContract<bigint | number | string>(
    sourceAddress,
    "get_claimable",
    [u64ScVal(BigInt(streamId))],
  );
  return fromContractAmount(claimable);
}

function useStreamActionState() {
  return useState<StreamActionState>({
    isLoading: false,
    error: null,
  });
}

export function useCreateStream() {
  const [state, setState] = useStreamActionState();
  const { address, signTransaction } = useWallet();
  const { pushToast } = useToast();

  const createStream = async (input: CreateStreamInput): Promise<Stream> => {
    if (!address) {
      throw new Error("Connect Freighter before creating a stream");
    }

    setState({ isLoading: true, error: null });

    try {
      const tokenAddress = tokenContractFor(input.token);
      const ratePerSecond = toContractAmount(input.ratePerSecond);
      if (ratePerSecond <= 0n) {
        throw new Error("Flow rate is too small for 7-decimal token precision");
      }

      const streamId = await getNextStreamId(address);
      const result = await invokeContract(
        address,
        "create_stream",
        streamFactoryContractId
          ? [
              addressScVal(address),
              addressScVal(streamVaultContractId),
              addressScVal(input.recipient),
              addressScVal(tokenAddress),
              i128ScVal(ratePerSecond),
              u64ScVal(input.durationSeconds),
            ]
          : [
              addressScVal(address),
              addressScVal(input.recipient),
              addressScVal(tokenAddress),
              i128ScVal(ratePerSecond),
              u64ScVal(input.durationSeconds),
            ],
        signTransaction,
        streamFactoryContractId,
      );
      const stream = await loadStreamFromContract(address, streamId);

      upsertCachedStream(stream);
      addCachedActivity(
        makeActivity(
          ActivityEventType.StreamCreated,
          stream,
          input.recipient,
          result.hash,
          stream.totalDeposit,
        ),
      );
      pushToast({
        status: ToastStatus.Success,
        title: "Stream created",
        description: `Tx ${result.hash.slice(0, 10)}...${result.hash.slice(-8)} confirmed on Stellar testnet.`,
        txHash: result.hash,
      });
      setState({ isLoading: false, error: null });
      return stream;
    } catch (error) {
      const message = parseSorobanError(error);
      setState({ isLoading: false, error: message });
      pushToast({
        status: ToastStatus.Error,
        title: "Create stream failed",
        description: message,
      });
      throw error;
    }
  };

  return { ...state, createStream };
}

export function useWithdraw() {
  const [state, setState] = useStreamActionState();
  const { address, signTransaction } = useWallet();
  const { pushToast } = useToast();

  const withdraw = async (stream: Stream): Promise<void> => {
    if (!address) {
      throw new Error("Connect Freighter before withdrawing");
    }

    setState({ isLoading: true, error: null });
    try {
      const amount = await getClaimableFromContract(address, stream.id);
      const result = await invokeContract(
        address,
        "withdraw",
        [u64ScVal(BigInt(stream.id))],
        signTransaction,
      );
      const synced = await loadStreamFromContract(address, stream.id);
      upsertCachedStream(synced);
      addCachedWithdrawal({
        id: result.hash,
        timestamp: Math.floor(Date.now() / 1000),
        amount,
        token: stream.token,
        txHash: result.hash,
      });
      addCachedActivity(
        makeActivity(
          ActivityEventType.Withdrawal,
          synced,
          address,
          result.hash,
          amount,
        ),
      );
      pushToast({
        status: ToastStatus.Success,
        title: "Withdrawal confirmed",
        description: `${amount.toFixed(6)} ${stream.token} withdrawn on testnet.`,
        txHash: result.hash,
      });
      setState({ isLoading: false, error: null });
    } catch (error) {
      const message = parseSorobanError(error);
      setState({ isLoading: false, error: message });
      pushToast({
        status: ToastStatus.Error,
        title: "Withdrawal failed",
        description: message,
      });
      throw error;
    }
  };

  return { ...state, withdraw };
}

export function useCancelStream() {
  const [state, setState] = useStreamActionState();
  const { address, signTransaction } = useWallet();
  const { pushToast } = useToast();

  const cancelStream = async (stream: Stream): Promise<void> => {
    if (!address) {
      throw new Error("Connect Freighter before cancelling");
    }

    setState({ isLoading: true, error: null });
    try {
      const result = await invokeContract(
        address,
        "cancel",
        [u64ScVal(BigInt(stream.id))],
        signTransaction,
      );
      updateCachedStream(stream.id, { status: StreamStatus.Cancelled });
      addCachedActivity(
        makeActivity(ActivityEventType.Cancelled, stream, address, result.hash),
      );
      pushToast({
        status: ToastStatus.Success,
        title: "Stream cancelled",
        description: `Tx ${result.hash.slice(0, 10)}...${result.hash.slice(-8)} confirmed on Stellar testnet.`,
        txHash: result.hash,
      });
      setState({ isLoading: false, error: null });
    } catch (error) {
      const message = parseSorobanError(error);
      setState({ isLoading: false, error: message });
      pushToast({
        status: ToastStatus.Error,
        title: "Cancel failed",
        description: message,
      });
      throw error;
    }
  };

  return { ...state, cancelStream };
}
