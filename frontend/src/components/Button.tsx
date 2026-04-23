import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  icon?: ReactNode;
};

export function Button({ className = "", variant = "primary", icon, children, ...props }: ButtonProps) {
  const styles = {
    primary: "border-flow bg-flow text-black hover:bg-[#2bdc6d]",
    secondary: "border-line bg-surface text-primary hover:border-[#2b2b2b] hover:bg-[#151515]",
    ghost: "border-transparent bg-transparent text-secondary hover:text-primary",
  };

  return (
    <button
      className={[
        "inline-flex h-11 items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold transition duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
        styles[variant],
        className,
      ].join(" ")}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
