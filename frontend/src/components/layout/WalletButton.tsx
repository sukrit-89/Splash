import { ChevronDown, ExternalLink } from "lucide-react";
import { useState } from "react";
import { getExplorerUrl } from "../../lib/formatters";
import { useWallet } from "../../hooks/useWallet";
import { AddressDisplay } from "../ui/AddressDisplay";
import { Button } from "../ui/Button";

export function WalletButton() {
  const { address, isConnected, isConnecting, connect, disconnect } =
    useWallet();
  const [open, setOpen] = useState(false);

  if (!isConnected || !address) {
    return (
      <Button isLoading={isConnecting} onClick={connect} size="sm">
        <span className="sm:hidden">Connect</span>
        <span className="hidden sm:inline">Connect Wallet</span>
      </Button>
    );
  }

  return (
    <div className="relative">
      <button
        className="inline-flex h-8 items-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-primary)] transition-colors duration-150 hover:bg-[var(--bg-hover)]"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
        <AddressDisplay address={address} />
        <ChevronDown className="h-3.5 w-3.5 text-[var(--text-muted)]" />
      </button>
      {open ? (
        <div className="absolute right-0 mt-2 w-72 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] p-2 shadow-modal">
          <button
            className="w-full rounded-md px-3 py-2 text-left text-xs text-[var(--text-secondary)] transition-colors duration-150 hover:bg-[var(--bg-hover)]"
            onClick={() => navigator.clipboard.writeText(address)}
            type="button"
          >
            <span className="mb-1 block text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
              Address
            </span>
            <AddressDisplay address={address} copyable />
          </button>
          <a
            className="flex items-center justify-between rounded-md px-3 py-2 text-xs text-[var(--text-secondary)] transition-colors duration-150 hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            href={getExplorerUrl(address)}
            rel="noreferrer"
            target="_blank"
          >
            View on Explorer
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <div className="my-1 border-t border-[var(--border-subtle)]" />
          <button
            className="w-full rounded-md px-3 py-2 text-left text-xs text-[var(--status-error)] transition-colors duration-150 hover:bg-[color:rgba(239,68,68,0.08)]"
            onClick={() => {
              disconnect();
              setOpen(false);
            }}
            type="button"
          >
            Disconnect
          </button>
        </div>
      ) : null}
    </div>
  );
}
