import { Outlet, useNavigate } from "@/lib/router-compat";
import { useEffect } from "react";
import { BottomTabs } from "@/components/home/BottomTabs";
import { useRole } from "@/lib/role";
import { useConfig } from "@/lib/config-store";
import { OfflineBadge } from "@/components/offline/OfflineBadge";
import { PendingBanner } from "@/components/offline/PendingBanner";

function TabsLayout() {
  const { session, loading } = useRole();
  const navigate = useNavigate();
  const cfg = useConfig();
  const isAr = cfg.lang === "ar";

  useEffect(() => {
    document.documentElement.dir = isAr ? "rtl" : "ltr";
    document.documentElement.lang = isAr ? "ar" : "fr";
  }, [isAr]);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      // Stay on the app when offline so the user can keep working with cached data.
      if (typeof navigator !== "undefined" && navigator.onLine === false) return;
      navigate({ to: "/login" });
      return;
    }
    if (!cfg.configured) navigate({ to: "/configuration" });
  }, [session, loading, cfg.configured, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    );
  }
  if (!session) return null;

  const bgStyle: React.CSSProperties = cfg.bgImage
    ? { backgroundImage: `url(${cfg.bgImage})`, backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" }
    : cfg.bgColor
      ? { background: cfg.bgColor }
      : {};

  return (
    <div className="min-h-screen pb-20" dir={isAr ? "rtl" : "ltr"} style={Object.keys(bgStyle).length ? bgStyle : undefined}>
      <div className={cfg.bgImage ? "min-h-screen bg-background/70 backdrop-blur-[2px]" : "min-h-screen"}>
        <div className="sticky top-0 z-40 flex justify-end px-3 py-1 bg-background/80 backdrop-blur-sm">
          <OfflineBadge />
        </div>
        <div className="px-3 pt-2">
          <PendingBanner />
        </div>
        <Outlet />
        <BottomTabs />
      </div>
    </div>
  );
}

export default TabsLayout;
