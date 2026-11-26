import { useCallback, useEffect, useState } from "react";
import {
  BellRing,
  BellOff,
  Clock,
  BatteryCharging,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Siren,
  SlidersHorizontal,
  Smartphone,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";
import {
  type CriticalPermissionsStatus,
  getCriticalPermissionsStatus,
  requestNotificationPermission,
  openDndSettings,
  openUrgentChannelSettings,
  openExactAlarmSettings,
  openBatteryOptimizationSettings,
  scheduleTestCriticalAlert,
} from "@/lib/notifications-native";
import { toast } from "sonner";

const INITIAL_STATUS: CriticalPermissionsStatus = {
  isNative: false,
  notifications: false,
  dndBypass: false,
  channelBypassDnd: false,
  exactAlarm: false,
  batteryUnrestricted: false,
};

export function CriticalNotificationsCard() {
  const { lang } = useTranslation();
  const isAr = lang === "ar";
  const [status, setStatus] = useState<CriticalPermissionsStatus>(INITIAL_STATUS);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await getCriticalPermissionsStatus();
      setStatus(next);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onFocus = () => void refresh();
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  const handleRequestNotifications = async () => {
    const granted = await requestNotificationPermission();
    await refresh();
    if (granted) {
      toast.success(isAr ? "تم تفعيل الإشعارات بنجاح" : "Notifications activées");
    } else {
      toast.error(
        isAr
          ? "يرجى السماح بالإشعارات من إعدادات الهاتف"
          : "Autorisation refusée — activez les notifications dans les réglages Android",
      );
    }
  };

  const handleTestAlert = async () => {
    setTesting(true);
    try {
      if (!status.notifications) {
        const granted = await requestNotificationPermission();
        await refresh();
        if (!granted) {
          toast.error(
            isAr
              ? "فعّل الإشعارات أولاً لتجربة التنبيه"
              : "Activez d'abord les notifications pour lancer le test",
          );
          return;
        }
      }
      const ok = await scheduleTestCriticalAlert(isAr);
      if (ok) {
        toast.success(
          isAr
            ? "سيصل التنبيه الحرج خلال 5 ثوانٍ — يمكنك قفل الشاشة الآن للتجربة"
            : "Alerte critique programmée dans 5 secondes — verrouillez l'écran pour tester !",
          { duration: 6000 },
        );
      } else {
        toast.error(
          isAr
            ? "تعذر جدولة التنبيه التجريبي"
            : "Impossible de programmer l'alerte de test",
        );
      }
    } finally {
      setTesting(false);
    }
  };

  const dndFullyReady = status.dndBypass && status.channelBypassDnd;

  const rows = [
    {
      key: "notifications",
      icon: BellRing,
      title: isAr ? "الإشعارات (Android 13+)" : "Notifications (Android 13+)",
      desc: isAr
        ? "السماح للتطبيق بإرسال تنبيهات فورية على الشاشة."
        : "Autorise l'affichage des alertes et rappels de la ferme.",
      ok: status.notifications,
      actionLabel: isAr ? "تفعيل" : "Autoriser",
      onAction: handleRequestNotifications,
      nativeOnly: false,
    },
    {
      key: "dnd",
      icon: BellOff,
      title: isAr
        ? "تجاوز وضع الصمت / عدم الإزعاج (DND)"
        : "Ignorer Silence / Ne pas déranger (DND)",
      desc: isAr
        ? "يتيح رنين صوت التنبيه حتى لو كان الهاتف في وضع الصمت."
        : "Permet à l'alerte de sonner même en mode Silence ou Ne pas déranger.",
      ok: dndFullyReady,
      actionLabel: isAr ? "إعدادات DND" : "Réglages DND",
      onAction: async () => {
        await openDndSettings();
      },
      secondaryLabel: isAr ? "قناة الطوارئ" : "Canal Urgence",
      onSecondary: async () => {
        await openUrgentChannelSettings();
      },
      nativeOnly: true,
    },
    {
      key: "exactAlarm",
      icon: Clock,
      title: isAr ? "منبهات دقيقة (بالدقيقة)" : "Alarmes exactes (à la minute près)",
      desc: isAr
        ? "إطلاق تذكيرات الري والمعاملات في الوقت المحدد دون تأخير."
        : "Déclenche les rappels d'arrosage et traitements à l'heure exacte.",
      ok: status.exactAlarm,
      actionLabel: isAr ? "تفعيل" : "Configurer",
      onAction: async () => {
        await openExactAlarmSettings();
      },
      nativeOnly: true,
    },
    {
      key: "battery",
      icon: BatteryCharging,
      title: isAr ? "بطارية غير مقيدة (في الخلفية)" : "Batterie sans restriction (arrière-plan)",
      desc: isAr
        ? "يمنع النظام من إيقاف التنبيهات عندما يكون الهاتف في وضع السكون."
        : "Empêche Android de mettre l'application en veille profonde (mode Doze).",
      ok: status.batteryUnrestricted,
      actionLabel: isAr ? "إلغاء القيد" : "Autoriser",
      onAction: async () => {
        await openBatteryOptimizationSettings();
      },
      nativeOnly: true,
    },
  ];

  const readyCount = rows.filter((r) => r.ok).length;

  return (
    <Card className="p-4 sm:p-5 space-y-4 border-amber-500/30 bg-card w-full max-w-full overflow-x-hidden">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-600">
            <Siren className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-sm sm:text-base leading-tight">
              {isAr ? "صلاحيات التنبيهات الحرجة" : "Autorisations Notifications Critiques"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
              {isAr
                ? "تضمن وصول تنبيهات الري، التوصيات العاجلة، الصقيع والرياح القوية حتى مع قفل الشاشة أو وضع الصمت."
                : "Garantit que les alertes (arrosage, recommandations, gel, vent) sonnent et vibrent même écran verrouillé ou en mode Silence."}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-muted/50 text-muted-foreground hover:text-foreground transition cursor-pointer"
          title={isAr ? "تحديث الحالة" : "Actualiser l'état"}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {!status.isNative && (
        <div className="flex items-start gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-xs text-sky-900 dark:text-sky-200">
          <Smartphone className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            {isAr
              ? "أنت تستخدم نسخة الويب. صلاحيات تجاوز الصمت والبطارية والمنبه الدقيق خاصة بتطبيق Android (APK)."
              : "Mode navigateur Web détecté : les autorisations DND, alarmes exactes et batterie s'appliquent sur l'APK Android."}
          </span>
        </div>
      )}

      {status.isNative && (
        <div className="flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2 text-xs font-medium">
          <span>
            {isAr ? "جاهزية التنبيهات الحرجة" : "État de protection critique"}
          </span>
          <span
            className={`font-bold ${
              readyCount === rows.length ? "text-emerald-600" : "text-amber-600"
            }`}
          >
            {readyCount} / {rows.length}
          </span>
        </div>
      )}

      <div className="space-y-2.5">
        {rows.map((row) => {
          const Icon = row.icon;
          const disabledOnWeb = row.nativeOnly && !status.isNative;
          return (
            <div
              key={row.key}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border bg-background/60 p-3"
            >
              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                <Icon className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-semibold">{row.title}</span>
                    {!disabledOnWeb && (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          row.ok
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                        }`}
                      >
                        {row.ok ? (
                          <>
                            <CheckCircle2 className="h-3 w-3" />
                            {isAr ? "مفعّل" : "Activé"}
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="h-3 w-3" />
                            {isAr ? "مطلوب" : "À activer"}
                          </>
                        )}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    {row.desc}
                  </p>
                </div>
              </div>

              {!disabledOnWeb && (
                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  {row.secondaryLabel && row.onSecondary && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={row.onSecondary}
                      className="h-8 text-xs gap-1"
                    >
                      <SlidersHorizontal className="h-3 w-3" />
                      {row.secondaryLabel}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant={row.ok ? "outline" : "default"}
                    size="sm"
                    onClick={row.onAction}
                    className="h-8 text-xs"
                  >
                    {row.actionLabel}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Button
        type="button"
        onClick={handleTestAlert}
        disabled={testing}
        className="w-full h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm gap-2"
      >
        <Siren className="h-4 w-4 shrink-0" />
        <span>
          {isAr
            ? "اختبار تنبيه حرج الآن (خلال 5 ثوانٍ)"
            : "Tester une alerte critique maintenant (dans 5 sec)"}
        </span>
      </Button>
    </Card>
  );
}
