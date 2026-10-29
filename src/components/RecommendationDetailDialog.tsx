import { useEffect, useState } from "react";
import { Droplet, Sprout, FlaskConical, Check, X, MapPin, Calendar, User } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@/lib/router-compat";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  useRecommendationActions,
  type Recommendation,
} from "@/lib/cloud/recommendations";
import { useProfilesMap } from "@/lib/cloud/alerts";
import { signedPhotoUrl } from "@/lib/cloud/alerts";
import { useParcels, useParcelActions } from "@/lib/parcel-store";
import { useRole } from "@/lib/role";
import { useModuleActions, useAllModuleRecords } from "@/lib/modules-store";
import { debitProductStock, useSuppliers } from "@/lib/suppliers-store";
import { useTranslation } from "@/lib/i18n";

const KIND_LABEL: Record<Recommendation["kind"], string> = {
  fertilisation: "Fertilisation",
  phytosanitaire: "Phytosanitaire",
  irrigation: "Irrigation",
};
const STATUS_LABEL: Record<Recommendation["status"], string> = {
  envoyee: "Envoyée",
  acceptee: "Acceptée",
  rejetee: "Rejetée",
  transferee: "Transférée",
};

const CROP_GROUP_LABELS: Record<string, string> = {
  oliviers: "OLIVIERS (Olivier P1 et P2 P3 P4)",
  pommiers: "POMMIERS (Pommier 1 2)",
  nectarinier: "Nectarinier",
  redix25: "REDIX 25",
  nablara: "NABLARA",
  casuarina: "CASUARINA",
  p9: "P 9",
  p10: "P 10",
  p11: "P 11",
  p12: "P 12",
  autres: "Autres",
};

function SignedPhoto({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    if (path.startsWith("http")) {
      setUrl(path);
      return;
    }
    signedPhotoUrl(path).then((u) => active && setUrl(u));
    return () => {
      active = false;
    };
  }, [path]);
  if (!url) return <div className="aspect-square w-full animate-pulse rounded-xl bg-muted" />;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border">
      <img src={url} alt="Photo recommandation" className="aspect-square w-full object-cover" />
    </a>
  );
}


const SEASONAL_WINDOWS = {
  winter_early_spring: {
    startHour: "10:00",
    maxHour: "14:00",
    label: "Hiver & Début Printemps",
    constraint: "Gel blanc matinal"
  },
  vegetative_spring: {
    startHour: "05:00",
    maxHour: "10:00",
    label: "Printemps Végétatif",
    constraint: "Vent matinal / Gelées tardives"
  },
  estival_transition: {
    startHour: "04:00",
    maxHour: "09:30",
    label: "Transition Estivale",
    constraint: "Montée des chaleurs"
  },
  summer: {
    startHour: "03:00",
    maxHour: "11:20",
    label: "Plein Été (Saharien)",
    constraint: "Évaporation extrême / Sirocco"
  },
  autumn_post_harvest: {
    startHour: "06:00",
    maxHour: "11:00",
    label: "Automne / Post-Récolte",
    constraint: "Baisse des températures"
  }
};

function getSeasonalWindow(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return SEASONAL_WINDOWS.vegetative_spring;
  }
  const month = d.getMonth();
  const day = d.getDate();
  
  if (month >= 0 && month <= 2) {
    return SEASONAL_WINDOWS.winter_early_spring;
  } else if (month === 3) {
    return SEASONAL_WINDOWS.vegetative_spring;
  } else if (month === 4) {
    return day <= 15 ? SEASONAL_WINDOWS.vegetative_spring : SEASONAL_WINDOWS.estival_transition;
  } else if (month >= 5 && month <= 7) {
    return SEASONAL_WINDOWS.summer;
  } else {
    return SEASONAL_WINDOWS.autumn_post_harvest;
  }
}

