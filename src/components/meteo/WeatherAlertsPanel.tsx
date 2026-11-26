import { useState } from "react";
import {
  Flame,
  Snowflake,
  Plus,
  Users,
  Trash2,
  Pencil,
  BellRing,
  Mail,
  MessageCircle,
  Send,
  ShieldCheck,
  Clock,
  Check,
  X,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  type WeatherAlertContact,
  type WeatherAlertSettings,
  sanitizeEmail,
  buildWeatherAlertMessage,
  buildWhatsAppShareUrl,
  triggerWeatherThresholdTest,
} from "@/lib/weather-alerts-store";

interface WeatherAlertsPanelProps {
  settings: WeatherAlertSettings;
  onSave: (next: WeatherAlertSettings) => Promise<{ syncedCloud: boolean }>;
  currentTemp: number | null;
  humidity?: number;
  windKmh?: number;
  isAr: boolean;
}

const EMPTY_FORM: Omit<WeatherAlertContact, "id"> = {
  name: "",
  role: "",
  phone: "",
  callmebotKey: "",
  email: "",
  channels: { apk: true, whatsapp: true, email: false },
};

export function WeatherAlertsPanel({
  settings,
  onSave,
  currentTemp,
  humidity,
  windKmh,
  isAr,
}: WeatherAlertsPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<Omit<WeatherAlertContact, "id">>(EMPTY_FORM);
  const [importing, setImporting] = useState(false);
  const [testingKind, setTestingKind] = useState<"heat" | "frost" | null>(null);

  const updateThresholds = async (maxVal: number, minVal: number) => {
    const res = await onSave({
      ...settings,
      maxTempThreshold: maxVal,
      minTempThreshold: minVal,
    });
    toast.success(
      isAr
        ? res.syncedCloud
          ? "تم حفظ حدود التنبيه ومزامنتها سحابياً"
          : "تم حفظ حدود التنبيه محلياً"
        : res.syncedCloud
          ? "Seuils enregistrés et synchronisés"
          : "Seuils enregistrés localement",
    );
  };

  const openAddForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEditForm = (c: WeatherAlertContact) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      role: c.role,
      phone: c.phone,
      callmebotKey: c.callmebotKey,
      email: sanitizeEmail(c.email),
      channels: { ...c.channels },
    });
    setFormOpen(true);
  };

  const handleSaveContact = async () => {
    if (!form.name.trim()) {
      toast.error(isAr ? "يرجى إدخال اسم جهة الاتصال" : "Veuillez saisir le nom du contact.");
      return;
    }
    const cleanEmail = sanitizeEmail(form.email);
    const contact: WeatherAlertContact = {
      id: editingId || `c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: form.name.trim(),
      role: form.role.trim(),
      phone: form.phone.trim(),
      callmebotKey: form.callmebotKey.trim(),
      email: cleanEmail,
      channels: {
        apk: form.channels.apk,
        whatsapp: form.channels.whatsapp,
        email: form.channels.email && Boolean(cleanEmail),
      },
    };

    const nextContacts = editingId
      ? settings.contacts.map((c) => (c.id === editingId ? contact : c))
      : [...settings.contacts, contact];

    await onSave({ ...settings, contacts: nextContacts });
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    toast.success(isAr ? "تم حفظ جهة الاتصال" : "Contact enregistré !");
  };

  const handleDeleteContact = async (id: string) => {
    const nextContacts = settings.contacts.filter((c) => c.id !== id);
    await onSave({ ...settings, contacts: nextContacts });
    toast.success(isAr ? "تم حذف جهة الاتصال" : "Contact supprimé");
  };

  const handleImportFarmMembers = async () => {
    setImporting(true);
    try {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        (supabase as any).from("profiles").select("id, full_name, phone_number"),
        (supabase as any).from("user_roles").select("user_id, role"),
      ]);
      const roleMap = new Map<string, string>();
      for (const r of roles ?? []) {
        roleMap.set(r.user_id, r.role);
      }

      const existingNames = new Set(settings.contacts.map((c) => c.name.toLowerCase()));
      const added: WeatherAlertContact[] = [];

      for (const p of profiles ?? []) {
        const name = (p.full_name || "").trim();
        if (!name || existingNames.has(name.toLowerCase())) continue;
        const r = roleMap.get(p.id) || "executant";
        const roleLabel =
          r === "admin"
            ? isAr ? "مدير" : "Admin"
            : r === "ingenieur"
              ? isAr ? "مهندس" : "Ingénieur"
              : isAr ? "منفذ" : "Exécutant";
        added.push({
          id: `farm_${p.id}`,
          name,
          role: roleLabel,
          phone: (p.phone_number || "").trim(),
          callmebotKey: "",
          email: "",
          channels: { apk: true, whatsapp: Boolean(p.phone_number), email: false },
        });
      }

      if (added.length === 0) {
        toast.info(
          isAr
            ? "جميع أعضاء المزرعة مضافون بالفعل"
            : "Tous les membres de la ferme sont déjà dans la liste.",
        );
        return;
      }

      await onSave({ ...settings, contacts: [...settings.contacts, ...added] });
      toast.success(
        isAr
          ? `تم استيراد ${added.length} عضو من المزرعة`
          : `${added.length} membre(s) de la ferme importé(s) !`,
      );
    } catch {
      toast.error(isAr ? "تعذر استيراد الأعضاء" : "Impossible d'importer les membres");
    } finally {
      setImporting(false);
    }
  };

  const handleTest = async (kind: "heat" | "frost") => {
    setTestingKind(kind);
    try {
      const tempToUse = currentTemp ?? (kind === "frost" ? settings.minTempThreshold : settings.maxTempThreshold);
      const res = await triggerWeatherThresholdTest({
        kind,
        currentTemp: tempToUse,
        humidity,
        windKmh,
        settings,
        isAr,
      });

      const parts: string[] = [];
      if (res.localApkScheduled) {
        parts.push(isAr ? "إشعار الهاتف (خلال ثانيتين)" : "Notification APK (dans 2 s)");
      }
      if (res.emailsSent > 0) {
        parts.push(isAr ? `${res.emailsSent} بريد إلكتروني` : `${res.emailsSent} e-mail(s)`);
      }
      if (res.whatsappSent > 0) {
        parts.push(isAr ? `${res.whatsappSent} واتساب` : `${res.whatsappSent} WhatsApp`);
      }
      if (res.pushSent > 0) {
        parts.push(isAr ? `${res.pushSent} دفع عن بُعد` : `${res.pushSent} Push FCM`);
      }

      if (parts.length > 0 && res.errors.length === 0) {
        toast.success(
          isAr
            ? `تم إطلاق التنبيه التجريبي: ${parts.join(" · ")}`
            : `Test envoyé : ${parts.join(" · ")}`,
          { duration: 6000 },
        );
      } else if (parts.length > 0 && res.errors.length > 0) {
        toast.warning(
          isAr
            ? `إرسال جزئي (${parts.join(" · ")}) — تفاصيل: ${res.errors.join(" | ")}`
            : `Envoi partiel (${parts.join(" · ")}) — Détails : ${res.errors.join(" | ")}`,
          { duration: 8000 },
        );
      } else {
        toast.info(
          res.errors.length > 0
            ? res.errors.join(" | ")
            : res.serverMessage ||
                (isAr
                  ? "تمت محاكاة التنبيه — أضف جهات اتصال أو فعّل صلاحيات الإشعارات."
                  : "Test déclenché — configurez vos contacts ou les secrets serveur pour l'e-mail/WhatsApp."),
          { duration: 8000 },
        );
      }
    } finally {
      setTestingKind(null);
    }
  };

  const handleWhatsAppFallback = (c: WeatherAlertContact) => {
    const temp = currentTemp ?? 0;
    const kind: "heat" | "frost" =
      temp <= settings.minTempThreshold ? "frost" : "heat";
    const threshold =
      kind === "frost" ? settings.minTempThreshold : settings.maxTempThreshold;
    const msg = buildWeatherAlertMessage({
      kind,
      temp,
      threshold,
      humidity,
      windKmh,
      isAr,
    });
    window.open(buildWhatsAppShareUrl(c.phone, `${msg.title}\n${msg.body}`), "_blank", "noopener,noreferrer");
  };

  return (
    <div className="rounded-2xl border-2 border-emerald-600/25 bg-card overflow-hidden shadow-xs w-full max-w-full">
      {/* En-tête permanent — TOUJOURS ACTIF */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-emerald-600/[0.06] border-b border-emerald-600/15">
        <div className="flex items-center gap-2 min-w-0">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="text-xs sm:text-sm font-black text-foreground">
            {isAr ? "تنبيهات الحرارة القصوى والصقيع" : "Alertes Température Haute & Gel"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-black text-emerald-700 dark:text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {isAr ? "مراقبة نشطة 24/24" : "Actif 24h/24"}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
            <Clock className="h-2.5 w-2.5" />
            {isAr ? "فاصل 6 سا" : "Cooldown 6h"}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4 text-xs">
        {/* 1. Double seuil symétrique TOUJOURS ACTIF */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Bloc A : Chaleur Haute */}
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/[0.04] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-black text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                <Flame className="h-4 w-4 shrink-0" />
                <span>{isAr ? "تنبيه الحرارة المرتفعة (≥ °م)" : "Alerte Chaleur Haute (≥ °C)"}</span>
              </span>
              <span dir="ltr" className="text-sm font-black text-rose-600">
                ≥ {settings.maxTempThreshold}°C
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <Input
                type="number"
                dir="ltr"
                min={20}
                max={55}
                step={1}
                value={settings.maxTempThreshold}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (!Number.isNaN(v)) void updateThresholds(v, settings.minTempThreshold);
                }}
                className="h-9 font-black text-sm w-20 rounded-xl bg-background"
              />
              {[32, 35, 38, 40].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => void updateThresholds(val, settings.minTempThreshold)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-black border transition cursor-pointer ${
                    settings.maxTempThreshold === val
                      ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                      : "bg-background text-foreground hover:bg-muted"
                  }`}
                >
                  <span dir="ltr">{val}°</span>
                </button>
              ))}
            </div>
          </div>

          {/* Bloc B : Température Basse / Gel */}
          <div className="rounded-2xl border border-sky-500/30 bg-sky-500/[0.05] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-black text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
                <Snowflake className="h-4 w-4 shrink-0" />
                <span>{isAr ? "تنبيه البرودة / الصقيع (≤ °م)" : "Alerte Basse / Gel (≤ °C)"}</span>
              </span>
              <span dir="ltr" className="text-sm font-black text-sky-600">
                ≤ {settings.minTempThreshold}°C
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <Input
                type="number"
                dir="ltr"
                min={-15}
                max={15}
                step={1}
                value={settings.minTempThreshold}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (!Number.isNaN(v)) void updateThresholds(settings.maxTempThreshold, v);
                }}
                className="h-9 font-black text-sm w-20 rounded-xl bg-background"
              />
              {[-2, 0, 2, 4].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => void updateThresholds(settings.maxTempThreshold, val)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-black border transition cursor-pointer ${
                    settings.minTempThreshold === val
                      ? "bg-sky-600 text-white border-sky-600 shadow-xs"
                      : "bg-background text-foreground hover:bg-muted"
                  }`}
                >
                  <span dir="ltr">{val}°</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 2. Liste dynamique Multi-Contacts */}
        <div className="space-y-2.5 pt-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-black text-foreground flex items-center gap-1.5">
              <Users className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                {isAr
                  ? `جهات اتصال التنبيه (${settings.contacts.length})`
                  : `Contacts d'alerte (${settings.contacts.length})`}
              </span>
            </h3>
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void handleImportFarmMembers()}
                disabled={importing}
                className="h-8 rounded-xl text-[11px] font-bold gap-1"
              >
                <Users className="h-3.5 w-3.5" />
                <span>{isAr ? "استيراد أعضاء المزرعة" : "Importer membres"}</span>
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={openAddForm}
                className="h-8 rounded-xl text-[11px] font-bold gap-1 bg-emerald-700 hover:bg-emerald-800 text-white"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{isAr ? "إضافة جهة اتصال" : "Ajouter un contact"}</span>
              </Button>
            </div>
          </div>

          {/* Formulaire Ajout / Modification Contact */}
          {formOpen && (
            <div className="rounded-2xl border-2 border-emerald-600/30 bg-muted/40 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-black text-foreground">
                  {editingId
                    ? isAr ? "تعديل جهة الاتصال" : "Modifier le contact"
                    : isAr ? "جهة اتصال جديدة" : "Nouveau contact d'alerte"}
                </span>
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted-foreground block">
                    {isAr ? "الاسم *" : "Nom *"}
                  </label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder={isAr ? "مثال: عبد الرحمان / زينب" : "Ex: Abderrahmane, Zeinab"}
                    className="h-9 text-xs rounded-xl bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted-foreground block">
                    {isAr ? "الدور" : "Rôle"}
                  </label>
                  <Input
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    placeholder={isAr ? "مدير / مهندس / منفذ" : "Admin / Ingénieur / Exécutant"}
                    className="h-9 text-xs rounded-xl bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted-foreground block">
                    {isAr ? "رقم الهاتف (واتساب)" : "Téléphone (+213...)"}
                  </label>
                  <Input
                    dir="ltr"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+213555123456"
                    className="h-9 text-xs rounded-xl bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted-foreground block">
                    {isAr ? "مفتاح CallMeBot (اختياري)" : "Clé API CallMeBot (optionnel)"}
                  </label>
                  <Input
                    dir="ltr"
                    value={form.callmebotKey}
                    onChange={(e) => setForm({ ...form, callmebotKey: e.target.value })}
                    placeholder="1234567"
                    className="h-9 text-xs rounded-xl bg-background"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[11px] font-bold text-muted-foreground block">
                    {isAr ? "البريد الإلكتروني (اختياري)" : "E-mail (optionnel, réel uniquement)"}
                  </label>
                  <Input
                    type="email"
                    dir="ltr"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="fermemalek@gmail.com"
                    className="h-9 text-xs rounded-xl bg-background"
                  />
                </div>
              </div>

              {/* Choix des canaux par contact */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-muted-foreground block">
                  {isAr ? "قنوات التنبيه لهذا الشخص :" : "Canaux d'alerte :"}
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: "apk" as const, icon: BellRing, label: isAr ? "إشعار APK" : "Notification APK" },
                    { key: "whatsapp" as const, icon: MessageCircle, label: "WhatsApp" },
                    { key: "email" as const, icon: Mail, label: isAr ? "بريد إلكتروني" : "E-mail" },
                  ].map(({ key, icon: Icon, label }) => {
                    const active = form.channels[key];
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            channels: { ...form.channels, [key]: !active },
                          })
                        }
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                          active
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-border bg-background text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setFormOpen(false)} className="rounded-xl h-8 text-xs">
                  {isAr ? "إلغاء" : "Annuler"}
                </Button>
                <Button type="button" size="sm" onClick={() => void handleSaveContact()} className="rounded-xl h-8 text-xs gap-1 bg-emerald-700 hover:bg-emerald-800 text-white">
                  <Check className="h-3.5 w-3.5" />
                  <span>{isAr ? "حفظ" : "Enregistrer"}</span>
                </Button>
              </div>
            </div>
          )}

          {/* Liste des contacts */}
          {settings.contacts.length === 0 ? (
            <div className="rounded-xl border border-dashed p-4 text-center text-muted-foreground">
              {isAr
                ? "لا توجد جهات اتصال بعد. أضف جهة اتصال أو استورد أعضاء المزرعة لتفعيل البريد وواتساب التلقائي."
                : "Aucun contact configuré. Ajoutez un contact ou importez les membres de la ferme pour recevoir les alertes E-mail & WhatsApp."}
            </div>
          ) : (
            <div className="space-y-2">
              {settings.contacts.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border bg-background/80 p-3"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-black text-foreground">{c.name}</span>
                      {c.role && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                          {c.role}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                      {c.phone && <span dir="ltr">{c.phone}</span>}
                      {c.email && <span dir="ltr" className="break-all">{c.email}</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-1 pt-0.5">
                      {c.channels.apk && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 text-red-700 dark:text-red-300 px-2 py-0.5 text-[10px] font-bold">
                          <BellRing className="h-2.5 w-2.5" /> APK
                        </span>
                      )}
                      {c.channels.whatsapp && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold">
                          <MessageCircle className="h-2.5 w-2.5" />
                          {c.callmebotKey ? "WhatsApp Auto" : "WhatsApp"}
                        </span>
                      )}
                      {c.channels.email && c.email && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300 px-2 py-0.5 text-[10px] font-bold">
                          <Mail className="h-2.5 w-2.5" /> E-mail
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {c.phone && (
                      <button
                        type="button"
                        onClick={() => handleWhatsAppFallback(c)}
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-emerald-600/30 bg-emerald-500/10 px-2 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 cursor-pointer"
                        title={isAr ? "مشاركة عبر واتساب" : "Partager via WhatsApp (wa.me)"}
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>wa.me</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openEditForm(c)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                      title={isAr ? "تعديل" : "Modifier"}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteContact(c.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 cursor-pointer"
                      title={isAr ? "حذف" : "Supprimer"}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. Boutons de test immédiat (Chaleur & Gel) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t">
          <Button
            type="button"
            size="sm"
            disabled={testingKind !== null}
            onClick={() => void handleTest("heat")}
            className="h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs gap-1.5"
          >
            <Send className="h-3.5 w-3.5 shrink-0" />
            <span>
              {testingKind === "heat"
                ? isAr ? "جارٍ الإرسال..." : "Envoi..."
                : isAr ? "🔥 اختبار تنبيه الحرارة الآن" : "🔥 Tester Alerte Chaleur"}
            </span>
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={testingKind !== null}
            onClick={() => void handleTest("frost")}
            className="h-10 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs gap-1.5"
          >
            <Send className="h-3.5 w-3.5 shrink-0" />
            <span>
              {testingKind === "frost"
                ? isAr ? "جارٍ الإرسال..." : "Envoi..."
                : isAr ? "🥶 اختبار تنبيه الصقيع الآن" : "🥶 Tester Alerte Gel"}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
