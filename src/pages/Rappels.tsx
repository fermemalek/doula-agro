import { useState } from "react";
import { BellRing, Plus, Trash2, Check, Pencil, Play, Clock } from "lucide-react";
import {
  useReminders,
  useRemindersActions,
  todayKey,
  type Reminder,
  type ReminderFrequency,
} from "@/lib/reminders-store";
import { useParcels } from "@/lib/parcel-store";
import { useTranslation } from "@/lib/i18n";
import {
  computeNextReminderDate,
  scheduleCriticalNotification,
} from "@/lib/notifications-native";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

function formatNextTrigger(r: Reminder, isAr: boolean): string {
  const next = computeNextReminderDate(r);
  if (!next) return isAr ? "متوقف" : "Désactivé";
  const now = new Date();
  const isSameDay =
    next.getFullYear() === now.getFullYear() &&
    next.getMonth() === now.getMonth() &&
    next.getDate() === now.getDate();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const isTomorrow =
    next.getFullYear() === tomorrow.getFullYear() &&
    next.getMonth() === tomorrow.getMonth() &&
    next.getDate() === tomorrow.getDate();

  if (isSameDay) {
    return isAr ? `اليوم الساعة ${r.time}` : `Aujourd'hui à ${r.time}`;
  }
  if (isTomorrow) {
    return isAr ? `غداً الساعة ${r.time}` : `Demain à ${r.time}`;
  }
  const dayStr = next.toLocaleDateString(isAr ? "ar-DZ" : "fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return isAr ? `${dayStr} · ${r.time}` : `${dayStr} à ${r.time}`;
}

function RappelsPage() {
  const { lang } = useTranslation();
  const isAr = lang === "ar";
  const reminders = useReminders();
  const { add, update, remove, toggleActive, markChecked, unmarkChecked } = useRemindersActions();
  const parcels = useParcels();
  const today = todayKey();

  const FREQ_LABEL: Record<ReminderFrequency, string> = isAr
    ? {
        daily: "كل يوم",
        weekdays: "أيام العمل",
        weekly: "أسبوعياً (الاثنين)",
      }
    : {
        daily: "Tous les jours",
        weekdays: "Jours ouvrés",
        weekly: "Hebdomadaire (lundi)",
      };

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("06:00");
  const [frequency, setFrequency] = useState<ReminderFrequency>("daily");
  const [parcelId, setParcelId] = useState<string>("");

  const openCreate = () => {
    setEditingId(null);
    setTitle("");
    setTime("06:00");
    setFrequency("daily");
    setParcelId("");
    setOpen(true);
  };

  const openEdit = (r: Reminder) => {
    setEditingId(r.id);
    setTitle(r.title);
    setTime(r.time);
    setFrequency(r.frequency);
    setParcelId(r.parcelId || "");
    setOpen(true);
  };

  const save = () => {
    if (!title.trim()) {
      toast.error(isAr ? "العنوان مطلوب" : "Titre requis");
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(time)) {
      toast.error(isAr ? "الوقت غير صالح" : "Heure invalide");
      return;
    }

    if (editingId) {
      update(editingId, {
        title: title.trim(),
        time,
        frequency,
        parcelId: parcelId || undefined,
      });
      toast.success(isAr ? "تم تحديث التذكير وجدولة المنبه" : "Rappel modifié et alarme reprogrammée");
    } else {
      add({
        title: title.trim(),
        time,
        frequency,
        parcelId: parcelId || undefined,
      });
      toast.success(isAr ? "تم إنشاء التذكير وجدولة المنبه" : "Rappel créé et alarme programmée");
    }
    setOpen(false);
    setEditingId(null);
  };

  const handleTestReminder = async (r: Reminder) => {
    const ok = await scheduleCriticalNotification({
      title: isAr ? `⏰ تذكير المزرعة — ${r.title}` : `⏰ Rappel Ferme — ${r.title}`,
      body: isAr ? `تجربة المنبه المبرمج على ${r.time}` : `Test de l'alarme programmée à ${r.time}`,
      at: new Date(Date.now() + 3000),
      extra: { source: "doula_urgent_once", kind: "test_reminder", reminderId: r.id },
    });
    if (ok) {
      toast.success(
        isAr
          ? "سيرن هذا التذكير خلال 3 ثوانٍ للتجربة"
          : "Alarme de test déclenchée dans 3 secondes !",
      );
    } else {
      toast.error(
        isAr
          ? "فعّل الإشعارات من «الملف الشخصي» لتجربة التنبيه"
          : "Activez les notifications dans Profil pour tester l'alarme",
      );
    }
  };

  return (
    <main
      dir={isAr ? "rtl" : "ltr"}
      className="mx-auto max-w-3xl w-full overflow-x-hidden px-4 pb-24 pt-4"
    >
      <h1 className="mb-1 text-xl font-bold">{isAr ? "التذكيرات" : "Rappels"}</h1>
      <p className="mb-3 text-sm text-muted-foreground">
        {isAr
          ? "منبهات يومية للتحقق الصباحي (الفلتر، الضغط، الري، المعاملات)."
          : "Alarmes à vérifier chaque matin (filtre, pression, arrosage, traitements)."}
      </p>

      <button
        type="button"
        onClick={openCreate}
        className="mb-4 inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-base font-bold text-primary-foreground active:scale-95 cursor-pointer"
      >
        <Plus className="h-5 w-5" /> {isAr ? "تذكير جديد" : "Nouveau rappel"}
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent dir={isAr ? "rtl" : "ltr"}>
          <DrawerHeader>
            <DrawerTitle>
              {editingId
                ? isAr ? "تعديل التذكير" : "Modifier le rappel"
                : isAr ? "تذكير جديد" : "Nouveau rappel"}
            </DrawerTitle>
          </DrawerHeader>
          <div className="space-y-3 px-4 pb-6">
            <div>
              <label className="mb-1 block text-sm font-medium">
                {isAr ? "العنوان" : "Titre"}
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={isAr ? "مثال: فحص الفلتر الرئيسي" : "Ex. Vérifier le filtre principal"}
                className="w-full rounded-xl border bg-card p-3 text-base"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  {isAr ? "الساعة" : "Heure"}
                </label>
                <input
                  type="time"
                  dir="ltr"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full rounded-xl border bg-card p-3 text-base"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  {isAr ? "التكرار" : "Fréquence"}
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as ReminderFrequency)}
                  className="w-full rounded-xl border bg-card p-3 text-base"
                >
                  <option value="daily">{FREQ_LABEL.daily}</option>
                  <option value="weekdays">{FREQ_LABEL.weekdays}</option>
                  <option value="weekly">{FREQ_LABEL.weekly}</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                {isAr ? "القطعة (اختياري)" : "Parcelle (optionnel)"}
              </label>
              <select
                value={parcelId}
                onChange={(e) => setParcelId(e.target.value)}
                className="w-full rounded-xl border bg-card p-3 text-base"
              >
                <option value="">{isAr ? "— لا شيء —" : "— Aucune —"}</option>
                {parcels.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={save}
              className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-bold text-primary-foreground active:scale-95 cursor-pointer"
            >
              {editingId
                ? isAr ? "حفظ التعديلات" : "Enregistrer les modifications"
                : isAr ? "إنشاء التذكير" : "Créer le rappel"}
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      {reminders.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          {isAr
            ? "لا توجد تذكيرات بعد. أنشئ تذكيراً للتحقق الصباحي."
            : "Aucun rappel. Créez-en un pour la vérification matinale."}
        </p>
      ) : (
        <ul className="space-y-2.5">
          {reminders.map((r) => {
            const checked = r.lastCheckedAt === today;
            const parcel = parcels.find((p) => p.id === r.parcelId);
            return (
              <li
                key={r.id}
                className={`flex flex-col gap-2 rounded-2xl border bg-card p-3.5 ${
                  !r.active ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => (checked ? unmarkChecked(r.id) : markChecked(r.id))}
                    disabled={!r.active}
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 cursor-pointer ${
                      checked
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-muted-foreground"
                    }`}
                    title={isAr ? "تحديد كمنجز اليوم" : "Marquer comme vérifié"}
                  >
                    {checked ? (
                      <Check className="h-5 w-5" strokeWidth={3} />
                    ) : (
                      <BellRing className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{r.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {FREQ_LABEL[r.frequency]} · <span dir="ltr">{r.time}</span>
                      {parcel ? ` · ${parcel.name}` : ""}
                    </p>
                  </div>
                  <Switch checked={r.active} onCheckedChange={() => toggleActive(r.id)} />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-xs">
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    <span>{formatNextTrigger(r, isAr)}</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => void handleTestReminder(r)}
                      className="inline-flex h-8 items-center gap-1 rounded-lg border px-2 text-xs font-semibold text-foreground hover:bg-muted cursor-pointer"
                      title={isAr ? "تجربة المنبه (3 ثوانٍ)" : "Tester cette alarme (3 s)"}
                    >
                      <Play className="h-3.5 w-3.5 text-emerald-600" />
                      <span>{isAr ? "تجربة" : "Tester"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(r)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                      title={isAr ? "تعديل" : "Modifier"}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(r.id)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                      title={isAr ? "حذف" : "Supprimer"}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

export default RappelsPage;
