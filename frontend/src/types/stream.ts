export enum StreamStatus {
  Active = "active",
  Pending = "pending",
  Cancelled = "cancelled",
  Completed = "completed",
  Failed = "failed",
}

export enum TokenSymbol {
  USDC = "USDC",
  XLM = "XLM",
}

export enum StreamRole {
  Sender = "sender",
  Recipient = "recipient",
}

export interface Stream {
  id: string;
  sender: string;
  recipient: string;
  token: TokenSymbol;
  totalDeposit: number;
  ratePerSecond: number;
  alreadyWithdrawn: number;
  lifetimeReceived: number;
  startTimestamp: number;
  endTimestamp: number;
  createdAt: number;
  status: StreamStatus;
  role: StreamRole;
}

export enum ActivityEventType {
  StreamCreated = "StreamCreated",
  Withdrawal = "Withdrawal",
  Cancelled = "Cancelled",
}

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  streamId: string;
  address: string;
  amount?: number;
  token: TokenSymbol;
  timestamp: number;
  ledger: number;
}

export interface WithdrawalRecord {
  id: string;
  timestamp: number;
  amount: number;
  token: TokenSymbol;
  txHash: string;
}
