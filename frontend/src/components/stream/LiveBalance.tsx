import { formatLiveAmount } from "../../lib/formatters";
import { useLiveAmount } from "../../hooks/useLiveAmount";

interface LiveBalanceProps {
  startTimestamp: number;
  ratePerSecond: number;
  alreadyWithdrawn: number;
  cap: number;
  symbol: string;
  className?: string;
}

export function LiveBalance({
  startTimestamp,
  ratePerSecond,
  alreadyWithdrawn,
  cap,
  symbol,
  className = "",
}: LiveBalanceProps) {
  const amount = useLiveAmount(startTimestamp, ratePerSecond, alreadyWithdrawn, cap);

  return (
    <span className={`font-mono font-medium tabular-nums text-[var(--accent)] ${className}`}>
      {formatLiveAmount(amount)}
      <span className="ml-1.5 text-[var(--text-muted)]">{symbol}</span>
    </span>
  );
}
