import type { Stream } from "../types/stream";
import { Button } from "./Button";

type TransactionModalProps = {
  action: "withdraw" | "cancel";
  stream: Stream;
  amount?: number;
  senderRefund?: number;
  loading?: boolean;
  step?: "signing" | "submitting" | "confirmed" | null;
  onClose: () => void;
  onConfirm: () => void;
};

const steps = ["signing", "submitting", "confirmed"] as const;

export function TransactionModal({
  action,
  stream,
  amount = 0,
  senderRefund = 0,
  loading = false,
  step = null,
  onClose,
  onConfirm,
}: TransactionModalProps) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/70 px-4" role="dialog" aria-modal="true">
      <section className="w-full max-w-md rounded-lg border border-line bg-surface p-6 shadow-lift">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-secondary">Transaction</p>
            <h2 className="mt-2 text-2xl font-semibold text-primary">
              {action === "withdraw" ? "Withdraw stream" : "Cancel stream"}
            </h2>
          </div>
          <button className="rounded p-2 text-secondary transition hover:bg-[#191919] hover:text-primary" onClick={onClose}>
            <span className="sr-only">Close</span>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="m4.5 4.5 9 9M13.5 4.5l-9 9" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </div>

        <div className="rounded-md border border-line bg-ink p-4">
          <p className="text-sm text-secondary">Stream</p>
          <p className="mt-1 font-mono text-primary">{stream.id}</p>
          <p className="mt-4 text-sm text-secondary">Token</p>
          <p className="mt-1 font-mono text-primary">{stream.token}</p>
          <p className="mt-4 text-sm text-secondary">
            {action === "withdraw" ? "Claimable now" : "Recipient receives"}
          </p>
          <p className="mt-1 font-mono text-primary">
            {amount.toFixed(7)} {stream.token}
          </p>
          {action === "cancel" ? (
            <>
              <p className="mt-4 text-sm text-secondary">Sender refund</p>
              <p className="mt-1 font-mono text-primary">
                {senderRefund.toFixed(7)} {stream.token}
              </p>
            </>
          ) : null}
        </div>

        <p className="mt-4 text-sm leading-6 text-secondary">
          {action === "withdraw"
            ? "Your wallet will sign a StreamVault withdrawal for the exact claimable amount shown."
            : "Cancelling pays the earned amount to the recipient and returns the unstreamed balance to the sender."}
        </p>

        {loading || step ? (
          <ol className="mt-5 grid gap-2 text-sm">
            {steps.map((item) => (
              <li
                key={item}
                className={[
                  "flex items-center justify-between rounded-md border px-3 py-2 capitalize",
                  step === item ? "border-flow text-primary" : "border-line text-secondary",
                ].join(" ")}
              >
                {item}
                {step === item ? <span className="font-mono text-xs text-flow">active</span> : null}
              </li>
            ))}
          </ol>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={loading}>Close</Button>
          <Button onClick={onConfirm} disabled={loading || (action === "withdraw" && amount <= 0)}>
            {loading ? "Working" : action === "withdraw" ? "Withdraw" : "Cancel stream"}
          </Button>
        </div>
      </section>
    </div>
  );
}
