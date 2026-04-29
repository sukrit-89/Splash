import {
  ActivityEvent,
  ActivityEventType,
  Stream,
  StreamRole,
  StreamStatus,
  TokenSymbol,
  WithdrawalRecord,
} from "../types/stream";

const streamStorageKey = "splash_streams";
const withdrawalStorageKey = "splash_withdrawals";
const activityStorageKey = "splash_activity";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function readCachedStreams(): Stream[] {
  return readJson<Stream[]>(streamStorageKey, []);
}

export function writeCachedStreams(streams: Stream[]) {
  writeJson(streamStorageKey, streams);
  window.dispatchEvent(new Event("splash:streams"));
}

export function upsertCachedStream(stream: Stream) {
  const streams = readCachedStreams();
  const next = [stream, ...streams.filter((item) => item.id !== stream.id)];
  writeCachedStreams(next);
}

export function updateCachedStream(streamId: string, patch: Partial<Stream>) {
  const next = readCachedStreams().map((stream) =>
    stream.id === streamId ? { ...stream, ...patch } : stream,
  );
  writeCachedStreams(next);
}

export function readCachedWithdrawals(): WithdrawalRecord[] {
  return readJson<WithdrawalRecord[]>(withdrawalStorageKey, []);
}

export function addCachedWithdrawal(withdrawal: WithdrawalRecord) {
  const next = [withdrawal, ...readCachedWithdrawals()];
  writeJson(withdrawalStorageKey, next);
  window.dispatchEvent(new Event("splash:streams"));
}

export function readCachedActivity(): ActivityEvent[] {
  return readJson<ActivityEvent[]>(activityStorageKey, []);
}

export function addCachedActivity(event: ActivityEvent) {
  const next = [event, ...readCachedActivity()];
  writeJson(activityStorageKey, next);
  window.dispatchEvent(new Event("splash:streams"));
}

export function roleFor(stream: Stream, walletAddress: string | null): StreamRole {
  if (walletAddress && stream.recipient === walletAddress) {
    return StreamRole.Recipient;
  }

  return StreamRole.Sender;
}

export function makeActivity(
  type: ActivityEventType,
  stream: Stream,
  address: string,
  txHash: string,
  amount?: number,
): ActivityEvent {
  return {
    id: txHash,
    type,
    streamId: stream.id,
    address,
    amount,
    token: stream.token,
    timestamp: Math.floor(Date.now() / 1000),
    ledger: 0,
  };
}

export function tokenFromContract(
  tokenAddress: string,
  usdcAddress: string,
  xlmAddress: string,
): TokenSymbol {
  if (tokenAddress === xlmAddress) {
    return TokenSymbol.XLM;
  }
  if (tokenAddress === usdcAddress) {
    return TokenSymbol.USDC;
  }

  return TokenSymbol.USDC;
}

export function statusFromContract(status: unknown): StreamStatus {
  const text = String(
    typeof status === "object" && status && "tag" in status
      ? (status as { tag: unknown }).tag
      : status,
  ).toLowerCase();

  if (text.includes("cancel")) {
    return StreamStatus.Cancelled;
  }
  if (text.includes("complete")) {
    return StreamStatus.Completed;
  }

  return StreamStatus.Active;
}
