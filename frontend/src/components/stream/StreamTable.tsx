import { Activity, ArrowDownToLine, X } from "lucide-react";
import { Link } from "../../router";
import {
  formatRemainingTime,
  formatRelativeTime,
  formatUsdPerHour,
  getProgress,
} from "../../lib/formatters";
import { Stream, StreamRole, StreamStatus } from "../../types/stream";
import { AddressDisplay } from "../ui/AddressDisplay";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { StatusBadge } from "../ui/StatusBadge";
import { LiveBalance } from "./LiveBalance";

interface StreamTableProps {
  streams: Stream[];
  onWithdraw: (stream: Stream) => void;
  onCancel: (stream: Stream) => void;
}

const headers = ["STREAM", "RATE", "CLAIMABLE", "PROGRESS", "STATUS", "ACTIONS"];

export function StreamTable({ streams, onWithdraw, onCancel }: StreamTableProps) {
  if (streams.length === 0) {
    return (
      <EmptyState
        action={
          <Button size="sm" variant="primary">
            <Link href="/create">Create Stream</Link>
          </Button>
        }
        description="Create your first stream to get started."
        icon={Activity}
        title="No active streams"
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[820px] w-full">
        <thead>
          <tr className="border-b border-[var(--border-subtle)]">
            {headers.map((header) => (
              <th
                className="px-4 py-3 text-left text-[10px] font-normal uppercase tracking-widest text-[var(--text-muted)]"
                key={header}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {streams.map((stream) => (
            <tr
              className="border-b border-[var(--border-subtle)] transition-colors duration-150 hover:bg-[var(--bg-hover)]"
              key={stream.id}
            >
              <td className="px-4 py-4">
                <Link
                  className="block text-sm text-[var(--text-primary)]"
                  href={`/stream/${stream.id}`}
                >
                  <AddressDisplay address={stream.recipient} />
                </Link>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Created {formatRelativeTime(stream.createdAt)}
                </p>
              </td>
              <td className="px-4 py-4">
                <p className="font-mono text-sm text-[var(--text-primary)]">
                  {stream.ratePerSecond.toFixed(6)} {stream.token}/s
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  ~= {formatUsdPerHour(stream.ratePerSecond)}
                </p>
              </td>
              <td className="px-4 py-4">
                <LiveBalance
                  alreadyWithdrawn={stream.alreadyWithdrawn}
                  cap={stream.totalDeposit}
                  ratePerSecond={stream.ratePerSecond}
                  startTimestamp={stream.startTimestamp}
                  symbol={stream.token}
                />
              </td>
              <td className="px-4 py-4">
                <div className="h-1 w-20 overflow-hidden rounded-full bg-[var(--border-subtle)]">
                  <div
                    className="h-full rounded-full bg-[var(--accent)] transition-all duration-1000 ease-linear"
                    style={{ width: `${getProgress(stream)}%` }}
                  />
                </div>
                <p className="mt-2 text-[10px] text-[var(--text-muted)]">
                  {formatRemainingTime(stream)}
                </p>
              </td>
              <td className="px-4 py-4">
                <StatusBadge status={stream.status} />
              </td>
              <td className="px-4 py-4">
                <div className="flex gap-2">
                  <button
                    aria-label="Withdraw funds"
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border-subtle)] text-[var(--text-muted)] transition-colors duration-150 hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:text-[var(--text-disabled)]"
                    disabled={
                      stream.role !== StreamRole.Recipient ||
                      stream.status !== StreamStatus.Active
                    }
                    onClick={() => onWithdraw(stream)}
                    type="button"
                  >
                    <ArrowDownToLine className="h-3.5 w-3.5" />
                  </button>
                  <button
                    aria-label="Cancel stream"
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border-subtle)] text-[var(--text-muted)] transition-colors duration-150 hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:text-[var(--text-disabled)]"
                    disabled={
                      stream.role !== StreamRole.Sender ||
                      stream.status !== StreamStatus.Active
                    }
                    onClick={() => onCancel(stream)}
                    type="button"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
