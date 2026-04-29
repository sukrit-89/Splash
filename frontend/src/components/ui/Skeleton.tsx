interface SkeletonProps {
  className: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-sm bg-[var(--border-subtle)] ${className}`}
    />
  );
}
