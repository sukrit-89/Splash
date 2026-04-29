const errorStorageKey = "splash_runtime_errors";
const maxStoredErrors = 20;

interface RuntimeErrorRecord {
  message: string;
  source: "error" | "unhandledrejection";
  stack?: string;
  timestamp: number;
  url: string;
}

function readStoredErrors(): RuntimeErrorRecord[] {
  try {
    const raw = window.localStorage.getItem(errorStorageKey);
    return raw ? (JSON.parse(raw) as RuntimeErrorRecord[]) : [];
  } catch {
    return [];
  }
}

function writeStoredError(record: RuntimeErrorRecord) {
  try {
    const next = [record, ...readStoredErrors()].slice(0, maxStoredErrors);
    window.localStorage.setItem(errorStorageKey, JSON.stringify(next));
  } catch {
    // localStorage can be unavailable in strict browser modes; avoid cascading.
  }
}

function messageFromReason(reason: unknown): Pick<RuntimeErrorRecord, "message" | "stack"> {
  if (reason instanceof Error) {
    return {
      message: reason.message,
      stack: reason.stack,
    };
  }

  return {
    message: typeof reason === "string" ? reason : JSON.stringify(reason),
  };
}

export function installErrorTracking() {
  window.addEventListener("error", (event) => {
    writeStoredError({
      message: event.message,
      source: "error",
      stack: event.error instanceof Error ? event.error.stack : undefined,
      timestamp: Date.now(),
      url: window.location.href,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    writeStoredError({
      ...messageFromReason(event.reason),
      source: "unhandledrejection",
      timestamp: Date.now(),
      url: window.location.href,
    });
  });
}
