import { Check, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { getExplorerUrl, truncateAddress } from "../../lib/formatters";

interface AddressDisplayProps {
  address: string;
  copyable?: boolean;
  explorerLink?: boolean;
  className?: string;
}

export function AddressDisplay({
  address,
  copyable = false,
  explorerLink = false,
  className = "",
}: AddressDisplayProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <span
      className={`group inline-flex items-center gap-1.5 font-mono ${className}`}
    >
      <span>{truncateAddress(address)}</span>
      {copyable ? (
        <button
          aria-label="Copy address"
          className="text-[var(--text-muted)] opacity-0 transition-opacity duration-150 hover:text-[var(--text-primary)] group-hover:opacity-100"
          onClick={copy}
          type="button"
        >
          {copied ? (
            <Check className="h-3 w-3 text-[var(--accent)]" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </button>
      ) : null}
      {explorerLink ? (
        <a
          aria-label="View address on Stellar Explorer"
          className="text-[var(--text-muted)] transition-colors duration-150 hover:text-[var(--text-primary)]"
          href={getExplorerUrl(address)}
          rel="noreferrer"
          target="_blank"
        >
          <ExternalLink className="h-3 w-3" />
        </a>
      ) : null}
    </span>
  );
}
