import { useEffect, useState } from "react";

export type NetworkStatus = "online" | "offline";

let listeners: Set<(s: NetworkStatus) => void> = new Set();

function current(): NetworkStatus {
  return typeof navigator !== "undefined" && navigator.onLine ? "online" : "offline";
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => listeners.forEach((l) => l("online")));
  window.addEventListener("offline", () => listeners.forEach((l) => l("offline")));
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
