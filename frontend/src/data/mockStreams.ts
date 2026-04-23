import type { Stream } from "../types/stream";

const now = Date.now();

export const streams: Stream[] = [
  {
    id: "stream-001",
    role: "recipient",
    sender: "GC7M...9QA2",
    recipient: "GDK4...8XPL",
    token: "USDC",
    ratePerSecond: 0.0036,
    totalDeposit: 864,
    withdrawn: 118.42,
    startTime: now - 1000 * 60 * 60 * 9,
    endTime: now + 1000 * 60 * 60 * 57,
    status: "active",
  },
  {
    id: "stream-002",
    role: "sender",
    sender: "GB2R...11SP",
    recipient: "GAV9...Q8TZ",
    token: "USDC",
    ratePerSecond: 0.0019,
    totalDeposit: 328.32,
    withdrawn: 41.85,
    startTime: now - 1000 * 60 * 60 * 6,
    endTime: now + 1000 * 60 * 60 * 42,
    status: "active",
  },
  {
    id: "stream-003",
    role: "recipient",
    sender: "GCF8...LX44",
    recipient: "GDQ1...P3MN",
    token: "PYUSD",
    ratePerSecond: 0.00092,
    totalDeposit: 198.72,
    withdrawn: 89.2,
    startTime: now - 1000 * 60 * 60 * 31,
    endTime: now + 1000 * 60 * 60 * 29,
    status: "active",
  },
];

export const findStream = (id: string) => streams.find((stream) => stream.id === id);