function groupParcelsForIrrigation(targetParcels: any[]) {
  const groups: any[][] = [];
  const processedIds = new Set<string>();

  const tryPair = (id1: string, id2: string) => {
    const p1 = targetParcels.find(p => p.id === id1);
    const p2 = targetParcels.find(p => p.id === id2);
    const pair: any[] = [];
    if (p1) { pair.push(p1); processedIds.add(id1); }
    if (p2) { pair.push(p2); processedIds.add(id2); }
    if (pair.length > 0) {
      groups.push(pair);
    }
  };

  tryPair("pommier1", "pommier2");
  tryPair("p1", "p2");
  tryPair("p3", "p4");

  for (const p of targetParcels) {
    if (!processedIds.has(p.id)) {
      groups.push([p]);
      processedIds.add(p.id);
    }
  }

  return groups;
}

function parseDurationToMinutes(durationStr: string): number {
  if (durationStr === "1h") return 60;
  if (durationStr === "1h30") return 90;
  if (durationStr === "2h") return 120;
  if (durationStr === "2h30") return 150;
  if (durationStr === "3h") return 180;
  
  const match = String(durationStr).match(/(\d+)h(?:(\d+))?/);
  if (match) {
    const hours = parseInt(match[1]) || 0;
    const mins = parseInt(match[2]) || 0;
    return hours * 60 + mins;
  }
  return parseFloat(durationStr) * 60 || 90;
}

function addMinutesToTime(timeStr: string, minutes: number): string {
  const [h, m] = timeStr.split(":").map(Number);
  const totalMinutes = h * 60 + m + minutes;
  const newH = Math.floor(totalMinutes / 60) % 24;
  const newM = totalMinutes % 60;
  return `${newH.toString().padStart(2, "0")}:${newM.toString().padStart(2, "0")}`;
}

