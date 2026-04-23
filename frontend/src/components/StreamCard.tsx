import type { Stream } from "../types/stream";
import { TickerBalance } from "./TickerBalance";
import { Button } from "./Button";

type StreamCardProps = {
  stream: Stream;
  walletAddress: string | null;
  onOpen: (id: string) => void;
  onAction: (action: "withdraw" | "cancel", stream: Stream) => void;
};

export function StreamCard({ stream, walletAddress, onOpen, onAction }: StreamCardProps) {
  const counterparty = stream.role === "recipient" ? stream.sender : stream.recipient;
  const canWithdraw = walletAddress === stream.recipient && stream.status === "active";
  const canCancel = walletAddress === stream.sender && stream.status === "active" && Date.now() < stream.endTime;

  return (
    <article className="group rounded-lg border border-line bg-surface p-5 transition duration-150 hover:-translate-y-1 hover:border-[#2a2a2a] hover:shadow-lift">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-secondary">
            {stream.role === "recipient" ? "From" : "To"}
          </p>
          <h3 className="mt-1 font-mono text-lg font-semibold text-primary">{counterparty}</h3>
        </div>
        <span className="rounded border border-[#1d3a28] bg-[#0d1711] px-2.5 py-1 text-xs font-semibold text-flow">
          {stream.status}
        </span>
      </div>

      <TickerBalance stream={stream} size="card" />

      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
        <div>
          <p className="text-secondary">Rate / sec</p>
          <p className="mt-1 font-mono text-primary">{stream.ratePerSecond.toFixed(5)} {stream.token}</p>
        </div>
        <div>
          <p className="text-secondary">Deposit</p>
          <p className="mt-1 font-mono text-primary">{stream.totalDeposit.toFixed(2)} {stream.token}</p>
        </div>
        <div>
          <p className="text-secondary">Withdrawn</p>
          <p className="mt-1 font-mono text-primary">{stream.withdrawn.toFixed(2)} {stream.token}</p>
        </div>
        <div>
          <p className="text-secondary">Duration left</p>
          <p className="mt-1 font-mono text-primary">{Math.max(0, Math.round((stream.endTime - Date.now()) / 3600000))}h</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => onOpen(stream.id)}>
          Details
        </Button>
        {walletAddress === stream.recipient ? (
          <Button onClick={() => onAction("withdraw", stream)} disabled={!canWithdraw}>Withdraw</Button>
        ) : (
          <Button variant="secondary" onClick={() => onAction("cancel", stream)} disabled={!canCancel}>Cancel</Button>
        )}
      </div>
    </article>
  );
}
