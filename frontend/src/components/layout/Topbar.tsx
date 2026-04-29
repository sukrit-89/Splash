import { WalletButton } from "./WalletButton";
import { SplashLogo } from "../ui/SplashLogo";

export function Topbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-[60px] items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-base)] px-6 lg:px-8">
      <a href="/">
        <SplashLogo />
      </a>
      <div className="flex items-center gap-4">
        <WalletButton />
        <span className="rounded border border-[color:rgba(245,158,11,0.2)] bg-[color:rgba(245,158,11,0.1)] px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-[var(--status-pending)]">
          TESTNET
        </span>
      </div>
    </header>
  );
}
