// Polyfill crypto.randomUUID for non-secure HTTP contexts
if (typeof window !== "undefined") {
  if (!window.crypto) {
    (window as any).crypto = {};
  }
  if (!window.crypto.randomUUID) {
    window.crypto.randomUUID = function () {
      const getRandomValuesFallback = (arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
      };
      const r = window.crypto.getRandomValues
        ? window.crypto.getRandomValues(new Uint8Array(16))
        : getRandomValuesFallback(new Uint8Array(16));
      r[6] = (r[6] & 0x0f) | 0x40; // Version 4
      r[8] = (r[8] & 0x3f) | 0x80; // Variant 10
      let uuid = "";
      for (let i = 0; i < 16; i++) {
        if (i === 4 || i === 6 || i === 8 || i === 10) uuid += "-";
        uuid += r[i].toString(16).padStart(2, "0");
      }
      return uuid as any;
    };
  }
}

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { RoleProvider } from "@/lib/role";
import { Toaster } from "@/components/ui/sonner";
import { startSyncEngine } from "@/lib/offline/sync-engine";
import "@/lib/offline/handlers"; // register op handlers
import "./styles.css";

const queryClient = new QueryClient();
startSyncEngine();

// Listen for service-worker wake-ups (Background Sync)
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", (e) => {
    if ((e.data as { type?: string } | null)?.type === "ff-offline-sync") {
      import("@/lib/offline/sync-engine").then((m) => m.scheduleSync(0));
    }
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <QueryClientProvider client={queryClient}>
        <RoleProvider>
          <App />
          <Toaster richColors position="top-center" />
        </RoleProvider>
      </QueryClientProvider>
    </HashRouter>
  </StrictMode>,
);
