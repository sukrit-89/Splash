import { useEffect, useState } from "react";
import { getContractEvents } from "../lib/stellar";
import {
  addCachedActivity,
  readCachedStreams,
  readEventCursor,
  writeEventCursor,
} from "../lib/streamStorage";
import { ActivityEventType, TokenSymbol } from "../types/stream";

function topicToType(topic: string): ActivityEventType | null {
  if (topic === "StreamCreated") {
    return ActivityEventType.StreamCreated;
  }
  if (topic === "Withdrawal") {
    return ActivityEventType.Withdrawal;
  }
  if (topic === "StreamCancelled") {
    return ActivityEventType.Cancelled;
  }
  return null;
}

function valueField(value: unknown, key: string): unknown {
  if (value && typeof value === "object" && key in value) {
    return (value as Record<string, unknown>)[key];
  }
  return undefined;
}

export function useContractEvents() {
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const response = await getContractEvents(readEventCursor());
        if (cancelled) {
          return;
        }
        response.events.forEach((event) => {
          const type = topicToType(event.topic);
          if (!type) {
            return;
          }
          const streamId = String(valueField(event.value, "stream_id") ?? "");
          const stream = readCachedStreams().find((item) => item.id === streamId);
          addCachedActivity({
            id: event.id,
            type,
            streamId,
            address: String(
              valueField(event.value, "recipient") ??
                valueField(event.value, "sender") ??
                "",
            ),
            amount: Number(
              valueField(event.value, "amount") ??
                valueField(event.value, "total_deposit") ??
                valueField(event.value, "sender_refund") ??
                0,
            ) / 10_000_000,
            token: stream?.token ?? TokenSymbol.USDC,
            timestamp: event.timestamp,
            ledger: event.ledger,
          });
        });
        if (response.cursor) {
          writeEventCursor(response.cursor);
        }
        setIsReconnecting(false);
      } catch {
        if (!cancelled) {
          setIsReconnecting(true);
        }
      }
    };

    poll();
    const interval = window.setInterval(poll, 12_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  return { isReconnecting };
}
