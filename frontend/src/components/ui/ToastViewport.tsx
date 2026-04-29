import { AlertCircle, CheckCircle, Loader2, X } from "lucide-react";
import { getExplorerUrl } from "../../lib/formatters";
import { ToastMessage, ToastStatus, useToast } from "../../hooks/useToast";

const statusClass: Record<ToastStatus, string> = {
  [ToastStatus.Pending]: "border-l-[var(--status-pending)]",
  [ToastStatus.Success]: "border-l-[var(--status-active)]",
  [ToastStatus.Error]: "border-l-[var(--status-error)]",
};

function ToastIcon({ status }: { status: ToastStatus }) {
  if (status === ToastStatus.Pending) {
    return <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--text-muted)]" />;
  }

  if (status === ToastStatus.Error) {
    return <AlertCircle className="h-3.5 w-3.5 text-[var(--status-error)]" />;
  }

  return <CheckCircle className="h-3.5 w-3.5 text-[var(--accent)]" />;
}

function ToastCard({ toast }: { toast: ToastMessage }) {
  const { dismissToast } = useToast();

  return (
    <div
      className={`w-80 animate-toast-in rounded-lg border border-l-4 border-[var(--border-default)] bg-[var(--bg-elevated)] p-4 shadow-modal ${statusClass[toast.status]}`}
    >
      <div className="flex items-start gap-2">
        <ToastIcon status={toast.status} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {toast.title}
          </p>
          <p className="mt-1 break-words text-xs leading-relaxed text-[var(--text-secondary)]">
            {toast.description}
          </p>
          {toast.txHash ? (
            <a
              className="mt-2 inline-flex text-xs text-[var(--accent)] hover:underline"
              href={getExplorerUrl(toast.txHash)}
              rel="noreferrer"
              target="_blank"
            >
              View on Explorer
            </a>
          ) : null}
        </div>
        <button
          aria-label="Dismiss notification"
          className="text-[var(--text-muted)] transition-colors duration-150 hover:text-[var(--text-primary)]"
          onClick={() => dismissToast(toast.id)}
          type="button"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function ToastViewport() {
  const { toasts } = useToast();

  return (
    <div className="fixed right-4 top-20 z-[70] flex flex-col gap-3">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
