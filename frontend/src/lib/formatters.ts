import { Stream } from "../types/stream";

export function truncateAddress(address: string, head = 6, tail = 4): string {
  if (address.length <= head + tail + 3) {
    return address;
  }

  return `${address.slice(0, head)}...${address.slice(-tail)}`;
}

export function formatTokenAmount(amount: number): string {
  if (amount === 0) {
    return "0";
  }

  if (Math.abs(amount) < 0.01) {
    return amount.toLocaleString("en-US", {
      minimumFractionDigits: 6,
      maximumFractionDigits: 6,
    });
  }

  if (Math.abs(amount) < 100) {
    return amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
  }

  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatLiveAmount(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 6,
    maximumFractionDigits: 6,
  });
}

export function formatUsdPerHour(ratePerSecond: number): string {
  return `$${(ratePerSecond * 3600).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}/hr`;
}

export function getClaimable(stream: Stream, nowMs = Date.now()): number {
  const elapsedSeconds = Math.max(0, nowMs / 1000 - stream.startTimestamp);
  const streamed = Math.min(
    stream.totalDeposit,
    elapsedSeconds * stream.ratePerSecond,
  );

  return Math.max(0, streamed - stream.alreadyWithdrawn);
}

export function getProgress(stream: Stream, nowMs = Date.now()): number {
  const total = stream.endTimestamp - stream.startTimestamp;
  const elapsed = nowMs / 1000 - stream.startTimestamp;
  return Math.min(100, Math.max(0, (elapsed / total) * 100));
}

export function formatRelativeTime(timestamp: number): string {
  const seconds = Math.max(1, Math.floor(Date.now() / 1000 - timestamp));
  const units: Array<[number, string]> = [
    [60 * 60 * 24, "d"],
    [60 * 60, "h"],
    [60, "m"],
  ];

  for (const [unitSeconds, label] of units) {
    if (seconds >= unitSeconds) {
      return `${Math.floor(seconds / unitSeconds)}${label} ago`;
    }
  }

  return `${seconds}s ago`;
}

export function formatRemainingTime(stream: Stream, nowMs = Date.now()): string {
  const seconds = Math.max(0, Math.floor(stream.endTimestamp - nowMs / 1000));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h remaining`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }

  return `${minutes}m remaining`;
}

export function formatUtcDate(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(timestamp * 1000);
}

export function getExplorerUrl(value: string): string {
  return `https://stellar.expert/explorer/testnet/search?term=${encodeURIComponent(value)}`;
}
