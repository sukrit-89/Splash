import { useEffect, useMemo, useState } from "react";
import type { Stream } from "../types/stream";

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function getClaimable(stream: Stream, at = Date.now()) {
  if (stream.syncedClaimable !== undefined && stream.claimableSyncedAt !== undefined) {
    const elapsedSinceSync = Math.max(0, (at - stream.claimableSyncedAt) / 1000);
    return clamp(
      stream.syncedClaimable + elapsedSinceSync * stream.ratePerSecond,
      0,
      stream.totalDeposit - stream.withdrawn
    );
  }

  const elapsedSeconds = clamp((at - stream.startTime) / 1000, 0, (stream.endTime - stream.startTime) / 1000);
  const accrued = elapsedSeconds * stream.ratePerSecond;
  return clamp(accrued - stream.withdrawn, 0, stream.totalDeposit - stream.withdrawn);
}

export function useTickerBalance(stream: Stream | undefined, tickMs = 100) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), tickMs);
    return () => window.clearInterval(id);
  }, [tickMs]);

  return useMemo(() => (stream ? getClaimable(stream, now) : 0), [now, stream]);
}

export function useDemoBalance(ratePerSecond = 0.0042, tickMs = 100) {
  const [startedAt] = useState(() => Date.now() - 1000 * 60 * 38);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), tickMs);
    return () => window.clearInterval(id);
  }, [tickMs]);

  return ((now - startedAt) / 1000) * ratePerSecond;
}
