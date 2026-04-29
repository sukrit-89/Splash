import { useEffect, useMemo, useState } from "react";
import {
  readCachedActivity,
  readCachedStreams,
  readCachedWithdrawals,
  roleFor,
} from "../lib/streamStorage";
import { getClaimable } from "../lib/formatters";
import { Stream, StreamRole, StreamStatus } from "../types/stream";
import { useWallet } from "./useWallet";

function useCachedStreamState() {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const refresh = () => setVersion((current) => current + 1);
    window.addEventListener("storage", refresh);
    window.addEventListener("splash:streams", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("splash:streams", refresh);
    };
  }, []);

  return version;
}

export function useStreams() {
  const { address } = useWallet();
  const version = useCachedStreamState();
  const streams = useMemo(
    () =>
      readCachedStreams()
        .map((stream) => ({
          ...stream,
          flowBurned: stream.flowBurned ?? 0,
          blendPosition: stream.blendPosition ?? 0,
          yieldEarned: stream.yieldEarned ?? 0,
          role: roleFor(stream, address),
          lifetimeReceived:
            stream.recipient === address
              ? Math.max(stream.lifetimeReceived, stream.alreadyWithdrawn)
              : stream.lifetimeReceived,
        }))
        .sort((a, b) => b.createdAt - a.createdAt),
    [address, version],
  );
  const activeStreams = streams.filter(
    (stream) =>
      stream.status === StreamStatus.Active ||
      stream.status === StreamStatus.Pending,
  );

  const totalStreamingOut = activeStreams
    .filter((stream) => stream.role === StreamRole.Sender)
    .reduce((sum, stream) => sum + getClaimable(stream), 0);
  const totalClaimable = activeStreams
    .filter((stream) => stream.role === StreamRole.Recipient)
    .reduce((sum, stream) => sum + getClaimable(stream), 0);
  const lifetimeReceived = streams.reduce(
    (sum, stream) => sum + stream.lifetimeReceived,
    0,
  );

  return {
    streams,
    activeStreams,
    activity: readCachedActivity(),
    withdrawals: readCachedWithdrawals(),
    totals: {
      totalStreamingOut,
      totalClaimable,
      lifetimeReceived,
    },
  };
}

export function useStream(id: string | undefined): {
  stream: Stream | null;
  withdrawals: ReturnType<typeof readCachedWithdrawals>;
} {
  const { streams, withdrawals } = useStreams();
  return {
    stream: streams.find((stream) => stream.id === id) ?? streams[0] ?? null,
    withdrawals: withdrawals.filter(
      (withdrawal) => !id || streams.some((stream) => stream.id === id),
    ),
  };
}
