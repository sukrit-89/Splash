import { ReactNode, useEffect } from "react";
import { Button } from "./Button";

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  body: string;
  summary: ReactNode;
  confirmLabel: string;
  variant?: "primary" | "destructive";
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmationModal({
  isOpen,
  title,
  body,
  summary,
  confirmLabel,
  variant = "primary",
  onClose,
  onConfirm,
}: ConfirmationModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]"
      onMouseDown={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] p-6 shadow-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 className="text-lg font-medium text-[var(--text-primary)]">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
          {body}
        </p>
        <div className="mt-4 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
          {summary}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button onClick={onClose} size="sm" variant="ghost">
            Cancel
          </Button>
          <Button onClick={onConfirm} size="sm" variant={variant}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
