import { useState, useEffect, useRef } from "react";
import { Play, Pause, FastForward, Check, Volume2, VolumeX, AlertTriangle, RefreshCw, Sparkles, X, Camera, Info, Timer } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { captureWeatherSnapshot } from "@/lib/weather-snapshot";
import { uploadExecutionPhotos, useCreateExecution } from "@/lib/cloud/executions";
import { useProgramActions } from "@/lib/cloud/programs";
import { Capacitor } from "@capacitor/core";
import { TextToSpeech } from "@capacitor-community/text-to-speech";
import { LocalNotifications } from "@capacitor/local-notifications";
import { useModuleActions } from "@/lib/modules-store";
function parseLocaleFloat(val: any): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === "number") return val;
  const cleaned = val.toString().replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}
interface FertilizerItem {
  name: string;
  unit: "kg" | "litres";
  qty: string;
  price: string;
  solubility: number;
  time: number; // mixing time in minutes
  note: string;
}

interface BacEntry {
  bac: "A" | "B" | "C" | "D";
  items: FertilizerItem[];
}

interface ProgramPayload {
  date: string;
  hectares: number;
  frequency: number;
  entries: BacEntry[];
  total: number;
}

interface CloudProgram {
  id: string;
  parcel_id: string;
  kind: "fertilisation";
  payload: Record<string, any>;
  total_cost: number;
  scheduled_at: string | null;
}

interface Props {
  program: CloudProgram | null;
  onOpenChange: (open: boolean) => void;
  parcelName?: string;
}