export function RecommendationDetailDialog({
  reco,
  onOpenChange,
}: {
  reco: Recommendation | null;
  onOpenChange: (open: boolean) => void;
}) {
  const parcels = useParcels();
  const { lang } = useTranslation();
  const suppliers = useSuppliers();
  const [showPlanningPreview, setShowPlanningPreview] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");

  useEffect(() => {
    if (reco) {
      const payload = (reco.payload ?? {}) as any;
      const prog = payload.program ?? {};
      setSelectedDate(prog.date || new Date().toISOString().slice(0, 10));
      setShowPlanningPreview(false);
    }
  }, [reco]);

  const { data: profiles = {} } = useProfilesMap();
  const { accept, reject } = useRecommendationActions();
  const { add: addModuleRecord } = useModuleActions();
  const { setStatus } = useParcelActions();
  const { isAdmin } = useRole();
  const navigate = useNavigate();

  const localIrr = useAllModuleRecords("irrigation");
  const localFert = useAllModuleRecords("fertilisation");
  const localPulv = useAllModuleRecords("pulverisation");
  const localPhy = useAllModuleRecords("phytosanitaire");

  const allPrograms = [...localIrr, ...localFert, ...localPulv, ...localPhy];

  const getRecoStatusLabel = (r: Recommendation) => {
    const matchingProgs = allPrograms.filter(p => p.reco_id === r.id || p.payload?.reco_id === r.id);
    if (matchingProgs.length > 0) {
      const allExecuted = matchingProgs.every(p => p.status === "execute" || p.executedAt !== undefined || p.executed_at !== null);
      if (allExecuted) {
        return "Accepté";
      }
    }
    return "En attente";
  };

  if (!reco) {
    return (
      <Dialog open={false} onOpenChange={onOpenChange}>
        <DialogContent />
      </Dialog>
    );
  }

  const Icon =
    reco.kind === "irrigation" ? Droplet : reco.kind === "phytosanitaire" ? FlaskConical : Sprout;
  const author = profiles[reco.created_by] || "Ingénieur";
  const parcelNames = reco.parcel_ids
    .map((id) => parcels.find((p) => p.id === id)?.name ?? id)
    .join(", ");
  const payload = (reco.payload ?? {}) as {
    method?: string;
    crop_group?: string | string[];
    program?: Record<string, unknown>;
  };
  const method = payload.method;
  const program = payload.program;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
              <Icon className="h-5 w-5" />
            </span>
            <span>{KIND_LABEL[reco.kind]}</span>
            <span className="ml-auto rounded-full border bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase">
              {getRecoStatusLabel(reco)}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <p className="text-base font-semibold">{reco.title}</p>

          {parcelNames && (
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <p>{parcelNames}</p>
            </div>
          )}

          <div className="flex items-start gap-2">
            <User className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p>
              Envoyée par <span className="font-medium">{author}</span>
            </p>
          </div>

          <div className="flex items-start gap-2">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              {new Date(reco.created_at).toLocaleString("fr-FR")}
            </p>
          </div>

          {reco.comment && (
            <div className="rounded-xl border bg-muted/30 p-3">
              <p className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">
                Description
              </p>
              <p className="whitespace-pre-wrap text-sm">{reco.comment}</p>
            </div>
          )}

          {(method || payload.crop_group) && (
            <div className="rounded-xl border bg-muted/30 p-3 text-xs">
              <p className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">
                Recommandation
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {payload.crop_group && (() => {
                  const groups = Array.isArray(payload.crop_group)
                    ? payload.crop_group
                    : [payload.crop_group];
                  const labels = groups.map(g => CROP_GROUP_LABELS[g] || g).join(", ");
                  return (
                    <span>
                      <span className="text-muted-foreground">Groupe :</span>{" "}
                      <span className="font-medium">{labels}</span>
                    </span>
                  );
                })()}
                {method && (
                  <span><span className="text-muted-foreground">Méthode :</span> <span className="font-medium">{method === "pulverisation" ? "Par pulvérisation" : "Par irrigation"}</span></span>
                )}
              </div>
            </div>
          )}

          {program && (
            <div className="rounded-xl border bg-muted/30 p-3">
              <p className="mb-2 text-[10px] font-semibold uppercase text-muted-foreground">
                Programme proposé
              </p>
              {program.kind === "pulverisation" ? (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date</span>
                    <span className="font-medium">{String(program.date ?? "—")}</span>
                  </div>
                  <ul className="space-y-0.5">
                    {Array.isArray(program.items) &&
                      (program.items as Array<{ name: string; qty: string; unit: string; price: string }>)
                        .filter((it) => it.name)
                        .map((it, i) => (
                          <li key={i} className="flex justify-between">
                            <span>{it.name} — {it.qty} {it.unit}</span>
                            <span>{((parseFloat(it.qty) || 0) * (parseFloat(it.price) || 0)).toFixed(2)} DA</span>
                          </li>
                        ))}
                  </ul>
                  <div className="flex justify-between border-t pt-1 font-semibold">
                    <span>Total</span>
                    <span>{Number(program.total ?? 0).toFixed(2)} DA</span>
                  </div>
                  <p className="text-muted-foreground text-[10px] mt-1">
                    Météo : {program.weatherOk ? "Favorable" : "Défavorable (validé)"} · {String(program.weatherNote ?? "")}
                  </p>
                </div>
              ) : program.kind === "fertilisation" ? (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date</span>
                    <span className="font-medium">{String(program.date ?? "—")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fréquence</span>
                    <span className="font-medium">
                      {(() => {
                        const freqVal = parseFloat(String(program.frequency));
                        if (freqVal === 7) return lang === "ar" ? "كل يوم" : "Chaque jour";
                        if (freqVal === 3.5) return lang === "ar" ? "يوما بعد يوم" : "Un jour sur deux";
                        if (freqVal === 2.3) return lang === "ar" ? "كل ثلاثة أيام" : "Un jour sur trois";
                        if (freqVal === 1) return lang === "ar" ? "مرة في الأسبوع" : "Une fois par semaine";
                        return lang === "ar" ? `${program.frequency} مرات/أسبوع` : `${program.frequency} passages/semaine`;
                      })()}
                    </span>
                  </div>
                  <div className="mt-2 space-y-2">
                    {Array.isArray(program.entries) &&
                      (program.entries as Array<{ bac: string; items: Array<{ name: string; qty: string; unit: string; price: string }> }>)
                        .filter((e) => e.items.length > 0)
                        .map((entry, idx) => (
                          <div key={idx} className="rounded-lg border bg-card p-2 space-y-1">
                            <span className="font-extrabold uppercase text-primary text-[10px]">Bac {entry.bac}</span>
                            <ul className="space-y-0.5 pl-1">
                              {entry.items.map((it, i) => (
                                <li key={i} className="flex justify-between text-[11px]">
                                  <span>{it.name}</span>
                                  <span className="font-medium">{it.qty} {it.unit}/ha</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                  </div>
                </div>
              ) : program.kind === "phytosanitaire" ? (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date</span>
                    <span className="font-medium">{String(program.date ?? "—")}</span>
                  </div>
                  <div className="mt-2 space-y-2">
                    {Array.isArray(program.products) &&
                      (program.products as Array<{ product: string; cible: string; dosage: string; volume: string; price: string; dar: string }>)
                        .filter((p) => p.product)
                        .map((p, idx) => (
                          <div key={idx} className="rounded-lg border bg-card p-2 space-y-1">
                            <div className="flex justify-between font-bold text-primary">
                              <span>{p.product}</span>
                              {p.price && <span>{parseFloat(p.price).toFixed(2)} DA</span>}
                            </div>
                            <div className="grid grid-cols-2 gap-x-2 text-[10px] text-muted-foreground mt-0.5">
                              {p.cible && <span>Cible : <span className="font-medium text-foreground">{p.cible}</span></span>}
                              {p.dosage && <span>Dosage : <span className="font-medium text-foreground">{p.dosage}</span></span>}
                              {p.volume && <span>Volume : <span className="font-medium text-foreground">{p.volume} L</span></span>}
                              {p.dar && <span>DAR : <span className="font-medium text-foreground">{p.dar} Jours</span></span>}
                            </div>
                          </div>
                        ))}
                  </div>
                  {Number(program.total ?? 0) > 0 && (
                    <div className="flex justify-between border-t pt-1 font-semibold">
                      <span>Total Estimé</span>
                      <span>{Number(program.total).toFixed(2)} DA</span>
                    </div>
                  )}
                </div>
              ) : program.kind === "irrigation" ? (
                <div className="space-y-1 text-xs">
                  {program.mode === "date" ? (
                    <>
                      <div className="flex justify-between"><span className="text-muted-foreground">Mode</span><span className="font-medium">Par date</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span className="font-medium">{String(program.date ?? "—")}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Démarrage</span><span className="font-medium">{String(program.dateStartHour ?? "—")}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Durée</span><span className="font-medium">{String(program.duration ?? "—")} h</span></div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between"><span className="text-muted-foreground">Mode</span><span className="font-medium">Mensuel</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Période</span><span className="font-medium">{String(program.month ?? "")} {String(program.year ?? "")}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Jours</span><span className="font-medium">{Array.isArray(program.days) ? (program.days as string[]).join(", ") : "—"}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Heure</span><span className="font-medium">{String(program.startHour ?? "—")}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Durée / session</span><span className="font-medium">{String(program.durationPerSession ?? "—")} h</span></div>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {reco.photo_urls?.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase text-muted-foreground">
                Photos ({reco.photo_urls.length})
              </p>
              <div className="grid grid-cols-2 gap-2">
                {reco.photo_urls.map((p) => (
                  <SignedPhoto key={p} path={p} />
                ))}
              </div>
            </div>
          )}

          {isAdmin && (reco.status === "envoyee" || reco.status === "rejetee") && (
            <div className="space-y-4 border-t pt-3 mt-3">
              {!showPlanningPreview ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPlanningPreview(true)}
                    className="flex-1 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold uppercase text-primary-foreground active:scale-95 shadow-md"
                  >
                    <Check className="h-4 w-4" /> {reco.status === "rejetee" ? "Valider l'achat et Accepter" : "Accepter"}
                  </button>
                  {reco.status === "envoyee" && (
                    <button
                      onClick={() =>
                        reject.mutate(reco.id, {
                          onSuccess: () => {
                            toast.success("Recommandation mise en approvisionnement");
                            onOpenChange(false);
                          },
                          onError: (e) => toast.error(e.message),
                        })
                      }
                      disabled={accept.isPending || reject.isPending}
                      className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/5 px-4 text-sm font-bold uppercase text-amber-600 active:scale-95 disabled:opacity-50"
                    >
                      <X className="h-4 w-4" /> Approvisionnement
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3 bg-muted/40 p-4 rounded-2xl border text-xs">
                  <div className="flex justify-between items-center border-b pb-2 mb-2">
                    <span className="font-extrabold text-sm uppercase text-primary">Planification intelligente</span>
                    <button
                      onClick={() => setShowPlanningPreview(false)}
                      className="text-[10px] text-muted-foreground hover:text-foreground font-bold border rounded px-2 py-0.5"
                    >
                      Retour
                    </button>
                  </div>

                  {/* 1. Date Picker */}
                  <label className="block">
                    <span className="font-bold text-muted-foreground uppercase text-[10px]">Date d'application</span>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
                    />
                  </label>

                  {/* Friday Warning */}
                  {(() => {
                    const d = new Date(selectedDate);
                    if (d.getDay() === 5) {
                      return (
                        <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive font-bold text-[10px] flex items-center gap-2">
                          <span>⚠️</span>
                          <span>Le jour sélectionné est un Vendredi (Jour de repos de la ferme à éviter pour la fertilisation).</span>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* 2. Seasonal Window Details */}
                  {(() => {
                    const sw = getSeasonalWindow(selectedDate);
                    return (
                      <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-800 text-[10px] space-y-1">
                        <p className="font-black uppercase">{sw.label}</p>
                        <p><strong>Fenêtre horaire :</strong> {sw.startHour} ➔ {sw.maxHour}</p>
                        <p><strong>Justification agronomique :</strong> {sw.constraint}</p>
                      </div>
                    );
                  })()}

                  {/* 3. Sequential Scheduling Block */}
                  {(() => {
                    const targetParcels = parcels.filter((p) => {
                      const groups = Array.isArray(payload.crop_group)
                        ? payload.crop_group
                        : payload.crop_group
                        ? [payload.crop_group]
                        : [];

                      const parcelMatchesCropGroup = (parcelItem: typeof p, group: string) => {
                        if (group === "oliviers") return parcelItem.type === "olivier";
                        if (group === "pommiers") return parcelItem.type === "pommier";
                        if (group === "nectarinier") return parcelItem.type === "nectarine";
                        if (group === "redix25") return parcelItem.id === "redix25";
                        if (group === "nablara") return parcelItem.id === "nablara";
                        if (group === "casuarina") return parcelItem.name.toUpperCase().includes("CASUARINA") || parcelItem.id === "brisevent";
                        if (group === "p9") return parcelItem.id === "p9";
                        if (group === "p10") return parcelItem.id === "p10";
                        if (group === "p11") return parcelItem.id === "p11";
                        if (group === "p12") return parcelItem.id === "p12";
                        return false;
                      };

                      return groups.some((group) => parcelMatchesCropGroup(p, group));
                    });

                    if (targetParcels.length === 0) return null;

                    if (reco.kind === "fertilisation" && payload.method === "irrigation") {
                      const sw = getSeasonalWindow(selectedDate);
                      const groups = groupParcelsForIrrigation(targetParcels);
                      let currentStart = sw.startHour;
                      const durationMinutes = parseDurationToMinutes(program.irrigationTime || "1h30");

                      const timeToMinutes = (t: string) => {
                        const [h, m] = t.split(":").map(Number);
                        return h * 60 + m;
                      };

                      return (
                        <div className="space-y-2">
                          <p className="font-extrabold uppercase text-[10px] text-muted-foreground">Planning d'irrigation séquentiel</p>
                          <div className="space-y-1.5">
                            {groups.map((group, idx) => {
                              const groupStart = currentStart;
                              const groupEnd = addMinutesToTime(groupStart, durationMinutes);
                              const isOverrun = timeToMinutes(groupEnd) > timeToMinutes(sw.maxHour);
                              currentStart = addMinutesToTime(groupEnd, 5); // next group starts after 5 min rest

                              return (
                                <div key={idx} className={`p-2 rounded-lg border bg-card flex justify-between items-center ${isOverrun ? "border-amber-500/50 bg-amber-500/5" : ""}`}>
                                  <div>
                                    <p className="font-bold text-foreground">
                                      Bloc {idx + 1} : {group.map(p => p.name).join(" + ")}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                      Irrigation : {program.irrigationTime || "1h30"} (mouillage: {program.wettingTime || 0}m, injection: {program.injectionTime || 0}m, rinçage: {program.rinsingTime || 0}m)
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-black text-sm text-primary">{groupStart} ➔ {groupEnd}</p>
                                    {isOverrun && (
                                      <p className="text-[9px] font-bold text-amber-600">⚠️ Dépassement de la fenêtre ({sw.maxHour})</p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div className="space-y-1">
                          <p className="font-extrabold uppercase text-[10px] text-muted-foreground">Parcelles affectées</p>
                          <p className="font-medium text-foreground">
                            {targetParcels.map(p => p.name).join(", ")}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Méthode : {reco.kind === "phytosanitaire" ? "Pulvérisation Phytosanitaire" : "Fertilisation Foliaire"}
                          </p>
                        </div>
                      );
                    }
                  })()}

                  {/* 4. Stocks Table */}
                  {(() => {
                    const targetParcels = parcels.filter((p) => {
                      const groups = Array.isArray(payload.crop_group)
                        ? payload.crop_group
                        : payload.crop_group
                        ? [payload.crop_group]
                        : [];

                      const parcelMatchesCropGroup = (parcelItem: typeof p, group: string) => {
                        if (group === "oliviers") return parcelItem.type === "olivier";
                        if (group === "pommiers") return parcelItem.type === "pommier";
                        if (group === "nectarinier") return parcelItem.type === "nectarine";
                        if (group === "redix25") return parcelItem.id === "redix25";
                        if (group === "nablara") return parcelItem.id === "nablara";
                        if (group === "casuarina") return parcelItem.name.toUpperCase().includes("CASUARINA") || parcelItem.id === "brisevent";
                        if (group === "p9") return parcelItem.id === "p9";
                        if (group === "p10") return parcelItem.id === "p10";
                        if (group === "p11") return parcelItem.id === "p11";
                        if (group === "p12") return parcelItem.id === "p12";
                        return false;
                      };

                      return groups.some((group) => parcelMatchesCropGroup(p, group));
                    });

                    const reqProds = (() => {
                      const req: { name: string; qty: number; unit: string }[] = [];
                      const safeParseFloat = (val: any): number => {
                        if (val === null || val === undefined) return 0;
                        if (typeof val === "number") return val;
                        return parseFloat(String(val).trim().replace(",", ".")) || 0;
                      };

                      if (reco.kind === "fertilisation") {
                        if (payload.method === "irrigation") {
                          if (Array.isArray(program.entries)) {
                            for (const entry of program.entries) {
                              if (Array.isArray(entry.items)) {
                                for (const it of entry.items) {
                                  let totalQty = 0;
                                  for (const parcel of targetParcels) {
                                    const surface = safeParseFloat(parcel.info?.surface) || 1;
                                    totalQty += safeParseFloat(it.qty) * surface;
                                  }
                                  const existing = req.find(x => x.name === it.name);
                                  if (existing) {
                                    existing.qty += totalQty;
                                  } else {
                                    req.push({ name: it.name, qty: totalQty, unit: it.unit || "kg" });
                                  }
                                }
                              }
                            }
                          }
                        } else {
                          if (Array.isArray(program.items)) {
                            for (const it of program.items) {
                              const existing = req.find(x => x.name === it.name);
                              if (existing) {
                                existing.qty += safeParseFloat(it.qty);
                              } else {
                                req.push({ name: it.name, qty: safeParseFloat(it.qty), unit: it.unit || "kg" });
                              }
                            }
                          }
                        }
                      } else if (reco.kind === "phytosanitaire") {
                        if (Array.isArray(program.products)) {
                          for (const p of program.products) {
                            const qty = safeParseFloat(p.volume) || safeParseFloat(p.dosage) || 0;
                            const existing = req.find(x => x.name === p.product);
                            if (existing) {
                              existing.qty += qty;
                            } else {
                              req.push({ name: p.product, qty: qty, unit: "kg" });
                            }
                          }
                        }
                      }
                      return req.map(x => ({ ...x, qty: parseFloat(x.qty.toFixed(2)) }));
                    })();

                    if (reqProds.length === 0) return null;

                    const getProductStock = (prodName: string) => {
                      const norm = prodName.trim().toLowerCase();
                      return suppliers
                        .filter(p => p.productName.trim().toLowerCase() === norm)
                        .reduce((sum, p) => sum + (p.quantity - p.consumed), 0);
                    };

                    return (
                      <div className="space-y-1.5 border-t pt-2 mt-2">
                        <p className="font-extrabold uppercase text-[10px] text-muted-foreground">Validation des stocks</p>
                        <div className="space-y-1">
                          {reqProds.map((it, idx) => {
                            const av = getProductStock(it.name);
                            const hasEnough = av >= it.qty;
                            return (
                              <div key={idx} className="flex justify-between items-center text-[11px] py-0.5">
                                <span className="font-medium truncate max-w-[150px]">{it.name}</span>
                                <div className="space-x-3">
                                  <span>Requis : <strong>{it.qty} {it.unit}</strong></span>
                                  <span>Dispo : <strong className={hasEnough ? "text-emerald-600" : "text-destructive"}>{av.toFixed(1)} {it.unit}</strong></span>
                                  <span className={`font-bold ${hasEnough ? "text-emerald-600" : "text-destructive"}`}>
                                    {hasEnough ? "✓ OK" : "⚠️ Insuffisant"}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Confirm Button */}
                  <button
                    onClick={async () => {
                      try {
                        const targetParcels = parcels.filter((p) => {
                          const groups = Array.isArray(payload.crop_group)
                            ? payload.crop_group
                            : payload.crop_group
                            ? [payload.crop_group]
                            : [];

                          const parcelMatchesCropGroup = (parcelItem: typeof p, group: string) => {
                            if (group === "oliviers") return parcelItem.type === "olivier";
                            if (group === "pommiers") return parcelItem.type === "pommier";
                            if (group === "nectarinier") return parcelItem.type === "nectarine";
                            if (group === "redix25") return parcelItem.id === "redix25";
                            if (group === "nablara") return parcelItem.id === "nablara";
                            if (group === "casuarina") return parcelItem.name.toUpperCase().includes("CASUARINA") || parcelItem.id === "brisevent";
                            if (group === "p9") return parcelItem.id === "p9";
                            if (group === "p10") return parcelItem.id === "p10";
                            if (group === "p11") return parcelItem.id === "p11";
                            if (group === "p12") return parcelItem.id === "p12";
                            return false;
                          };

                          return groups.some((group) => parcelMatchesCropGroup(p, group));
                        });

                        await accept.mutateAsync(reco.id);

                        const safeParseFloat = (val: any): number => {
                          if (val === null || val === undefined) return 0;
                          if (typeof val === "number") return val;
                          return parseFloat(String(val).trim().replace(",", ".")) || 0;
                        };

                        let clonedCount = 0;
                        if (program) {
                          if (reco.kind === "fertilisation") {
                            if (payload.method === "irrigation") {
                              const sw = getSeasonalWindow(selectedDate);
                              const groups = groupParcelsForIrrigation(targetParcels);
                              let currentStart = sw.startHour;
                              const durationMinutes = parseDurationToMinutes(program.irrigationTime || "1h30");

                              for (const group of groups) {
                                const groupStart = currentStart;
                                const groupEnd = addMinutesToTime(groupStart, durationMinutes);

                                for (const parcel of group) {
                                  const surface = safeParseFloat(parcel.info?.surface) || 1;
                                  clonedCount++;

                                  let totalCost = 0;
                                  if (Array.isArray(program.entries)) {
                                    for (const entry of program.entries) {
                                      if (Array.isArray(entry.items)) {
                                        for (const it of entry.items) {
                                          const doseHa = safeParseFloat(it.qty);
                                          const doseTotale = parseFloat((doseHa * surface).toFixed(2));
                                          const priceUnit = safeParseFloat(it.price);
                                          totalCost += doseTotale * priceUnit;
                                          debitProductStock(it.name, doseTotale);
                                        }
                                      }
                                    }
                                  }

                                  const frequency = safeParseFloat(program.frequency) || 1;
                                  const adjustedProgram = {
                                    ...program,
                                    hectares: surface,
                                    total: totalCost * frequency,
                                    reco_id: reco.id,
                                    date: selectedDate,
                                  };
                                  addModuleRecord(parcel.id, "fertilisation", adjustedProgram);

                                  const durationHours = (durationMinutes / 60).toString();
                                  const irrigationPayload = {
                                    mode: "date",
                                    date: selectedDate,
                                    duration: durationHours,
                                    dateStartHour: groupStart,
                                    wettingTime: program.wettingTime,
                                    injectionTime: program.injectionTime,
                                    rinsingTime: program.rinsingTime,
                                    irrigationTime: program.irrigationTime,
                                    reco_id: reco.id,
                                  };
                                  addModuleRecord(parcel.id, "irrigation", irrigationPayload);
                                }

                                currentStart = addMinutesToTime(groupEnd, 5);
                              }
                            } else {
                              for (const parcel of targetParcels) {
                                clonedCount++;
                                if (Array.isArray(program.items)) {
                                  for (const it of program.items) {
                                    const qty = safeParseFloat(it.qty);
                                    debitProductStock(it.name, qty);
                                  }
                                }
                                addModuleRecord(parcel.id, "pulverisation", { ...program, reco_id: reco.id, date: selectedDate });
                              }
                            }
                          } else if (reco.kind === "phytosanitaire") {
                            for (const parcel of targetParcels) {
                              clonedCount++;
                              if (Array.isArray(program.products)) {
                                for (const p of program.products) {
                                  const qty = safeParseFloat(p.volume) || safeParseFloat(p.dosage) || 0;
                                  debitProductStock(p.product, qty);
                                }
                              }
                              addModuleRecord(parcel.id, "phytosanitaire", { ...program, reco_id: reco.id, date: selectedDate });
                              setStatus(parcel.id, "alerte");
                            }
                          }
                        }

                        if (clonedCount > 0) {
                          toast.success(`Planification effectuée avec succès ! Tâches générées pour ${clonedCount} parcelles.`);
                        } else {
                          toast.success("Recommandation planifiée.");
                        }
                        onOpenChange(false);
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Erreur de validation");
                      }
                    }}
                    disabled={accept.isPending || reject.isPending}
                    className="w-full inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold uppercase text-primary-foreground active:scale-95 shadow-md mt-2"
                  >
                    <Check className="h-4 w-4" /> Confirmer la planification
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
