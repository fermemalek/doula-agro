import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribe to postgres_changes on a table and invalidate the given React Query keys.
 * Each entry in `keys` is invalidated whenever any change happens.
 */
export function useRealtimeInvalidate(
  channelName: string,
  table: string,
  keys: readonly (readonly unknown[])[],
) {
  const qc = useQueryClient();
  useEffect(() => {
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
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, table]);
}
