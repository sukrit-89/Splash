import type { ToastMessage } from "../types/stream";

type ToastProps = {
  toasts: ToastMessage[];
  onDismiss: (id: number) => void;
};

export function Toast({ toasts, onDismiss }: ToastProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-[min(360px,calc(100vw-32px))] flex-col gap-3">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          className="rounded-md border border-line bg-surface p-4 text-left shadow-lift transition hover:-translate-y-0.5"
          onClick={() => onDismiss(toast.id)}
        >
          <p className="text-sm font-semibold text-primary">{toast.title}</p>
          {toast.body ? <p className="mt-1 text-sm text-secondary">{toast.body}</p> : null}
        </button>
      ))}
    </div>
  );
}
