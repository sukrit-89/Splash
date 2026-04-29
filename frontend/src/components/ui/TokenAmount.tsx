import { formatTokenAmount } from "../../lib/formatters";

interface TokenAmountProps {
  amount: number;
  symbol: string;
  size?: "sm" | "md" | "lg";
  color?: "default" | "accent" | "muted";
  animated?: boolean;
  className?: string;
}

const sizeClass = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-3xl",
};

const colorClass = {
  default: "text-[var(--text-primary)]",
  accent: "text-[var(--accent)]",
  muted: "text-[var(--text-muted)]",
};

export function TokenAmount({
  amount,
  symbol,
  size = "sm",
  color = "default",
  animated = false,
  className = "",
}: TokenAmountProps) {
  if (amount === 0) {
    return (
      <span className={`block text-right font-mono text-[var(--text-muted)] ${className}`}>
        -
      </span>
    );
  }

  return (
    <span
      className={`block text-right font-mono font-medium tabular-nums ${sizeClass[size]} ${colorClass[color]} ${
        animated ? "transition-transform duration-200" : ""
      } ${className}`}
    >
      {formatTokenAmount(amount)}
      <span className="ml-1.5 text-[var(--text-muted)]">{symbol}</span>
    </span>
  );
}
