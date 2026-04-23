import { useEffect, useState } from "react";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { StreamCard } from "../components/StreamCard";
import { Button } from "../components/Button";
import type { Stream } from "../types/stream";

type DashboardPageProps = {
  streams: Stream[];
  walletAddress: string | null;
  loadingAction: boolean;
  onOpen: (id: string) => void;
  onAction: (action: "withdraw" | "cancel", stream: Stream) => void;
  onLoadStream: (streamId: number) => void;
};

export function DashboardPage({ streams, walletAddress, loadingAction, onOpen, onAction, onLoadStream }: DashboardPageProps) {
  const [loading, setLoading] = useState(true);
  const [streamId, setStreamId] = useState("");
  const parsedStreamId = Number(streamId);
  const canLoadStream = Number.isInteger(parsedStreamId) && parsedStreamId >= 0;

  useEffect(() => {
    const id = window.setTimeout(() => setLoading(false), 650);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-flow">Dashboard</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em] text-primary sm:text-6xl">Streams in flight.</h1>
        </div>
        <div className="rounded-md border border-line bg-surface px-4 py-3 text-sm text-secondary">
          Active value:{" "}
          <span className="font-mono text-primary">
            {streams.reduce((sum, stream) => sum + stream.totalDeposit, 0).toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
            })}
          </span>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 sm:flex-row sm:items-end">
        <label className="grid flex-1 gap-2">
          <span className="text-sm font-medium text-primary">Load stream ID</span>
          <input
            value={streamId}
            onChange={(event) => setStreamId(event.target.value)}
            inputMode="numeric"
            placeholder="0"
            className="h-11 rounded-md border border-line bg-ink px-4 font-mono text-sm text-primary outline-none transition placeholder:text-[#3f3f3f] focus:border-flow"
          />
        </label>
        <Button
          variant="secondary"
          disabled={!walletAddress || loadingAction || streamId.trim() === "" || !canLoadStream}
          onClick={() => {
            if (canLoadStream) onLoadStream(parsedStreamId);
          }}
        >
          Load
        </Button>
      </div>

      {loading ? (
        <SkeletonLoader />
      ) : (
        <>
          {!walletAddress ? (
            <div className="rounded-lg border border-line bg-surface p-6 text-secondary">
              Connect a wallet to load cached streams and submit StreamVault actions.
            </div>
          ) : streams.length === 0 ? (
            <div className="rounded-lg border border-line bg-surface p-6 text-secondary">
              No cached streams for this wallet yet. Create one to save it locally after confirmation.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {streams.map((stream) => (
                <StreamCard key={stream.id} stream={stream} walletAddress={walletAddress} onOpen={onOpen} onAction={onAction} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
