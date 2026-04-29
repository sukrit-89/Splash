import { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
type ButtonSize = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  children: ReactNode;
}

const variantClass: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--text-primary)] text-[var(--bg-base)] hover:bg-neutral-200 border border-[var(--text-primary)]",
  secondary:
    "border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]",
  ghost:
    "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]",
  destructive:
    "border border-[color:rgba(239,68,68,0.25)] text-[var(--status-error)] hover:bg-[color:rgba(239,68,68,0.08)]",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-11 px-5 text-sm",
};

export function Button({
  variant = "secondary",
  size = "md",
  isLoading = false,
  className = "",
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:border-[var(--border-subtle)] disabled:text-[var(--text-disabled)] disabled:bg-[var(--bg-elevated)] ${variantClass[variant]} ${sizeClass[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
}
