import { useEffect, useMemo, useState } from "react";
import { Shell } from "./components/Shell";
import { Toast } from "./components/Toast";
import { TransactionModal } from "./components/TransactionModal";
import { useToast } from "./hooks/useToast";
import { useStellarWallet } from "./hooks/useStellarWallet";
import {
  cancelStream,
  createStream,
  getClaimable,
  getStream,
  getStreamsForWallet,
  withdrawStream,
  type StreamFormInput,
  type TransactionStep,
} from "./lib/stellar";
import { loadCachedStreams, saveCachedStream, saveCachedStreams } from "./lib/streamStorage";
import { CreateStreamPage } from "./pages/CreateStreamPage";
import { DashboardPage } from "./pages/DashboardPage";
import { HomePage } from "./pages/HomePage";
import { StreamDetailPage } from "./pages/StreamDetailPage";
import type { Stream } from "./types/stream";

type Page = "home" | "create" | "dashboard" | "detail";

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [streams, setStreams] = useState<Stream[]>([]);
  const [selectedStreamId, setSelectedStreamId] = useState<string | null>(null);
  const [modal, setModal] = useState<{ action: "withdraw" | "cancel"; stream: Stream } | null>(null);
  const [modalAmount, setModalAmount] = useState(0);
  const [modalRefund, setModalRefund] = useState(0);
  const [transactionStep, setTransactionStep] = useState<TransactionStep | null>(null);
  const [busy, setBusy] = useState(false);
  const { toasts, showToast, dismissToast } = useToast();
  const wallet = useStellarWallet();

  useEffect(() => {
    setStreams(loadCachedStreams(wallet.address));
    if (!wallet.address) return;

    let cancelled = false;
    getStreamsForWallet(wallet.address)
      .then((onChainStreams) => {
        if (cancelled) return;
        setStreams((current) => {
          const byId = new Map(current.map((stream) => [stream.id, stream]));
          onChainStreams.forEach((stream) => byId.set(stream.id, stream));
          const next = Array.from(byId.values());
          saveCachedStreams(next);
          return next;
        });
      })
      .catch((err) => {
        showToast("Stream discovery failed", err instanceof Error ? err.message : "Unable to scan StreamVault.");
      });

    return () => {
      cancelled = true;
    };
  }, [showToast, wallet.address]);

  useEffect(() => {
    if (!wallet.address || streams.length === 0) return;

    const syncStreams = async () => {
      const synced = await Promise.all(
        streams.map(async (stream) => {
          if (stream.streamId === undefined) return stream;
          try {
            const [freshStream, syncedClaimable] = await Promise.all([
              getStream(wallet.address!, stream.streamId),
              getClaimable(wallet.address!, stream.streamId),
            ]);
            return {
              ...freshStream,
              syncedClaimable,
              claimableSyncedAt: Date.now(),
            };
          } catch {
            return stream;
          }
        })
      );
      setStreams(synced);
      saveCachedStreams(synced);
    };

    const id = window.setInterval(syncStreams, 30_000);
    return () => window.clearInterval(id);
  }, [streams, wallet.address]);

  const selectedStream = useMemo(
    () => streams.find((stream) => stream.id === selectedStreamId) ?? streams[0] ?? null,
    [selectedStreamId, streams]
  );

  const upsertStream = (stream: Stream) => {
    setStreams((current) => [stream, ...current.filter((item) => item.id !== stream.id)]);
    saveCachedStream(stream);
  };

  const openStream = (id: string) => {
    setSelectedStreamId(id);
    setPage("detail");
  };

  const connectWallet = async () => {
    try {
      await wallet.connect();
      showToast("Wallet connected", "Freighter is ready for testnet StreamVault transactions.");
    } catch (err) {
      showToast("Wallet connection failed", err instanceof Error ? err.message : "Unable to connect wallet.");
    }
  };

  const handleCreateStream = async (input: StreamFormInput) => {
    setBusy(true);
    setTransactionStep(null);
    try {
      const stream = await createStream(input, wallet.signTransaction, setTransactionStep);
      upsertStream(stream);
      setSelectedStreamId(stream.id);
      showToast("Stream created", `Stream ${stream.streamId ?? stream.id} confirmed on testnet.`);
      setPage("detail");
    } catch (err) {
      showToast("Create stream failed", err instanceof Error ? err.message : "Unable to create stream.");
    } finally {
      setBusy(false);
      setTransactionStep(null);
    }
  };

  const openAction = async (action: "withdraw" | "cancel", stream: Stream) => {
    if (!wallet.address) {
      showToast("Wallet required", "Connect Freighter before submitting stream actions.");
      return;
    }
    if (action === "withdraw" && wallet.address !== stream.recipient) {
      showToast("Wrong signer", "Only the stream recipient can withdraw.");
      return;
    }
    if (action === "cancel" && wallet.address !== stream.sender) {
      showToast("Wrong signer", "Only the stream sender can cancel.");
      return;
    }
    if (action === "cancel" && Date.now() >= stream.endTime) {
      showToast("Stream already matured", "The sender cannot cancel after the stream end time.");
      return;
    }

    setModal({ action, stream });
    const localElapsedSeconds = Math.max(0, Math.min((Date.now() - stream.startTime) / 1000, (stream.endTime - stream.startTime) / 1000));
    const localClaimable = Math.min(stream.totalDeposit - stream.withdrawn, localElapsedSeconds * stream.ratePerSecond - stream.withdrawn);
    const claimable = Math.max(0, localClaimable);

    setModalAmount(claimable);
    setModalRefund(Math.max(0, stream.totalDeposit - stream.withdrawn - claimable));

    if (wallet.address && stream.streamId !== undefined) {
      try {
        const onChainClaimable = await getClaimable(wallet.address, stream.streamId);
        setModalAmount(onChainClaimable);
        setModalRefund(Math.max(0, stream.totalDeposit - stream.withdrawn - onChainClaimable));
        upsertStream({
          ...stream,
          syncedClaimable: onChainClaimable,
          claimableSyncedAt: Date.now(),
        });
      } catch {
        // Local interpolation is still useful if RPC read sync is temporarily unavailable.
      }
    }
  };

  const confirmModal = async () => {
    if (!modal) return;

    if (!wallet.address) {
      showToast("Wallet required", "Connect the signer wallet before submitting this transaction.");
      return;
    }
    if (modal.stream.streamId === undefined) {
      showToast("Missing stream id", "Only cached on-chain streams can be submitted.");
      return;
    }
    if (modal.action === "withdraw" && wallet.address !== modal.stream.recipient) {
      showToast("Wrong signer", "Only the stream recipient can withdraw.");
      return;
    }
    if (modal.action === "cancel" && wallet.address !== modal.stream.sender) {
      showToast("Wrong signer", "Only the stream sender can cancel.");
      return;
    }

    setBusy(true);
    setTransactionStep(null);

    try {
      if (modal.action === "withdraw") {
        const amount = await withdrawStream(wallet.address, modal.stream.streamId, wallet.signTransaction, setTransactionStep);
        const synced = await getStream(wallet.address, modal.stream.streamId);
        upsertStream(synced);
        showToast("Withdrawal confirmed", `${amount.toFixed(7)} ${modal.stream.token} withdrawn.`);
      } else {
        const result = await cancelStream(wallet.address, modal.stream.streamId, wallet.signTransaction, setTransactionStep);
        const synced = await getStream(wallet.address, modal.stream.streamId);
        upsertStream(synced);
        showToast(
          "Stream cancelled",
          `Recipient received ${result.recipientOwed.toFixed(7)} ${modal.stream.token}; refund ${result.senderRefund.toFixed(7)}.`
        );
      }
      setModal(null);
    } catch (err) {
      showToast("Transaction failed", err instanceof Error ? err.message : "Unable to submit transaction.");
    } finally {
      setBusy(false);
      setTransactionStep(null);
    }
  };

  const loadStreamById = async (streamId: number) => {
    if (!wallet.address) {
      showToast("Wallet required", "Connect Freighter before loading a stream.");
      return;
    }

    setBusy(true);
    try {
      const stream = await getStream(wallet.address, streamId);
      if (stream.sender !== wallet.address && stream.recipient !== wallet.address) {
        showToast("Stream loaded", "This stream does not belong to the connected wallet, so it was not added.");
        return;
      }
      const syncedClaimable = await getClaimable(wallet.address, streamId).catch(() => undefined);
      upsertStream({
        ...stream,
        syncedClaimable,
        claimableSyncedAt: syncedClaimable === undefined ? undefined : Date.now(),
      });
      showToast("Stream loaded", `Stream ${streamId} synced from StreamVault.`);
    } catch (err) {
      showToast("Load stream failed", err instanceof Error ? err.message : "Unable to load stream.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell
      page={page}
      setPage={setPage}
      walletAddress={wallet.address}
      connectingWallet={wallet.connecting}
      onConnectWallet={connectWallet}
      onDisconnectWallet={wallet.disconnect}
    >
      {page === "home" ? <HomePage onStart={() => setPage("create")} /> : null}
      {page === "create" ? (
        <CreateStreamPage
          walletAddress={wallet.address}
          creating={busy}
          onConnectWallet={connectWallet}
          onCreated={handleCreateStream}
        />
      ) : null}
      {page === "dashboard" ? (
        <DashboardPage
          streams={streams}
          walletAddress={wallet.address}
          loadingAction={busy}
          onOpen={openStream}
          onAction={openAction}
          onLoadStream={loadStreamById}
        />
      ) : null}
      {page === "detail" && selectedStream ? (
        <StreamDetailPage stream={selectedStream} walletAddress={wallet.address} onBack={() => setPage("dashboard")} onAction={openAction} />
      ) : null}
      {modal ? (
        <TransactionModal
          action={modal.action}
          stream={modal.stream}
          amount={modalAmount}
          senderRefund={modalRefund}
          loading={busy}
          step={transactionStep}
          onClose={() => setModal(null)}
          onConfirm={confirmModal}
        />
      ) : null}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </Shell>
  );
}
