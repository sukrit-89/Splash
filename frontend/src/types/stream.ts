export type StreamStatus = "active" | "cancelled" | "completed";

export type Stream = {
  id: string;
  streamId?: number;
  role: "sender" | "recipient";
  sender: string;
  recipient: string;
  token: "USDC" | "XLM" | "PYUSD";
  tokenContractId?: string;
  ratePerSecond: number;
  totalDeposit: number;
  withdrawn: number;
  startTime: number;
  endTime: number;
  status: StreamStatus;
  lastSyncedAt?: number;
  syncedClaimable?: number;
  claimableSyncedAt?: number;
};

export type ToastMessage = {
  id: number;
  title: string;
  body?: string;
};
