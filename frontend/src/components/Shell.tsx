import type { ReactNode } from "react";
import { truncateAddress } from "../lib/stellar";
import { Button } from "./Button";

type Page = "home" | "create" | "dashboard" | "detail";

type ShellProps = {
  page: Page;
  setPage: (page: Page) => void;
  walletAddress: string | null;
  connectingWallet: boolean;
  onConnectWallet: () => void;
  onDisconnectWallet: () => void;
  children: ReactNode;
};

const navItems: Array<{ page: Page; label: string }> = [
  { page: "home", label: "Home" },
  { page: "create", label: "Create" },
  { page: "dashboard", label: "Dashboard" },
];

export function Shell({
  page,
  setPage,
  walletAddress,
  connectingWallet,
  onConnectWallet,
  onDisconnectWallet,
  children,
}: ShellProps) {
  return (
    <div className="min-h-screen bg-ink text-primary">
      <header className="sticky top-0 z-20 border-b border-line bg-ink/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <button className="flex items-center gap-3" onClick={() => setPage("home")} aria-label="Open home">
            <span className="grid h-9 w-9 place-items-center rounded-md border border-line bg-surface font-mono text-sm font-bold text-flow">
              SP
            </span>
            <span className="text-sm font-semibold tracking-wide">Splash Protocol</span>
          </button>

          <nav className="hidden items-center gap-1 rounded-md border border-line bg-surface p-1 sm:flex">
            {navItems.map((item) => (
              <button
                key={item.page}
                onClick={() => setPage(item.page)}
                className={[
                  "rounded px-3 py-2 text-sm transition",
                  page === item.page ? "bg-[#191919] text-primary" : "text-secondary hover:text-primary",
                ].join(" ")}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {walletAddress ? (
              <>
                <span className="hidden rounded-md border border-line bg-surface px-3 py-2 font-mono text-sm text-primary sm:inline">
                  {truncateAddress(walletAddress)}
                </span>
                <Button variant="secondary" onClick={onDisconnectWallet}>
                  Disconnect
                </Button>
              </>
            ) : (
              <Button
                variant="secondary"
                onClick={onConnectWallet}
                disabled={connectingWallet}
                icon={
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M2 5.5h12v7H2v-7Z" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M3.8 5.5V3.8h8.4v1.7" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M11.2 9h2.1" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                }
              >
                {connectingWallet ? "Connecting" : "Connect"}
              </Button>
            )}
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