export function FertilisationExecutionAssistant({ program, onOpenChange, parcelName }: Props) {
  const [activeStep, setActiveStep] = useState<"intro" | "execution" | "validation">("intro");
  
  // Audio state
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  
  // Execution tracking state
  const [bacsToPrepare, setBacsToPrepare] = useState<BacEntry[]>([]);
  const [activeBacIdx, setActiveBacIdx] = useState(0);
  const [activeProductIdx, setActiveProductIdx] = useState(-1); // -1 = initial water step
  
  // Timer state
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  const [totalTimerTime, setTotalTimerTime] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  
  // Final validation state
  const [duration, setDuration] = useState("");
  const [comment, setComment] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });
  
  const fileRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const createExecution = useCreateExecution();
  const { markExecuted } = useProgramActions();
  const { update: updateLocalModuleRecord } = useModuleActions();

  const activeBac = bacsToPrepare[activeBacIdx];
  const activeProduct = activeBac && activeProductIdx >= 0 ? activeBac.items[activeProductIdx] : null;

  // Helper to calculate total water needed for a Bac taking into account solubility and safety margin
  const getBacTotalWater = (bac: BacEntry) => {
    if (!bac) return 0;
    return bac.items.reduce((sum, it) => {
      if (it.solubility > 0 && it.solubility <= 4000) {
        const doseTotale = parseLocaleFloat(it.qty) * (program?.payload.hectares || 1);
        return sum + Math.ceil((doseTotale * 100 / it.solubility) * 1.5);
      }
      return sum;
    }, 0);
  };

  // Load and parse bacs from program payload
  useEffect(() => {
    if (program && program.payload) {
      const payload = program.payload as unknown as ProgramPayload;
      const validBacs = (payload.entries || [])
        .filter(entry => entry.items && entry.items.length > 0)
        .map(entry => ({
          ...entry,
          items: [...entry.items].sort((a, b) => (b.time || 0) - (a.time || 0))
        }));
      setBacsToPrepare(validBacs);
      setActiveBacIdx(0);
      setActiveProductIdx(-1);
      setActiveStep("intro");
      setDuration("");
      setComment("");
      setFiles([]);
      setTimerRunning(false);
      setTimeLeft(0);
    }
  }, [program]);

  // Helper to cancel the agitator notification
  const cancelTimerNotification = async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await LocalNotifications.cancel({ notifications: [{ id: 9999 }] });
    } catch (e) {
      console.warn("Failed to cancel local notification", e);
    }
  };

  // Helper to schedule the agitator notification
  const scheduleTimerNotification = async (seconds: number) => {
    if (!Capacitor.isNativePlatform() || !activeProduct) return;
    try {
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== "granted") {
        await LocalNotifications.requestPermissions();
      }
      await LocalNotifications.cancel({ notifications: [{ id: 9999 }] });
      const cleanName = activeProduct.name.split("/")[0].trim();
      await LocalNotifications.schedule({
        notifications: [
          {
            title: "Mélange terminé !",
            body: `Le temps d'agitation pour le produit ${cleanName} est écoulé.`,
            id: 9999,
            schedule: { at: new Date(Date.now() + seconds * 1000), allowWhileIdle: true },
            sound: "default",
          }
        ]
      });
    } catch (e) {
      console.warn("Failed to schedule local notification", e);
    }
  };

  // Clean timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      cancelTimerNotification();
      if (Capacitor.isNativePlatform()) {
        TextToSpeech.stop().catch(() => {});
      } else if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [activeProduct]);

  // Timer logic
  useEffect(() => {
    if (timerRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setTimerRunning(false);
            onTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning, timeLeft]);

  // Synthesize sound using Web Audio API
  const playSoundAlert = (type: "beep" | "success") => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      if (type === "beep") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === "success") {
        // Play a nice double chime
        const now = ctx.currentTime;
        [523.25, 659.25, 783.99].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, now + idx * 0.1);
          gain.gain.setValueAtTime(0.15, now + idx * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.1 + 0.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.1);
          osc.stop(now + idx * 0.1 + 0.4);
        });
      }
    } catch (e) {
      console.warn("Web Audio API not allowed or supported", e);
    }
  };

  // TTS Voice alert
  const speakText = (text: string) => {
    if (!voiceEnabled) return;

    if (Capacitor.isNativePlatform()) {
      TextToSpeech.stop()
        .then(() => {
          TextToSpeech.speak({
            text,
            lang: 'fr-FR',
            rate: 1.0,
            pitch: 1.0,
            volume: 1.0,
            category: 'ambient',
          });
        })
        .catch((e) => console.warn("Native TTS failed", e));
    } else {
      if (typeof window === "undefined" || !window.speechSynthesis) return;
      try {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "fr-FR";
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn("Speech Synthesis failed", e);
      }
    }
  };

  // Trigger when a timer completes
  const onTimerComplete = () => {
    playSoundAlert("success");
    if (activeProduct) {
      const cleanName = activeProduct.name.split("/")[0].trim();
      speakText(`Mélange de l'ingrédient ${cleanName} terminé. Passez à l'étape suivante.`);
      toast.success(`Mélange terminé pour ${cleanName} !`, {
        description: "Vous pouvez passer à l'étape suivante.",
      });
    }
  };

  // Launch preparation of Bacs
  const startPreparation = () => {
    setActiveStep("execution");
    setActiveBacIdx(0);
    setActiveProductIdx(-1); // Start with water step
    announceActiveStep(0, -1);
  };

  // Announce current instruction via voice
  const announceActiveStep = (bacIdx: number, prodIdx: number) => {
    const bac = bacsToPrepare[bacIdx];
    if (!bac) return;
    
    if (prodIdx === -1) {
      const totalWater = getBacTotalWater(bac);

      let msg = `Préparation du Bac ${bac.bac}. Commencez par remplir la cuve avec ${totalWater} litres d'eau initiale pour la dissolution.`;
      if (totalWater > 1000) {
        msg = `Attention ! Le volume d'eau requis de ${totalWater} litres dépasse la capacité maximale de 1000 litres de votre cuve. Vous devez fractionner cette préparation.`;
      }
      speakText(msg);
    } else {
      const prod = bac.items[prodIdx];
      const cleanName = prod.name.split("/")[0].trim();
      const totalQty = (parseLocaleFloat(prod.qty) * (program?.payload.hectares || 1)).toFixed(1);
      const unit = prod.unit === "litres" ? "litres" : "kilos";
      const mixingTime = prod.time || 5;

      const msg = `Étape suivante : Ajoutez ${totalQty} ${unit} de ${cleanName} dans le Bac ${bac.bac}. Une fois ajouté, lancez le mélange pour un délai de ${mixingTime} minutes.`;
      speakText(msg);
    }
  };

  // Handle next step progression
  const nextStep = () => {
    setTimerRunning(false);
    cancelTimerNotification();
    
    if (activeProductIdx === -1) {
      // Transition from water to first product
      setActiveProductIdx(0);
      announceActiveStep(activeBacIdx, 0);
      // Auto-set timer for product 1
      const durationMin = activeBac.items[0]?.time || 5;
      setTimeLeft(durationMin * 60);
      setTotalTimerTime(durationMin * 60);
    } else if (activeProductIdx < activeBac.items.length - 1) {
      // Transition to next product in current Bac
      const nextIdx = activeProductIdx + 1;
      setActiveProductIdx(nextIdx);
      announceActiveStep(activeBacIdx, nextIdx);
      const durationMin = activeBac.items[nextIdx]?.time || 5;
      setTimeLeft(durationMin * 60);
      setTotalTimerTime(durationMin * 60);
    } else if (activeBacIdx < bacsToPrepare.length - 1) {
      // Transition to first step of NEXT Bac
      const nextBacIdx = activeBacIdx + 1;
      setActiveBacIdx(nextBacIdx);
      setActiveProductIdx(-1);
      announceActiveStep(nextBacIdx, -1);
      setTimeLeft(0);
    } else {
      // All Bacs prepared! Go to final confirmation screen
      speakText("Félicitations, la préparation de tous les bacs de fertilisation est terminée. Renseignez la durée finale pour enregistrer le rapport.");
      setActiveStep("validation");
    }
  };

  // Timer controls
  const toggleTimer = () => {
    let secondsToRun = timeLeft;
    if (!timerRunning && timeLeft === 0 && activeProduct) {
      // Initialize timer if empty
      const durationMin = activeProduct.time || 5;
      secondsToRun = durationMin * 60;
      setTimeLeft(secondsToRun);
      setTotalTimerTime(secondsToRun);
    }
    
    const nextRunning = !timerRunning;
    setTimerRunning(nextRunning);
    playSoundAlert("beep");

    if (nextRunning) {
      scheduleTimerNotification(secondsToRun);
    } else {
      cancelTimerNotification();
    }
  };

  const skipTimer = () => {
    setTimerRunning(false);
    setTimeLeft(0);
    cancelTimerNotification();
    onTimerComplete();
  };

  // Photo handlers
  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files ? Array.from(e.target.files) : [];
    setFiles((prev) => [...prev, ...list].slice(0, 6));
    e.target.value = "";
  };

  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  // Submit final report
  const submitExecution = async () => {
    if (!program) return;
    try {
      setUploading(true);
      let photo_urls: string[] = [];
      if (files.length > 0) {
        photo_urls = await uploadExecutionPhotos(files, (done, total) =>
          setUploadProgress({ done, total })
        );
      }
      
      const weather = await captureWeatherSnapshot();

      // Submit execution record
      await createExecution.mutateAsync({
        task_id: null,
        module_record_id: program.id,
        duration_min: duration ? Math.round(parseFloat(duration)) : null,
        actual_quantity: null,
        actual_unit: null,
        comment: comment.trim() || "Préparation assistée par l'assistant agronomique V9",
        photo_urls,
        weather_snapshot: weather as unknown as Record<string, unknown>,
      });

      // Update program status to executed
      await markExecuted.mutateAsync(program.id);
      updateLocalModuleRecord(program.parcel_id, "fertilisation", program.id, { status: "execute" });

      toast.success("Programme de fertilisation validé avec succès !", {
        description: `Exécuté sur ${parcelName || "la parcelle"}`,
      });
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Une erreur est survenue");
    } finally {
      setUploading(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const open = program !== null;

  return (
    <Dialog open={open} onOpenChange={(o) => !uploading && onOpenChange(o)}>
      <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-2xl">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-olive-mid px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 animate-pulse text-yellow-300" />
            <div>
              <DialogTitle className="text-base font-black uppercase tracking-wide">
                Assistant de Fertilisation V9
              </DialogTitle>
              <p className="text-[11px] opacity-90 font-medium">
                Parcelle : <b className="underline">{parcelName || "Générale"}</b>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setVoiceEnabled(!voiceEnabled);
                speakText(voiceEnabled ? "" : "Voix activée");
              }}
              title={voiceEnabled ? "Désactiver la voix" : "Activer la voix"}
              className="p-1.5 rounded-full hover:bg-white/10 active:scale-95 transition-all"
            >
              {voiceEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5 opacity-60" />}
            </button>
            <button
              onClick={() => onOpenChange(false)}
              className="p-1 rounded-full hover:bg-white/10 active:scale-95 transition-all"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* STEP 1: INTRO SCREEN */}
        {activeStep === "intro" && (
          <div className="p-6 space-y-5">
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                <Timer className="h-8 w-8 animate-spin-slow" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Démarrer la préparation guidée</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Cet assistant intelligent vous guidera étape par étape dans la préparation des Bacs (remplissage d'eau, dosage et délais d'attente/mélange) avec notifications sonores et vocales.
              </p>
            </div>

            {/* Bacs Summary Cards */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Cuves à préparer :</p>
              {bacsToPrepare.map((bac, idx) => {
                const totalWater = getBacTotalWater(bac);

                return (
                  <div key={idx} className="flex flex-col p-3 rounded-xl border bg-muted/40 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-extrabold text-emerald-700 bg-emerald-100 dark:bg-emerald-900/50 dark:text-emerald-300 px-2 py-0.5 rounded mr-2">
                          BAC {bac.bac}
                        </span>
                        <span className="font-bold text-foreground">
                          {bac.items.length} produit{bac.items.length > 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="text-right text-[11px] text-muted-foreground font-semibold">
                        Eau init : <span className={`font-bold ${totalWater > 1000 ? "text-destructive" : "text-blue-600"}`}>{totalWater} L</span>
                      </div>
                    </div>
                    {totalWater > 1000 && (
                      <div className="text-[10px] font-semibold text-destructive flex items-center gap-1 bg-destructive/10 p-1.5 rounded-md border border-destructive/20">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        Dépasse 1000 L (Capacité max de la cuve)
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button onClick={startPreparation} className="bg-emerald-600 text-white hover:bg-emerald-700 font-bold">
                Lancer la préparation
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: EXECUTION SCREEN (GUIDED PROGRESSION) */}
        {activeStep === "execution" && activeBac && (
          <div className="p-6 space-y-6">
            {/* Step header / progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-black text-emerald-700 bg-emerald-100 dark:bg-emerald-900/50 dark:text-emerald-300 px-2.5 py-0.5 rounded-full text-[11px]">
                  Préparation du BAC {activeBac.bac}
                </span>
                <span className="font-bold text-muted-foreground">
                  Cuve {activeBacIdx + 1} sur {bacsToPrepare.length}
                </span>
              </div>
              
              {/* Dots progress indicator */}
              <div className="flex gap-1 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-600 transition-all duration-300"
                  style={{ width: `${((activeProductIdx + 2) / (activeBac.items.length + 1)) * 100}%` }}
                />
              </div>
            </div>

            {/* Main Instruction Display */}
            {activeProductIdx === -1 ? (
              /* Water Preparation Step */
              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5 space-y-4 animate-fade-in">
                <div className="flex gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500 text-white shrink-0 self-start">
                    <Info className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-extrabold uppercase text-blue-800 dark:text-blue-400">
                      Étape 1 : Remplissage en eau
                    </h4>
                    <p className="text-sm text-foreground font-medium">
                      Versez le volume d'eau initial nécessaire pour dissoudre complètement les engrais de cette cuve.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white border dark:bg-card shadow-xs text-center space-y-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Volume d'eau requis</p>
                  <p className={`text-4xl font-black ${getBacTotalWater(activeBac) > 1000 ? "text-destructive" : "text-blue-600"}`}>
                    {getBacTotalWater(activeBac)} L
                  </p>
                  <p className="text-[11px] font-medium text-muted-foreground">
                    (Vérifiez le bon fonctionnement de l'agitateur de la cuve)
                  </p>
                </div>

                {getBacTotalWater(activeBac) > 1000 && (
                  <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive font-semibold flex gap-2 items-start animate-pulse">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-bold">Capacité maximale de la cuve dépassée (1000 L)</p>
                      <p className="text-[11px] font-medium opacity-90 leading-relaxed">
                        Le volume d'eau requis ({getBacTotalWater(activeBac)} L) est supérieur à la capacité maximale de votre cuve (1000 L).
                        <strong> Veuillez fractionner la préparation en 2 fois</strong> (ex. préparer la moitié des engrais dans la moitié du volume d'eau requis).
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Product Addition Step */
              <div className="space-y-4 animate-fade-in">
                {activeProduct && (
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-4">
                    <div className="flex gap-3">
                      <div className="p-2.5 rounded-xl bg-emerald-600 text-white shrink-0 self-start">
                        <Check className="h-6 w-6" />
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          Produit {activeProductIdx + 1} sur {activeBac.items.length}
                        </h4>
                        <h3 className="text-lg font-black text-foreground">
                          {activeProduct.name.split("/")[0].trim()}
                        </h3>
                        {activeProduct.name.split("/")[1] && (
                          <p className="text-xs text-muted-foreground font-bold">
                            {activeProduct.name.split("/")[1].trim()}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Quantity Panel */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-white border dark:bg-card text-center">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          Dose / Hectare
                        </span>
                        <p className="text-lg font-extrabold text-foreground mt-0.5">
                          {activeProduct.qty} {activeProduct.unit}/ha
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-white border dark:bg-card text-center ring-2 ring-emerald-600/30">
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                          Dose Totale à verser
                        </span>
                        <p className="text-xl font-black text-emerald-600 mt-0.5">
                          {(parseLocaleFloat(activeProduct.qty) * (program?.payload.hectares || 1)).toFixed(2)} {activeProduct.unit}
                        </p>
                      </div>
                    </div>

                    {/* Technical & Safety note */}
                    {activeProduct.note && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex gap-2 items-start">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span className="font-semibold">{activeProduct.note}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Countdown Timer Widget */}
                {activeProduct && (
                  <div className="rounded-2xl border p-4 bg-muted/40 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-muted-foreground flex items-center gap-1">
                        <Timer className="h-4 w-4" /> Temps d'agitation requis
                      </span>
                      <span className="font-extrabold text-primary">
                        {activeProduct.time || 5} min
                      </span>
                    </div>

                    {/* Big Timer display */}
                    <div className="flex items-center justify-between bg-card border rounded-xl p-3 shadow-xs">
                      <div className="space-y-0.5">
                        <p className="text-3xl font-black font-mono tracking-wider text-foreground">
                          {formatTime(timeLeft)}
                        </p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">
                          {timerRunning ? "Mélange en cours" : "Minuteur suspendu"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          onClick={toggleTimer}
                          size="sm"
                          className={timerRunning ? "bg-amber-600 hover:bg-amber-700 text-white font-bold" : "bg-emerald-600 hover:bg-emerald-700 text-white font-bold"}
                        >
                          {timerRunning ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                          {timerRunning ? "Pause" : "Démarrer"}
                        </Button>
                        {timeLeft > 0 && (
                          <Button onClick={skipTimer} size="sm" variant="ghost" className="h-9 px-2 hover:bg-muted text-muted-foreground">
                            <FastForward className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {/* Progress bar */}
                    {totalTimerTime > 0 && (
                      <Progress 
                        value={((totalTimerTime - timeLeft) / totalTimerTime) * 100} 
                        className="h-1.5"
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Execution step navigation buttons */}
            <div className="pt-2 border-t flex justify-between items-center">
              <Button
                variant="ghost"
                onClick={() => {
                  if (activeProductIdx > -1) {
                    const prevIdx = activeProductIdx - 1;
                    setActiveProductIdx(prevIdx);
                    announceActiveStep(activeBacIdx, prevIdx);
                    if (prevIdx >= 0) {
                      const dur = activeBac.items[prevIdx].time || 5;
                      setTimeLeft(dur * 60);
                      setTotalTimerTime(dur * 60);
                    } else {
                      setTimeLeft(0);
                    }
                    setTimerRunning(false);
                    cancelTimerNotification();
                  } else if (activeBacIdx > 0) {
                    const prevBacIdx = activeBacIdx - 1;
                    setActiveBacIdx(prevBacIdx);
                    const prevBac = bacsToPrepare[prevBacIdx];
                    setActiveProductIdx(prevBac.items.length - 1);
                    announceActiveStep(prevBacIdx, prevBac.items.length - 1);
                    const dur = prevBac.items[prevBac.items.length - 1].time || 5;
                    setTimeLeft(dur * 60);
                    setTotalTimerTime(dur * 60);
                    setTimerRunning(false);
                    cancelTimerNotification();
                  }
                }}
                disabled={activeBacIdx === 0 && activeProductIdx === -1}
                className="text-muted-foreground hover:bg-muted font-bold text-xs"
              >
                Précédent
              </Button>

              <Button
                onClick={nextStep}
                disabled={timerRunning}
                className="bg-emerald-600 text-white hover:bg-emerald-700 font-extrabold text-xs shadow-md"
              >
                Étape Suivante <FastForward className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: VALIDATION SCREEN (CAPTURE PHOTOS, NOTES) */}
        {activeStep === "validation" && (
          <div className="p-6 space-y-4">
            <div className="text-center space-y-1 pb-2 border-b">
              <h3 className="text-lg font-black text-emerald-700">Préparation terminée avec succès !</h3>
              <p className="text-xs text-muted-foreground font-semibold">
                Tous les bacs ont été préparés selon les consignes logistiques V9.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="duration">Durée réelle globale (min)</Label>
                <Input
                  id="duration"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="ex. 45"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value.replace(/[^0-9]/g, ""))}
                  className="mt-1"
                />
              </div>
              <div className="flex flex-col justify-end">
                <span className="text-[10px] text-muted-foreground font-bold">MODE :</span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-2.5 rounded-md border border-emerald-500/20">
                  <Sparkles className="h-4 w-4" /> Assistant Guidé V9
                </span>
              </div>
            </div>

            <div>
              <Label htmlFor="comment">Commentaires / Notes de terrain</Label>
              <Textarea
                id="comment"
                rows={2}
                placeholder="Renseignez tout écart ou note utile (optionnel)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Photo Capture widget */}
            <div>
              <Label>Photos de validation ({files.length}/6)</Label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                hidden
                onChange={onPick}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full mt-1 border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-700"
                onClick={() => fileRef.current?.click()}
                disabled={uploading || files.length >= 6}
              >
                <Camera className="mr-2 h-4 w-4" /> Prendre une photo
              </Button>
              
              {files.length > 0 && (
                <ul className="mt-2 grid grid-cols-3 gap-2">
                  {files.map((f, i) => (
                    <li key={i} className="relative group">
                      <img
                        src={URL.createObjectURL(f)}
                        alt=""
                        className="h-16 w-full rounded-md object-cover border"
                      />
                      {!uploading && (
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white shadow-sm hover:scale-105 active:scale-95 transition-all"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {uploading && uploadProgress.total > 0 && (
              <div className="space-y-1 bg-muted/30 p-2.5 rounded-xl border">
                <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
                  <span>Téléversement des clichés de sécurité…</span>
                  <span>
                    {uploadProgress.done}/{uploadProgress.total} · {Math.round((uploadProgress.done / uploadProgress.total) * 100)}%
                  </span>
                </div>
                <Progress value={Math.round((uploadProgress.done / uploadProgress.total) * 100)} className="h-1.5" />
              </div>
            )}

            <div className="pt-3 border-t flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
                Annuler
              </Button>
              <Button 
                onClick={submitExecution} 
                disabled={uploading}
                className="bg-emerald-600 text-white hover:bg-emerald-700 font-extrabold"
              >
                Valider & Fermer le programme
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
