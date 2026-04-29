import { StreamStatus } from "../../types/stream";

interface StatusBadgeProps {
  status: StreamStatus;
}

const labelMap: Record<StreamStatus, string> = {
  [StreamStatus.Active]: "Active",
  [StreamStatus.Pending]: "Pending",
  [StreamStatus.Cancelled]: "Cancelled",
  [StreamStatus.Completed]: "Completed",
  [StreamStatus.Failed]: "Failed",
};

const colorMap: Record<StreamStatus, string> = {
  [StreamStatus.Active]: "text-[var(--status-active)]",
  [StreamStatus.Pending]: "text-[var(--status-pending)]",
  [StreamStatus.Cancelled]: "text-[var(--status-neutral)]",
  [StreamStatus.Completed]: "text-[var(--status-neutral)]",
  [StreamStatus.Failed]: "text-[var(--status-error)]",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2 py-1 font-mono text-[10px] uppercase tracking-wide ${colorMap[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {labelMap[status]}
    </span>
  );
}
