import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Trash2, ListTodo, Check, X, Home, Leaf, Apple, Settings, Bell, Volume2, VolumeX, Mail, MessageSquare } from "lucide-react";
import {
  useTasks,
  useTaskActions,
  useExecutants,
  type TaskPriority,
  type TaskKind,
  type CloudTask,
} from "@/lib/cloud/tasks";
import { useParcels } from "@/lib/parcel-store";
import { useRole } from "@/lib/role";
import {
  ListPageShell,
  ProgramFiltersBar,
  matchesFilters,
  useFilters,
  useYearsFromDates,
} from "@/components/programs/ProgramFiltersBar";

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  basse: "Basse",
  normale: "Normale",
  haute: "Haute",
  urgente: "Urgente",
};

const KIND_LABEL: Record<TaskKind, string> = {
  generale: "Générale",
  irrigation: "Irrigation",
  fertilisation: "Fertilisation",
  pulverisation: "Pulvérisation",
  maintenance: "Maintenance",
  recolte: "Récolte",
  correction_anomalie: "Correction anomalie",
};

function TachePage() {
  const { data: tasks = [] } = useTasks();
  const { data: executants = [] } = useExecutants();
  const parcels = useParcels();
  const { create, markDone, reject, remove } = useTaskActions();
  const { isAdmin } = useRole();

  const [filters, setFilters] = useFilters();
  const [selectedSpecies, setSelectedSpecies] = useState<'all' | 'olivier' | 'pommier' | 'nectarine'>('all');
  
  // Notification states
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [audioAlertsActive, setAudioAlertsActive] = useState(true);

  // Web Audio synthesizer beep
  const playNotificationSound = (type: 'info' | 'alarm') => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      if (type === 'alarm') {
        const playBeep = (delay: number, freq: number, duration: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
          gain.gain.setValueAtTime(0, ctx.currentTime + delay);
          gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + delay + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
          osc.start(ctx.currentTime + delay);
          osc.stop(ctx.currentTime + delay + duration);
        };
        // Triple alarm beep
        playBeep(0, 987.77, 0.12);
        playBeep(0.18, 987.77, 0.12);
        playBeep(0.36, 987.77, 0.3);
      } else {
        // Soft double tone
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        osc1.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc1.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 0.4);
        osc2.start(ctx.currentTime + 0.08);
        osc2.stop(ctx.currentTime + 0.4);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getTaskStatusInfo = (dueDateStr: string | null, status: string) => {
    if (!dueDateStr || status === "fait" || status === "annule") {
      return { urgent: false, overdue: false, message: "" };
    }
    const due = new Date(dueDateStr).getTime();
    const now = new Date().getTime();
    const diffTime = due - now;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    if (diffTime < 0) {
      const days = Math.abs(Math.floor(diffDays));
      return {
        urgent: true,
        overdue: true,
        message: days === 0 ? "⚠️ Retard: Échéance aujourd'hui !" : `⚠️ Retard: Dépassé de ${days} jour(s)`,
      };
    } else if (diffDays <= 2) {
      const hours = Math.round(diffTime / (1000 * 60 * 60));
      return {
        urgent: true,
        overdue: false,
        message: hours <= 24 ? `🔔 Échéance imminente: dans ${hours} h` : `🔔 Proche: dans 2 jours`,
      };
    }
    return { urgent: false, overdue: false, message: "" };
  };

  const dates = tasks.map((t) => (t.due_date ?? t.created_at).slice(0, 10));
  const years = useYearsFromDates(dates);
  const [open, setOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueTime, setDueTime] = useState("12:00");
  const [reminderAdvance, setReminderAdvance] = useState<"none" | "1h" | "2h" | "1d" | "1w">("none");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("normale");
  const [kind, setKind] = useState<TaskKind>("generale");
  const [parcelId, setParcelId] = useState("");
  const [assignedToIds, setAssignedToIds] = useState<string[]>([]);

  function toggleAssign(id: string) {
    setAssignedToIds((arr) =>
      arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id],
    );
  }

  function reset() {
    setTitle("");
    setDescription("");
    setPriority("normale");
    setKind("generale");
    setParcelId("");
    setAssignedToIds([]);
    setDueTime("12:00");
    setReminderAdvance("none");
  }
  async function save() {
    if (!title.trim() || assignedToIds.length === 0) return;
    try {
      const advanceLabels: Record<string, string> = {
        '1h': '1 heure avant',
        '2h': '2 heures avant',
        '1d': '1 jour avant',
        '1w': '1 semaine avant',
      };
      const advancePrefix = reminderAdvance !== 'none' ? `[Rappel: ${advanceLabels[reminderAdvance]}] ` : '';
      const finalDesc = advancePrefix + (description.trim() || '');

      for (const uid of assignedToIds) {
        await create.mutateAsync({
          title: title.trim(),
          description: finalDesc || null,
          priority,
          kind,
          due_date: dueDate ? new Date(dueDate + "T" + (dueTime || "12:00") + ":00").toISOString() : null,
          parcel_id: parcelId || null,
          assigned_to: uid,
        });
      }
      toast.success(
        assignedToIds.length === 1
          ? "Tâche créée et assignée"
          : `Tâche assignée à ${assignedToIds.length} exécutants`,
      );
      reset();
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const filtered = tasks
    .filter((t) => {
      const dateStr = (t.due_date ?? t.created_at).slice(0, 10);
      return matchesFilters(dateStr, t.parcel_id ?? "", filters);
    })
    .filter((t) => {
      if (selectedSpecies === 'all') return true;
      const parcel = parcels.find(p => p.id === t.parcel_id);
      return parcel?.type === selectedSpecies;
    })
    .filter((t) =>
      showArchived
        ? t.status === "fait" || t.status === "annule"
        : t.status === "a_faire" || t.status === "en_cours",
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const exName = (id: string | null) =>
    executants.find((e) => e.id === id)?.name ?? "—";

  function onReject(t: CloudTask) {
    const reason = window.prompt("Motif du rejet ?");
    if (!reason) return;
    reject.mutate(
      { id: t.id, reason },
      {
        onSuccess: () => toast.success("Tâche renvoyée à l'exécutant"),
        onError: (e) => toast.error(e.message),
      },
    );
  }

  const countAll = tasks.filter(t => t.status === "a_faire" || t.status === "en_cours").length;
  const countOlivier = tasks.filter(t => (t.status === "a_faire" || t.status === "en_cours") && parcels.find(p => p.id === t.parcel_id)?.type === 'olivier').length;
  const countPommier = tasks.filter(t => (t.status === "a_faire" || t.status === "en_cours") && parcels.find(p => p.id === t.parcel_id)?.type === 'pommier').length;
  const countNectarine = tasks.filter(t => (t.status === "a_faire" || t.status === "en_cours") && parcels.find(p => p.id === t.parcel_id)?.type === 'nectarine').length;

  const hasUrgent = tasks.some(t => {
    const info = getTaskStatusInfo(t.due_date, t.status);
    return info.urgent;
  });

  const handleSendTestNotification = () => {
    if (!whatsappEnabled && !emailEnabled) {
      toast.error("Veuillez activer au moins un canal de notification (WhatsApp ou E-mail) pour tester.");
      return;
    }

    if (whatsappEnabled && !whatsappNumber.trim()) {
      toast.error("Veuillez saisir un numéro de téléphone WhatsApp valide.");
      return;
    }

    if (emailEnabled && !emailAddress.trim()) {
      toast.error("Veuillez saisir une adresse e-mail valide.");
      return;
    }

    setSendingTest(true);
    playNotificationSound('info');

    if (whatsappEnabled) {
      // Au cas où la chaîne contient encore un "|" (ex: email|tel), ne garder que la partie téléphone
      const rawPhonePart = whatsappNumber.includes("|")
        ? whatsappNumber.split("|")[1] || whatsappNumber
        : whatsappNumber;
      const digitsOnly = rawPhonePart.replace(/\D/g, "");
      const finalPhone =
        digitsOnly.length === 10 && digitsOnly.startsWith("0")
          ? `213${digitsOnly.slice(1)}`
          : digitsOnly;

      if (!finalPhone) {
        toast.error("Numéro de téléphone WhatsApp invalide.");
        setSendingTest(false);
        return;
      }

      const text = encodeURIComponent(
        "Test de rappel Doula Agro : Votre système de notifications et d'alarmes fonctionne avec succès ! 🌱🔊",
      );
      const waUrl = `https://wa.me/${finalPhone}?text=${text}`;
      window.open(waUrl, "_blank", "noopener,noreferrer");
      toast.success(`WhatsApp ouvert vers le ${rawPhonePart.trim()} !`);
    }

    if (emailEnabled) {
      const cleanEmail = (
        emailAddress.includes("|") ? emailAddress.split("|")[0] : emailAddress
      ).trim();
      const subject = encodeURIComponent("Test de rappel - Doula Agro");
      const body = encodeURIComponent(
        "Bonjour,\n\nCeci est un test de liaison de votre système de notifications et de rappels de la ferme Doula Agro.\n\nCordialement,\nL'équipe Doula Agro 🌱",
      );
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile) {
        window.location.href = `mailto:${cleanEmail}?subject=${subject}&body=${body}`;
      } else {
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(cleanEmail)}&su=${subject}&body=${body}`;
        window.open(gmailUrl, "_blank", "noopener,noreferrer");
      }
      toast.success(`Messagerie e-mail ouverte pour ${cleanEmail} !`);
    }

    setTimeout(() => setSendingTest(false), 600);
  };

  return (
    <ListPageShell title="Tâches">
      {/* Premium Species Buttons Interface */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            🌱 Gestionnaire par Espèce & Secteur
          </h2>
          <div className="flex items-center gap-2">
            {/* Audio alarm controller */}
            <button
              onClick={() => {
                const newActive = !audioAlertsActive;
                setAudioAlertsActive(newActive);
                if (newActive) {
                  playNotificationSound('info');
                  toast.success("Alarmes sonores activées 🔊");
                } else {
                  toast.success("Alarmes sonores désactivées 🔇");
                }
              }}
              className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-all ${
                audioAlertsActive
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                  : "bg-muted border-muted-foreground/20 text-muted-foreground hover:bg-muted/80"
              }`}
              title="Activer/Désactiver les alertes sonores de rappel"
            >
              {audioAlertsActive ? (
                <>
                  <Volume2 className="h-3.5 w-3.5 text-emerald-500 animate-bounce" />
                  <span>Son Actif</span>
                </>
              ) : (
                <>
                  <VolumeX className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Son Muet</span>
                </>
              )}
            </button>

            {/* Notification settings toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowSettings(!showSettings);
                playNotificationSound('info');
              }}
              className={`h-7 px-2.5 rounded-full text-xs transition-all ${
                showSettings ? "bg-primary text-primary-foreground border-primary" : ""
              }`}
            >
              <Settings className="h-3.5 w-3.5 mr-1" />
              Rappels Externes
            </Button>
          </div>
        </div>

        {/* Beautiful Glassmorphic Grid of Buttons */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Button: Toute la ferme */}
          <button
            onClick={() => {
              setSelectedSpecies('all');
              playNotificationSound('info');
            }}
            className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all duration-300 transform hover:-translate-y-0.5 ${
              selectedSpecies === 'all'
                ? "border-primary bg-primary/5 shadow-[0_4px_20px_rgba(99,102,241,0.15)] ring-1 ring-primary/20"
                : "border-border bg-card hover:bg-muted/40"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl transition-all duration-300 ${
                selectedSpecies === 'all' ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
              }`}>
                <Home className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Toute la Ferme</p>
                <p className="text-[10px] text-muted-foreground">Toutes les parcelles</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {countAll > 0 && selectedSpecies === 'all' && (
                <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
              )}
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                selectedSpecies === 'all' ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
              }`}>{countAll}</span>
            </div>
          </button>

          {/* Button: Oliviers */}
          <button
            onClick={() => {
              setSelectedSpecies('olivier');
              playNotificationSound('info');
            }}
            className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all duration-300 transform hover:-translate-y-0.5 ${
              selectedSpecies === 'olivier'
                ? "border-lime-600 bg-lime-500/5 shadow-[0_4px_20px_rgba(132,204,22,0.15)] ring-1 ring-lime-500/20"
                : "border-border bg-card hover:bg-muted/40"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl transition-all duration-300 ${
                selectedSpecies === 'olivier' ? "bg-lime-500/20 text-lime-600 dark:text-lime-400" : "bg-muted text-muted-foreground"
              }`}>
                <Leaf className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground font-arabic">Oliviers / زيتون</p>
                <p className="text-[10px] text-muted-foreground">Parcelles d'oliviers</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {countOlivier > 0 && selectedSpecies === 'olivier' && (
                <span className="h-2 w-2 rounded-full bg-lime-500 animate-ping" />
              )}
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                selectedSpecies === 'olivier' ? "bg-lime-500/20 text-lime-700 dark:text-lime-300" : "bg-muted text-muted-foreground"
              }`}>{countOlivier}</span>
            </div>
          </button>

          {/* Button: Pommiers */}
          <button
            onClick={() => {
              setSelectedSpecies('pommier');
              playNotificationSound('info');
            }}
            className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all duration-300 transform hover:-translate-y-0.5 ${
              selectedSpecies === 'pommier'
                ? "border-rose-600 bg-rose-500/5 shadow-[0_4px_20px_rgba(244,63,94,0.15)] ring-1 ring-rose-500/20"
                : "border-border bg-card hover:bg-muted/40"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl transition-all duration-300 ${
                selectedSpecies === 'pommier' ? "bg-rose-500/20 text-rose-600 dark:text-rose-400" : "bg-muted text-muted-foreground"
              }`}>
                <Apple className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground font-arabic">Pommiers / تفاح</p>
                <p className="text-[10px] text-muted-foreground">Parcelles de pommiers</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {countPommier > 0 && selectedSpecies === 'pommier' && (
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
              )}
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                selectedSpecies === 'pommier' ? "bg-rose-500/20 text-rose-700 dark:text-rose-300" : "bg-muted text-muted-foreground"
              }`}>{countPommier}</span>
            </div>
          </button>

          {/* Button: Nectariniers */}
          <button
            onClick={() => {
              setSelectedSpecies('nectarine');
              playNotificationSound('info');
            }}
            className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all duration-300 transform hover:-translate-y-0.5 ${
              selectedSpecies === 'nectarine'
                ? "border-amber-600 bg-amber-500/5 shadow-[0_4px_20px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/20"
                : "border-border bg-card hover:bg-muted/40"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl transition-all duration-300 ${
                selectedSpecies === 'nectarine' ? "bg-amber-500/20 text-amber-600 dark:text-amber-400" : "bg-muted text-muted-foreground"
              }`}>
                <Leaf className="h-5 w-5 rotate-90 text-amber-500" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground font-arabic">Nectariniers / خوch</p>
                <p className="text-[10px] text-muted-foreground">Parcelles nectarines</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {countNectarine > 0 && selectedSpecies === 'nectarine' && (
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
              )}
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                selectedSpecies === 'nectarine' ? "bg-amber-500/20 text-amber-700 dark:text-amber-300" : "bg-muted text-muted-foreground"
              }`}>{countNectarine}</span>
            </div>
          </button>
        </div>
      </div>

      {/* External Notifications & Alerts settings panel */}
      {showSettings && (
        <Card className="p-5 border-primary/30 bg-primary/[0.02] shadow-sm mb-6 space-y-4 rounded-2xl">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-sm text-primary flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary animate-pulse" />
                Rappels de Secours (WhatsApp & E-mail)
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Configurez la réception de notifications externes. Utile si l'application est fermée ou en cas de dysfonctionnement du navigateur.
              </p>
            </div>
            <button
              onClick={() => setShowSettings(false)}
              className="text-muted-foreground hover:text-foreground rounded p-1 hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* User Dropdown Selector */}
            <div className="md:col-span-2 space-y-1.5 p-3.5 rounded-xl border bg-card/50">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                👤 Préremplir avec les coordonnées d'un exécutant :
              </label>
              <select
                onChange={(e) => {
                  const execId = e.target.value;
                  if (!execId) return;
                  const exec = executants.find(ex => ex.id === execId);
                  if (exec) {
                    if (exec.phone) {
                      setWhatsappNumber(exec.phone);
                      setWhatsappEnabled(true);
                      toast.success(`Numéro WhatsApp de ${exec.name} chargé (${exec.phone}) !`);
                    } else {
                      setWhatsappNumber("");
                      setWhatsappEnabled(false);
                      toast.info(`${exec.name} n'a pas de numéro de téléphone configuré.`);
                    }

                    if (exec.email) {
                      setEmailAddress(exec.email);
                      setEmailEnabled(true);
                    } else {
                      setEmailAddress("");
                      setEmailEnabled(false);
                    }
                  }
                }}
                className="w-full rounded border border-input bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="">— Choisir un membre de l'équipe —</option>
                {executants.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name} ({ex.role})
                    {ex.phone ? ` · 📞 ${ex.phone}` : " · (Sans téléphone)"}
                    {ex.email ? ` · ✉️ ${ex.email}` : ""}
                  </option>
                ))}
              </select>
            </div>
            {/* WhatsApp notification field */}
            <div className="space-y-2 p-3.5 rounded-xl border bg-card">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                  <MessageSquare className="h-4 w-4 text-emerald-500" />
                  Alertes par WhatsApp
                </label>
                <input
                  type="checkbox"
                  checked={whatsappEnabled}
                  onChange={(e) => setWhatsappEnabled(e.target.checked)}
                  className="rounded border-input text-emerald-600 focus:ring-emerald-500 cursor-pointer h-4 w-4"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">Recevez une alerte sonore et textuelle sur WhatsApp avant l'échéance.</p>
              <Input
                type="tel"
                disabled={!whatsappEnabled}
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="Ex: +213 555 123 456"
                className="h-8 text-xs font-mono"
              />
            </div>

            {/* Email notification field */}
            <div className="space-y-2 p-3.5 rounded-xl border bg-card">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                  <Mail className="h-4 w-4 text-sky-500" />
                  Alertes par E-mail
                </label>
                <input
                  type="checkbox"
                  checked={emailEnabled}
                  onChange={(e) => setEmailEnabled(e.target.checked)}
                  className="rounded border-input text-sky-600 focus:ring-sky-500 cursor-pointer h-4 w-4"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">Recevez un rapport d'alerte détaillé sur votre messagerie.</p>
              <Input
                type="email"
                disabled={!emailEnabled}
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                placeholder="Ex: producteur@ferme.com"
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendTestNotification}
              disabled={sendingTest}
              className="h-8 text-xs"
            >
              {sendingTest ? "Envoi du test en cours..." : "Tester la liaison de rappel"}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                toast.success("Paramètres de rappel enregistrés !");
                setShowSettings(false);
              }}
              className="h-8 text-xs"
            >
              Enregistrer
            </Button>
          </div>
        </Card>
      )}

      <div className="flex justify-between gap-2">
        <div className="flex gap-1 rounded-md bg-muted p-0.5">
          <button
            onClick={() => setShowArchived(false)}
            className={`rounded px-3 py-1 text-xs font-medium ${
              !showArchived ? "bg-background shadow text-foreground" : "text-muted-foreground"
            }`}
          >
            En cours
          </button>
          <button
            onClick={() => setShowArchived(true)}
            className={`rounded px-3 py-1 text-xs font-medium ${
              showArchived ? "bg-background shadow text-foreground" : "text-muted-foreground"
            }`}
          >
            Archivées
          </button>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setOpen((v) => !v)}>
            <Plus className="h-4 w-4 mr-1" /> {open ? "Annuler" : "Ajouter une tâche"}
          </Button>
        )}
      </div>

      {open && (
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold text-sm">Nouvelle tâche</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">Titre *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Tailler les oliviers" />
            </div>
            <div>
              <Label className="text-xs">Échéance *</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Heure d'échéance</Label>
              <Input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Rappel anticipé</Label>
              <select
                className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                value={reminderAdvance}
                onChange={(e) => setReminderAdvance(e.target.value as any)}
              >
                <option value="none">Pas de rappel anticipé</option>
                <option value="1h">1 heure avant</option>
                <option value="2h">2 heures avant</option>
                <option value="1d">1 jour avant</option>
                <option value="1w">1 semaine avant</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Nature</Label>
              <select
                className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                value={kind}
                onChange={(e) => setKind(e.target.value as TaskKind)}
              >
                {(Object.keys(KIND_LABEL) as TaskKind[]).map((k) => (
                  <option key={k} value={k}>{KIND_LABEL[k]}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Priorité</Label>
              <select
                className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
              >
                {(Object.keys(PRIORITY_LABEL) as TaskPriority[]).map((p) => (
                  <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <Label className="text-xs">
                Assigné à * {assignedToIds.length > 0 && `(${assignedToIds.length})`}
              </Label>
              <div className="mt-1 max-h-40 space-y-1 overflow-auto rounded-md border bg-background p-2">
                {executants.length === 0 && (
                  <p className="text-xs text-muted-foreground">Aucun exécutant disponible.</p>
                )}
                {executants.map((e) => (
                  <label
                    key={e.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      checked={assignedToIds.includes(e.id)}
                      onChange={() => toggleAssign(e.id)}
                    />
                    <span className="truncate">
                      {e.name} <span className="text-xs text-muted-foreground">({e.role})</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Description</Label>
              <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Parcelle (optionnel)</Label>
              <select
                className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                value={parcelId}
                onChange={(e) => setParcelId(e.target.value)}
              >
                <option value="">—</option>
                {parcels.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
          <Button
            onClick={save}
            disabled={!title.trim() || assignedToIds.length === 0 || create.isPending}
            className="w-full"
          >
            {create.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </Card>
      )}

      <ProgramFiltersBar value={filters} onChange={setFilters} years={years} />

      {filtered.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          {showArchived ? "Aucune tâche archivée." : "Aucune tâche en cours."}
        </Card>
      ) : (
        <ul className="space-y-2">
          {filtered.map((t) => {
            const parcel = parcels.find((p) => p.id === t.parcel_id);
            const isDone = t.status === "fait";
            const statusInfo = getTaskStatusInfo(t.due_date, t.status);

            // Auto-trigger audible alarm if enabled and task is urgent
            if (audioAlertsActive && statusInfo.urgent && !isDone) {
              // Throttle audio plays
              const lastPlayed = (window as any).lastAlarmPlayed || 0;
              const now = Date.now();
              if (now - lastPlayed > 30000) { // Max once every 30 seconds
                (window as any).lastAlarmPlayed = now;
                playNotificationSound('alarm');
              }
            }

            return (
              <li key={t.id} className="relative group">
                <Card className={`p-3.5 flex items-start gap-3 transition-all duration-300 ${
                  isDone ? "opacity-70 bg-muted/20" 
                  : statusInfo.overdue ? "border-destructive/60 bg-destructive/[0.02] shadow-[0_0_12px_rgba(239,68,68,0.12)] ring-1 ring-destructive/20"
                  : statusInfo.urgent ? "border-amber-500/60 bg-amber-500/[0.02] shadow-[0_0_12px_rgba(245,158,11,0.12)] ring-1 ring-amber-500/20"
                  : "hover:border-primary/40"
                }`}>
                  <div className={`rounded-xl p-2 mt-0.5 transition-all ${
                    statusInfo.overdue ? "bg-destructive/15 text-destructive animate-pulse"
                    : statusInfo.urgent ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 animate-bounce"
                    : "bg-primary/10 text-primary"
                  }`}>
                    <ListTodo className="h-4.5 w-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold truncate ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>
                          {t.title}
                        </span>
                        {/* Species badge indicator */}
                        {parcel && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                            parcel.type === 'olivier' ? 'bg-lime-500/15 text-lime-700 dark:text-lime-400'
                            : parcel.type === 'pommier' ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400'
                            : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                          }`}>
                            {parcel.type === 'olivier' ? 'Olivier' : parcel.type === 'pommier' ? 'Pommier' : 'Nectarinier'}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        {statusInfo.urgent && !isDone && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse ${
                            statusInfo.overdue ? "bg-destructive text-destructive-foreground" : "bg-amber-500 text-amber-950"
                          }`}>
                            <Bell className="h-3 w-3 animate-bounce" />
                            {statusInfo.message}
                          </span>
                        )}
                        <span className={`text-[10px] uppercase font-bold rounded px-1.5 py-0.5 ${
                          t.priority === "urgente" ? "bg-destructive/20 text-destructive border border-destructive/30"
                          : t.priority === "haute" ? "bg-destructive/10 text-destructive"
                          : t.priority === "normale" ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                          : "bg-muted text-muted-foreground"
                        }`}>{PRIORITY_LABEL[t.priority]}</span>
                      </div>
                    </div>
                    {t.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>
                    )}
                    <div className="text-xs text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                      {t.due_date && (
                        <span className={`flex items-center gap-1 font-medium ${statusInfo.overdue ? "text-destructive" : ""}`}>
                          📅 {new Date(t.due_date).toLocaleDateString("fr-FR")}
                        </span>
                      )}
                      <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono">{KIND_LABEL[t.kind]}</span>
                      {parcel && <span className="text-foreground/80">🌳 {parcel.name}</span>}
                      <span>👤 {exName(t.assigned_to)}</span>
                      <span className={`rounded px-1.5 py-0.2 text-[10px] font-bold ${
                        t.status === "fait" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : t.status === "en_cours" ? "bg-sky-500/15 text-sky-700 dark:text-sky-300"
                        : "bg-muted text-muted-foreground"
                      }`}>{t.status === 'a_faire' ? 'À faire' : t.status === 'en_cours' ? 'En cours' : t.status}</span>

                      {/* Manual sound trigger for demo/test purposes */}
                      {statusInfo.urgent && !isDone && (
                        <button
                          onClick={() => playNotificationSound('alarm')}
                          className="text-[10px] text-primary hover:underline flex items-center gap-0.5 ml-auto font-semibold"
                          title="Tester le signal sonore de rappel"
                        >
                          🔊 Écouter l'alarme
                        </button>
                      )}
                    </div>
                    {t.reject_reason && (
                      <p className="mt-1 text-[11px] text-destructive">Rejet : {t.reject_reason}</p>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex flex-col gap-1">
                      {t.status === "fait" && (
                        <button
                          onClick={() => onReject(t)}
                          title="Rejeter et renvoyer"
                          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                      {!isDone && t.status !== "annule" && (
                        <button
                          onClick={() => markDone.mutate(t.id)}
                          title="Marquer fait"
                          className="rounded p-1 text-emerald-700 hover:bg-emerald-500/10"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => remove.mutate(t.id)}
                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </ListPageShell>
  );
}

export default TachePage;
