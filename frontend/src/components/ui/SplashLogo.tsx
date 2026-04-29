interface SplashLogoProps {
  compact?: boolean;
  className?: string;
}

export function SplashLogo({
  compact = false,
  className = "",
}: SplashLogoProps) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <span className="relative flex h-7 w-7 items-center justify-center rounded-md border border-[var(--accent-border)] bg-[var(--accent-dim)]">
        <span className="absolute h-3.5 w-3.5 rounded-full border border-[var(--accent)]/70" />
        <span className="absolute h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
        <span className="absolute left-[6px] top-1/2 h-px w-3 -translate-y-1/2 rotate-[32deg] bg-[var(--accent)]/80" />
        <span className="absolute right-[6px] top-1/2 h-px w-3 -translate-y-1/2 -rotate-[32deg] bg-[var(--accent)]/55" />
      </span>
      {compact ? null : (
        <span className="font-mono text-sm font-semibold tracking-[0.12em] text-[var(--text-primary)]">
          SPLASH
        </span>
      )}
    </span>
  );
}
