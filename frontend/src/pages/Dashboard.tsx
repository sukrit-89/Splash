import { useState } from "react";
import { Activity, ArrowDownToLine, X } from "lucide-react";
import { ActivityFeed } from "../components/stream/ActivityFeed";
import { LiveBalance } from "../components/stream/LiveBalance";
import { StreamTable } from "../components/stream/StreamTable";
import { ConfirmationModal } from "../components/ui/ConfirmationModal";
import { TokenAmount } from "../components/ui/TokenAmount";
import { useCancelStream, useWithdraw } from "../hooks/useStreamActions";
import { useContractEvents } from "../hooks/useContractEvents";
import { useStreams } from "../hooks/useStreams";
import { getClaimable } from "../lib/formatters";
import { Stream } from "../types/stream";

function SummaryCard({
  label,
  value,
  subLabel,
  tag,
  accent = false,
  liveStream,
}: {
  label: string;
  value: number;
  subLabel: string;
  tag: string;
  accent?: boolean;
  liveStream?: Stream;
}) {
  return (
    <article className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
      <div className="mt-3 text-[28px]">
        {liveStream ? (
          <LiveBalance
            alreadyWithdrawn={liveStream.alreadyWithdrawn}
            cap={liveStream.totalDeposit}
            className="text-[28px]"
            ratePerSecond={liveStream.ratePerSecond}
            startTimestamp={liveStream.startTimestamp}
            symbol={liveStream.token}
          />
        ) : (
          <TokenAmount
            amount={value}
            color={accent ? "accent" : "default"}
            size="lg"
            symbol="USDC"
          />
        )}
      </div>
      <p className="mt-1 text-xs text-[var(--text-secondary)]">{subLabel}</p>
      <p className="mt-4 text-xs text-[var(--text-muted)]">
        <span className="text-[var(--accent)]">●</span> {tag}
      </p>
    </article>
  );
}

export function Dashboard() {
  const { activeStreams, activity, totals } = useStreams();
  const { isReconnecting } = useContractEvents();
  const [pendingCancel, setPendingCancel] = useState<Stream | null>(null);
  const { withdraw } = useWithdraw();
  const { cancelStream } = useCancelStream();
  const recipientStream = activeStreams.find((stream) => getClaimable(stream) > 0);

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-12">
      <div className="grid gap-4 lg:grid-cols-3">
        <SummaryCard
          label="Total Streaming Out"
          subLabel={`across ${activeStreams.length} active streams`}
          tag="Sender"
          value={totals.totalStreamingOut}
        />
        <SummaryCard
          accent
          label="Total Claimable"
          liveStream={recipientStream}
          subLabel="ready to withdraw"
          tag="Recipient"
          value={totals.totalClaimable}
        />
        <SummaryCard
          label="Lifetime Received"
          subLabel="all time"
          tag="Recipient"
          value={totals.lifetimeReceived}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[3fr_2fr]">
        <section className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4">
            <h1 className="text-sm font-medium text-[var(--text-primary)]">
              Active Streams
            </h1>
            <span className="rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2 py-0.5 font-mono text-[10px] text-[var(--text-secondary)]">
              {activeStreams.length} streams
            </span>
          </div>
          <StreamTable
            onCancel={setPendingCancel}
            onWithdraw={(stream) => withdraw(stream)}
            streams={activeStreams}
          />
        </section>

        <section
          className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5"
          id="activity"
        >
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-medium text-[var(--text-primary)]">
              Activity
            </h2>
            <Activity className="h-4 w-4 text-[var(--text-muted)]" />
          </div>
          {isReconnecting ? (
            <p className="mb-2 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-xs text-[var(--status-pending)]">
              Event feed reconnecting...
            </p>
          ) : null}
          <ActivityFeed activity={activity} />
        </section>
      </div>

      <ConfirmationModal
        body="Cancelling returns the unstreamed balance to the sender and stops future accrual immediately."
        confirmLabel="Cancel Stream"
        isOpen={Boolean(pendingCancel)}
        onClose={() => setPendingCancel(null)}
        onConfirm={() => {
          if (pendingCancel) {
            cancelStream(pendingCancel);
          }
          setPendingCancel(null);
        }}
        summary={
          pendingCancel ? (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Unstreamed return</span>
                <span className="font-mono text-[var(--text-primary)]">
                  {(pendingCancel.totalDeposit - getClaimable(pendingCancel)).toFixed(2)}{" "}
                  {pendingCancel.token}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Current claimable</span>
                <span className="font-mono text-[var(--accent)]">
                  {getClaimable(pendingCancel).toFixed(6)} {pendingCancel.token}
                </span>
              </div>
            </div>
          ) : null
        }
        title="Cancel active stream"
        variant="destructive"
      />
      <div className="sr-only">
        <ArrowDownToLine />
        <X />
      </div>
    </div>
  );
}
