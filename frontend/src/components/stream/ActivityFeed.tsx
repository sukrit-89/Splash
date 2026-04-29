import { ArrowDownToLine, Plus, X } from "lucide-react";
import {
  formatRelativeTime,
  formatTokenAmount,
  truncateAddress,
} from "../../lib/formatters";
import { ActivityEvent, ActivityEventType } from "../../types/stream";

interface ActivityFeedProps {
  activity: ActivityEvent[];
}

const iconMap = {
  [ActivityEventType.StreamCreated]: Plus,
  [ActivityEventType.Withdrawal]: ArrowDownToLine,
  [ActivityEventType.Cancelled]: X,
};

const colorMap = {
  [ActivityEventType.StreamCreated]:
    "bg-[var(--accent-dim)] text-[var(--accent)]",
  [ActivityEventType.Withdrawal]:
    "bg-[color:rgba(59,130,246,0.1)] text-[var(--data-2)]",
  [ActivityEventType.Cancelled]:
    "bg-[color:rgba(239,68,68,0.1)] text-[var(--status-error)]",
};

function eventCopy(event: ActivityEvent): string {
  if (event.type === ActivityEventType.StreamCreated) {
    return `Stream created to ${truncateAddress(event.address)}`;
  }

  if (event.type === ActivityEventType.Withdrawal) {
    return `${formatTokenAmount(event.amount ?? 0)} ${event.token} withdrawn by ${truncateAddress(event.address)}`;
  }

  return `Stream cancelled, ${formatTokenAmount(event.amount ?? 0)} ${event.token} returned`;
}

export function ActivityFeed({ activity }: ActivityFeedProps) {
  if (activity.length === 0) {
    return (
      <p className="py-8 text-sm text-[var(--text-muted)]">
        No activity yet. Create a stream to begin.
      </p>
    );
  }

  return (
    <div>
      {activity.map((event) => {
        const Icon = iconMap[event.type];

        return (
          <div
            className="flex gap-3 border-b border-[var(--border-subtle)] py-3"
            key={event.id}
          >
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded ${colorMap[event.type]}`}
            >
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-[var(--text-primary)]">
                {eventCopy(event)}
              </p>
              <p className="mt-1 font-mono text-xs text-[var(--text-muted)]">
                {formatRelativeTime(event.timestamp)} · Ledger #{event.ledger}
              </p>
            </div>
            {event.amount ? (
              <p
                className={`font-mono text-sm ${
                  event.type === ActivityEventType.Cancelled
                    ? "text-[var(--status-error)]"
                    : "text-[var(--text-primary)]"
                }`}
              >
                {formatTokenAmount(event.amount)}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
