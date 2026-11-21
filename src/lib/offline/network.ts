import { useEffect, useState } from "react";

export type NetworkStatus = "online" | "offline";

let listeners: Set<(s: NetworkStatus) => void> = new Set();

function current(): NetworkStatus {
  return typeof navigator !== "undefined" && navigator.onLine ? "online" : "offline";
}

function emit() {
  const s = current();
  listeners.forEach((l) => l(s));
}

if (typeof window !== "undefined") {
  window.addEventListener("online", emit);
  window.addEventListener("offline", emit);
  window.addEventListener("focus", emit);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") emit();
  });
}

export function subscribeNetwork(cb: (s: NetworkStatus) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getNetworkStatus(): NetworkStatus {
  return current();
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(current());
  useEffect(() => subscribeNetwork(setStatus), []);
  return status;
}
