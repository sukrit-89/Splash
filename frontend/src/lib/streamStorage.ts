import type { Stream } from "../types/stream";

const STREAM_INDEX_KEY = "streamflow:stream_ids";

function streamKey(id: string) {
  return `stream:${id}`;
}

function readIndex() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STREAM_INDEX_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeIndex(ids: string[]) {
  window.localStorage.setItem(STREAM_INDEX_KEY, JSON.stringify(Array.from(new Set(ids))));
}

export function loadCachedStreams(address?: string | null) {
  if (typeof window === "undefined") return [];

  return readIndex()
    .map((id) => {
      try {
        return JSON.parse(window.localStorage.getItem(streamKey(id)) || "null") as Stream | null;
      } catch {
        return null;
      }
    })
    .filter((stream): stream is Stream => {
      if (!stream) return false;
      if (!address) return true;
      return stream.sender === address || stream.recipient === address;
    });
}

export function saveCachedStream(stream: Stream) {
  const ids = readIndex();
  writeIndex([stream.id, ...ids]);
  window.localStorage.setItem(streamKey(stream.id), JSON.stringify(stream));
}

export function saveCachedStreams(streams: Stream[]) {
  streams.forEach(saveCachedStream);
}
