import type { Stream } from "../types/stream";
import { Button } from "../components/Button";
import { TickerBalance } from "../components/TickerBalance";

type StreamDetailPageProps = {
  stream: Stream;
  walletAddress: string | null;
  onBack: () => void;
  onAction: (action: "withdraw" | "cancel", stream: Stream) => void;
};

const formatDate = (value: number) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);

export function StreamDetailPage({ stream, walletAddress, onBack, onAction }: StreamDetailPageProps) {
  const progress = Math.min(100, Math.max(0, ((Date.now() - stream.startTime) / (stream.endTime - stream.startTime)) * 100));
  const canWithdraw = walletAddress === stream.recipient && stream.status === "active";
  const canCancel = walletAddress === stream.sender && stream.status === "active" && Date.now() < stream.endTime;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Button variant="ghost" onClick={onBack}>Back</Button>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="rounded-lg border border-line bg-surface p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-flow">Stream detail</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-primary sm:text-5xl">{stream.id}</h1>
          <div className="mt-10">
            <TickerBalance stream={stream} label="available to withdraw" />
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            {walletAddress === stream.recipient ? (
              <Button onClick={() => onAction("withdraw", stream)} disabled={!canWithdraw}>Withdraw</Button>
            ) : (
              <Button variant="secondary" onClick={() => onAction("cancel", stream)} disabled={!canCancel}>Cancel stream</Button>
            )}
          </div>
        </div>

        <aside className="rounded-lg border border-line bg-surface p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-secondary">Metadata</p>
          <dl className="mt-5 grid gap-4 text-sm">
            {[
              ["Sender", stream.sender],
              ["Recipient", stream.recipient],
              ["Token", stream.token],
              ["Total deposit", `${stream.totalDeposit.toFixed(2)} ${stream.token}`],
              ["Withdrawn", `${stream.withdrawn.toFixed(2)} ${stream.token}`],
              ["Rate", `${stream.ratePerSecond.toFixed(8)} ${stream.token} / sec`],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 border-b border-line pb-3">
                <dt className="text-secondary">{label}</dt>
                <dd className="font-mono text-primary">{value}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>

      <div className="mt-6 rounded-lg border border-line bg-surface p-6">
        <div className="flex justify-between text-sm">
          <span className="text-secondary">{formatDate(stream.startTime)}</span>
          <span className="text-secondary">{formatDate(stream.endTime)}</span>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#1b1b1b]">
          <div className="h-full bg-flow transition-[width] duration-300" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-3 flex justify-between text-xs uppercase tracking-[0.16em] text-secondary">
          <span>Start</span>
          <span>End</span>
        </div>
      </div>
    </section>
  );
}
