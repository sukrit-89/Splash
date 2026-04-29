import { ExternalLink } from "lucide-react";
import { useState } from "react";
import { LiveBalance } from "../components/stream/LiveBalance";
import { Button } from "../components/ui/Button";
import { ConfirmationModal } from "../components/ui/ConfirmationModal";
import { StatusBadge } from "../components/ui/StatusBadge";
import { TokenAmount } from "../components/ui/TokenAmount";
import { useCancelStream, useWithdraw } from "../hooks/useStreamActions";
import { useStream } from "../hooks/useStreams";
import {
  formatRemainingTime,
  formatUtcDate,
  getClaimable,
  getExplorerUrl,
  getProgress,
  truncateAddress,
} from "../lib/formatters";
import { StreamRole, StreamStatus } from "../types/stream";

interface StreamDetailProps {
  streamId: string;
}

export function StreamDetail({ streamId }: StreamDetailProps) {
  const { stream, withdrawals } = useStream(streamId);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const { withdraw } = useWithdraw();
  const { cancelStream } = useCancelStream();
  if (!stream) {
    return (
      <div className="mx-auto max-w-[900px] px-6 py-16 lg:px-12">
        <p className="font-mono text-xs text-[var(--text-muted)]">
          Streams / Stream #{streamId}
        </p>
        <h1 className="mt-4 text-xl font-medium text-[var(--text-primary)]">
          Stream not found
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Create a stream or revisit this page from the dashboard after it is
          cached locally.
        </p>
      </div>
    );
  }
  const isRecipient = stream.role === StreamRole.Recipient;
  const progress = getProgress(stream);

  return (
    <div className="mx-auto max-w-[900px] px-6 py-8 lg:px-12">
      <p className="font-mono text-xs text-[var(--text-muted)]">
        Streams / Stream #{stream.id}
      </p>
      <header className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-medium text-[var(--text-primary)]">
            Stream to {truncateAddress(stream.recipient)}
          </h1>
          <span
            className={`mt-2 inline-flex rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-widest ${
              isRecipient
                ? "border-[var(--accent-border)] bg-[var(--accent-dim)] text-[var(--accent)]"
                : "border-[color:rgba(245,158,11,0.2)] bg-[color:rgba(245,158,11,0.1)] text-[var(--status-pending)]"
            }`}
          >
            {isRecipient ? "YOU ARE RECEIVING" : "YOU ARE SENDING"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={stream.status} />
          {stream.status === StreamStatus.Active && isRecipient ? (
            <Button onClick={() => setConfirmWithdraw(true)} variant="primary">
              Withdraw
            </Button>
          ) : null}
          {stream.status === StreamStatus.Active && !isRecipient ? (
            <Button onClick={() => setConfirmCancel(true)} variant="destructive">
              Cancel Stream
            </Button>
          ) : null}
        </div>
      </header>

      {isRecipient ? (
        <section className="relative mt-6 rounded-lg border border-[var(--accent-border)] bg-[var(--bg-surface)] p-8 text-center">
          <div className="absolute right-5 top-5 font-mono text-[10px] text-[var(--accent)]">
            LIVE{" "}
            <span className="inline-block h-1.5 w-1.5 animate-live-pulse rounded-full bg-current" />
          </div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
            CLAIMABLE NOW
          </p>
          <LiveBalance
            alreadyWithdrawn={stream.alreadyWithdrawn}
            cap={stream.totalDeposit}
            className="mt-6 block text-[clamp(32px,7vw,48px)]"
            ratePerSecond={stream.ratePerSecond}
            startTimestamp={stream.startTimestamp}
            symbol={stream.token}
          />
          <p className="mt-4 font-mono text-sm text-[var(--text-secondary)]">
            +{stream.ratePerSecond.toFixed(6)} {stream.token}/second ·{" "}
            {(stream.ratePerSecond * 3600).toFixed(2)}/hr
          </p>
        </section>
      ) : null}

      <section className="mt-6 grid grid-cols-1 gap-px overflow-hidden rounded-lg bg-[var(--border-subtle)] sm:grid-cols-2">
        {[
          ["Total Deposit", `${stream.totalDeposit.toLocaleString("en-US")} ${stream.token}`],
          ["Already Withdrawn", `${stream.alreadyWithdrawn.toLocaleString("en-US")} ${stream.token}`],
          ["Blend Position", `${stream.blendPosition.toLocaleString("en-US")} bToken`],
          ["FLOW Burned", `${stream.flowBurned.toLocaleString("en-US")} FLOW`],
          ["Yield Earned", `${stream.yieldEarned.toLocaleString("en-US")} ${stream.token}`],
          ["Remaining", `${(stream.totalDeposit - stream.alreadyWithdrawn - getClaimable(stream)).toFixed(2)} ${stream.token}`],
          ["Flow Rate", `${stream.ratePerSecond.toFixed(6)} ${stream.token}/s`],
          ["Start Time", formatUtcDate(stream.startTimestamp)],
          ["End Time", formatUtcDate(stream.endTimestamp)],
        ].map(([label, value]) => (
          <div className="bg-[var(--bg-surface)] p-4" key={label}>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
              {label}
            </p>
            <p className="mt-1 font-mono text-sm font-medium text-[var(--text-primary)]">
              {value}
            </p>
          </div>
        ))}
      </section>

      <section className="mt-6">
        <div className="flex justify-between text-xs text-[var(--text-secondary)]">
          <span>{Math.round(progress)}% elapsed</span>
          <span className="font-mono">{formatRemainingTime(stream)}</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--border-subtle)]">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-all duration-1000 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </section>

      <section className="mt-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <div className="border-b border-[var(--border-subtle)] px-5 py-4">
          <h2 className="text-sm font-medium text-[var(--text-primary)]">
            Withdrawal History
          </h2>
        </div>
        {withdrawals.length === 0 ? (
          <p className="py-12 text-center text-sm text-[var(--text-muted)]">
            No withdrawals yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px]">
              <thead>
                <tr className="border-b border-[var(--border-subtle)]">
                  {["TIMESTAMP", "AMOUNT", "TX HASH"].map((header) => (
                    <th
                      className="px-5 py-3 text-left text-[10px] font-normal uppercase tracking-widest text-[var(--text-muted)]"
                      key={header}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((withdrawal) => (
                  <tr
                    className="border-b border-[var(--border-subtle)] transition-colors duration-150 hover:bg-[var(--bg-hover)]"
                    key={withdrawal.id}
                  >
                    <td className="px-5 py-4 font-mono text-xs text-[var(--text-secondary)]">
                      {formatUtcDate(withdrawal.timestamp)}
                    </td>
                    <td className="px-5 py-4">
                      <TokenAmount
                        amount={withdrawal.amount}
                        symbol={withdrawal.token}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <a
                        className="inline-flex items-center gap-1.5 font-mono text-xs text-[var(--text-muted)] transition-colors duration-150 hover:text-[var(--text-primary)]"
                        href={getExplorerUrl(withdrawal.txHash)}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {truncateAddress(withdrawal.txHash, 8, 8)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ConfirmationModal
        body="This withdraws the currently accrued amount to your connected Stellar wallet."
        confirmLabel="Withdraw"
        isOpen={confirmWithdraw}
        onClose={() => setConfirmWithdraw(false)}
        onConfirm={() => {
          setConfirmWithdraw(false);
          withdraw(stream);
        }}
        summary={
          <div className="flex justify-between text-xs">
            <span className="text-[var(--text-muted)]">Claimable now</span>
            <span className="font-mono text-[var(--accent)]">
              {getClaimable(stream).toFixed(6)} {stream.token}
            </span>
          </div>
        }
        title="Withdraw streamed funds"
      />
      <ConfirmationModal
        body="Cancelling stops future accrual and returns the unstreamed balance to the sender."
        confirmLabel="Cancel Stream"
        isOpen={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={() => {
          setConfirmCancel(false);
          cancelStream(stream);
        }}
        summary={
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Recipient receives</span>
              <span className="font-mono text-[var(--accent)]">
                {getClaimable(stream).toFixed(6)} {stream.token}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Sender refund</span>
              <span className="font-mono text-[var(--text-primary)]">
                {(stream.totalDeposit - stream.alreadyWithdrawn - getClaimable(stream)).toFixed(6)}{" "}
                {stream.token}
              </span>
            </div>
          </div>
        }
        title="Cancel active stream"
        variant="destructive"
      />
    </div>
  );
}
