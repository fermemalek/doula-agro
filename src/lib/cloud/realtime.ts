import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const activeChannels = new Map<
  string,
  { channel: ReturnType<typeof supabase.channel>; count: number }
>();

/**
 * Subscribe to postgres_changes on a table and invalidate the given React Query keys.
 * Reference-counted per channelName so multiple simultaneous components using the same
 * hook (e.g. useTasks in Home, BottomTabs, and useMyAssignedTasks) never call .on()
 * after .subscribe() on the same Supabase Realtime channel.
 */
export function useRealtimeInvalidate(
  channelName: string,
  table: string,
  keys: readonly (readonly unknown[])[],
) {
  const qc = useQueryClient();
  useEffect(() => {
    try {
      const existing = activeChannels.get(channelName);
      if (existing) {
        existing.count += 1;
      } else {
        const channel = supabase
          .channel(channelName)
          .on(
            "postgres_changes" as never,
            { event: "*", schema: "public", table } as never,
            () => {
              for (const k of keys) qc.invalidateQueries({ queryKey: [...k] });
            },
          )
          .subscribe();
        activeChannels.set(channelName, { channel, count: 1 });
      }
    } catch (err) {
      console.warn("[Realtime] subscription warning:", err);
    }

    return () => {
      try {
        const current = activeChannels.get(channelName);
        if (!current) return;
        current.count -= 1;
        if (current.count <= 0) {
          activeChannels.delete(channelName);
          supabase.removeChannel(current.channel);
        }
      } catch (err) {
        console.warn("[Realtime] cleanup warning:", err);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, table]);
}
