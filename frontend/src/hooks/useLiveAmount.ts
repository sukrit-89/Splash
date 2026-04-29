import { useEffect, useState } from "react";

const TICK_INTERVAL_MS = 100;

export function useLiveAmount(
  startTimestamp: number,
  ratePerSecond: number,
  alreadyWithdrawn: number,
  cap: number,
): number {
  const calculate = (): number => {
    const elapsed = Math.max(0, Date.now() / 1000 - startTimestamp);
    const streamed = Math.min(cap, elapsed * ratePerSecond);
    return Math.max(0, streamed - alreadyWithdrawn);
  };

  const [amount, setAmount] = useState(calculate);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setAmount(calculate());
    }, TICK_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [startTimestamp, ratePerSecond, alreadyWithdrawn, cap]);

  return amount;
}
