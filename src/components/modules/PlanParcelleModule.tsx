import { useMemo, useState, useEffect } from "react";
import {
  AlertCircle,
  Camera,
  Droplet,
  MessageCircle,
  Settings2,
  X,
  Bug,
  Wrench,
  Trash2,
  Check,
  Save,
} from "lucide-react";
import {
  VITALITY_COLOR,
  VITALITY_LABEL,
  getTree,
  treeKey,
  useTreeActions,
  useTrees,
  pushAlert,
  type Pollinator,
  type Problem,
  type Tree,
  type Vitality,
} from "@/lib/tree-store";
import { useParcel } from "@/lib/parcel-store";
import { useAlertActions, type AlertKind } from "@/lib/cloud/alerts";
import { toast } from "sonner";

const ENG_PHONE_KEY = "doula-engineer-phone";
const MAX_DIM = 200;

function parseDim(s: string, fallback: number) {
  const n = parseInt((s || "").replace(/\D/g, ""), 10);
  return Number.isFinite(n) && n > 0 && n <= MAX_DIM ? n : fallback;
}

export function PlanParcelleModule({
  parcelId,
  canEdit,
}: {
  parcelId: string;
  canEdit: boolean;
}) {
  const parcel = useParcel(parcelId);
  const trees = useTrees(parcelId);
  const { update } = useTreeActions();
  const { create: createCloudAlert } = useAlertActions();

  // L = lignes (depuis nbLignes), P = arbres / ligne (depuis arbresLigne)
  const defaultL = parseDim(parcel?.info.nbLignes || "", 10);
  const defaultP = parseDim(parcel?.info.arbresLigne || parcel?.info.nbArbres || "", 20);
  const [nbL, setNbL] = useState(defaultL);
  const [nbP, setNbP] = useState(defaultP);
  const [showSettings, setShowSettings] = useState(false);
  const [openCell, setOpenCell] = useState<{ l: number; p: number } | null>(null);

  const [engPhone, setEngPhone] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") setEngPhone(localStorage.getItem(ENG_PHONE_KEY) || "");
  }, []);
  function saveEngPhone(v: string) {
    setEngPhone(v);
    if (typeof window !== "undefined") localStorage.setItem(ENG_PHONE_KEY, v);
  }

  // Affichage inversé : lignes de la grille = P (arbre), colonnes = L (ligne)
  const grid = useMemo(() => {
    const g: { l: number; p: number; tree: Tree }[][] = [];
    for (let p = 1; p <= nbP; p++) {
      const row: { l: number; p: number; tree: Tree }[] = [];
      for (let l = 1; l <= nbL; l++) {
        row.push({ l, p, tree: getTree(parcelId, treeKey(l, p)) });
      }
      g.push(row);
    }
    return g;
  }, [nbL, nbP, parcelId, trees]);

  function commitTree(l: number, p: number, patch: Partial<Tree>, problem: Problem | null) {
    const key = treeKey(l, p);
    update(parcelId, key, problem ? { ...patch, problem } : patch);
    if (problem && problem !== "aucun") {
      pushAlert({ parcelId, treeKey: key, problem });
      const kind: AlertKind =
        problem === "fuite" ? "fuite" : problem === "tuyau" ? "tuyau" : "maladie";
      createCloudAlert.mutate(
        {
          parcel_id: parcelId,
          type: kind,
          comment: `Arbre L${l} • P${p}${patch.notes ? ` — ${patch.notes}` : ""}`,
          l,
          p,
        },
        {
          onSuccess: () => toast.success("Anomalie enregistrée"),
          onError: (e) => toast.error(e.message),
        },
      );
    } else {
      toast.success("Fiche arbre mise à jour");
    }
    setOpenCell(null);
  }

  function whatsappMessage(l: number, p: number, tree: Tree) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const link = `${origin}/parcelle/${parcelId}`;
    return (
      `🌳 Alerte Maladie\n` +
      `Parcelle : ${parcel?.name || parcelId}\n` +
      `Position : L${l} • P${p}\n` +
      `Hauteur : ${tree.heightCm || "?"} m · Tronc : ${tree.trunkMm || "?"} cm\n` +
      `Fiche : ${link}`
    );
  }

  function whatsappUrl(l: number, p: number, tree: Tree) {
    const phone = (engPhone || "").replace(/\D/g, "");
    return `https://wa.me/${phone}?text=${encodeURIComponent(whatsappMessage(l, p, tree))}`;
  }

  async function copyWhatsapp(l: number, p: number, tree: Tree) {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(whatsappMessage(l, p, tree));
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card px-3 py-2">
        <div className="text-xs text-muted-foreground">
          Matrice {nbP} P × {nbL} L · cliquez une case pour ouvrir la fiche arbre
        </div>
        <button
          onClick={() => setShowSettings((v) => !v)}
          className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground hover:bg-accent"
        >
          <Settings2 className="h-3.5 w-3.5" /> Réglages
        </button>
      </div>

      {showSettings && (
        <div className="grid grid-cols-1 gap-2 rounded-xl border bg-card p-3 sm:grid-cols-3">
          <label className="text-xs text-muted-foreground">
            Lignes (L) — max {MAX_DIM}
            <input
              type="number"
              min={1}
              max={MAX_DIM}
              value={nbL}
              onChange={(e) => setNbL(Math.max(1, Math.min(MAX_DIM, parseInt(e.target.value || "1", 10))))}
              className="mt-1 w-full rounded border border-input bg-background px-2 py-1 text-sm text-foreground"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Arbres / ligne (P) — max {MAX_DIM}
            <input
              type="number"
              min={1}
              max={MAX_DIM}
              value={nbP}
              onChange={(e) => setNbP(Math.max(1, Math.min(MAX_DIM, parseInt(e.target.value || "1", 10))))}
              className="mt-1 w-full rounded border border-input bg-background px-2 py-1 text-sm text-foreground"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Téléphone Ingénieur (WhatsApp)
            <input
              value={engPhone}
              onChange={(e) => saveEngPhone(e.target.value)}
              placeholder="+213..."
              className="mt-1 w-full rounded border border-input bg-background px-2 py-1 text-sm text-foreground"
            />
          </label>
        </div>
      )}

      <Legend />

      <div className="overflow-auto rounded-xl border bg-card p-3">
        <div className="inline-block">
          {/* En-tête : L1, L2, ... */}
          <div className="flex">
            <div className="w-8 shrink-0" />
            {Array.from({ length: nbL }, (_, i) => (
              <div
                key={i}
                className="flex h-6 w-7 shrink-0 items-center justify-center text-[9px] text-muted-foreground"
              >
                L{i + 1}
              </div>
            ))}
          </div>
          {/* Lignes : P1, P2, ... */}
          {grid.map((row, ri) => (
            <div key={ri} className="flex">
              <div className="flex h-7 w-8 shrink-0 items-center justify-center text-[10px] font-semibold text-muted-foreground">
                P{ri + 1}
              </div>
              {row.map(({ l, p, tree }) => (
                <button
                  key={l}
                  onClick={() => setOpenCell({ l, p })}
                  className="relative h-7 w-7 shrink-0 border border-background"
                  style={{ background: VITALITY_COLOR[tree.vitality] }}
                  title={`L${l} P${p} · ${VITALITY_LABEL[tree.vitality]}`}
                >
                  {tree.pollinator && (
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white drop-shadow">
                      {tree.pollinator}
                    </span>
                  )}
                  {tree.problem !== "aucun" && (
                    <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-destructive ring-1 ring-background" />
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {openCell && (
        <TreeSheet
          parcelId={parcelId}
          parcelName={parcel?.name || parcelId}
          l={openCell.l}
          p={openCell.p}
          canEdit={canEdit}
          onClose={() => setOpenCell(null)}
          onCommit={(patch, problem) => {
            commitTree(openCell.l, openCell.p, patch, problem);
            setOpenCell(null);
          }}
          whatsappUrl={whatsappUrl}
          copyWhatsapp={copyWhatsapp}
          engPhone={engPhone}
        />
      )}
    </div>
  );
}

function Legend() {
  const items: { v: Vitality; desc: string }[] = [
    { v: "sain", desc: "Sain" },
    { v: "replante", desc: "Replanté" },
    { v: "faible", desc: "Faible" },
    { v: "mort", desc: "Mort" },
    { v: "oublie", desc: "Oublié" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card px-3 py-2 text-xs">
      {items.map((i) => (
        <span key={i.v} className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded-sm"
            style={{ background: VITALITY_COLOR[i.v] }}
          />
          <span className="text-foreground">{i.desc}</span>
        </span>
      ))}
      <span className="ml-auto text-muted-foreground">G = Golden · S = Granny Smith</span>
    </div>
  );
}

function TreeSheet({
  parcelId,
  parcelName,
  l,
  p,
  canEdit,
  onClose,
  onCommit,
  whatsappUrl,
  copyWhatsapp,
  engPhone,
}: {
  parcelId: string;
  parcelName: string;
  l: number;
  p: number;
  canEdit: boolean;
  onClose: () => void;
  onCommit: (patch: Partial<Tree>, problem: Problem | null) => void;
  whatsappUrl: (l: number, p: number, tree: Tree) => string;
  copyWhatsapp: (l: number, p: number, tree: Tree) => Promise<void>;
  engPhone: string;
}) {
  const initial = getTree(parcelId, treeKey(l, p));
  // Brouillon local — rien n'est sauvegardé tant que l'utilisateur n'a pas validé
  const [draft, setDraft] = useState<Tree>(initial);
  const [pendingProblem, setPendingProblem] = useState<Problem | null>(null);
  const [dirty, setDirty] = useState(false);

  function patch(p: Partial<Tree>) {
    setDraft((d) => ({ ...d, ...p }));
    setDirty(true);
  }

  function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      patch({ photos: [...draft.photos, String(reader.result)] });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function chooseProblem(prob: Problem) {
    setPendingProblem(prob);
    setDraft((d) => ({ ...d, problem: prob }));
    setDirty(true);
  }

  function handleValidate() {
    onCommit(draft, pendingProblem);
  }

  const VITALITIES: Vitality[] = ["sain", "replante", "faible", "mort", "oublie"];
  const POLL: { v: Pollinator; label: string }[] = [
    { v: "", label: "—" },
    { v: "G", label: "G · Golden" },
    { v: "S", label: "S · Granny Smith" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border bg-card p-4 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Fiche arbre · L{l} • P{p}
            </h3>
            <p className="text-xs text-muted-foreground">{parcelName}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Vitalité */}
        <div className="mt-4">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Vitalité</p>
          <div className="flex flex-wrap gap-1.5">
            {VITALITIES.map((v) => (
              <button
                key={v}
                disabled={!canEdit}
                onClick={() => patch({ vitality: v })}
                className={`rounded-md border px-2 py-1 text-xs font-medium ${
                  draft.vitality === v ? "border-transparent text-white" : "border-input bg-background text-foreground"
                }`}
                style={draft.vitality === v ? { background: VITALITY_COLOR[v] } : undefined}
              >
                {VITALITY_LABEL[v]}
              </button>
            ))}
          </div>
        </div>

        {/* Mesures */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <label className="text-xs text-muted-foreground">
            Hauteur (m)
            <input
              disabled={!canEdit}
              inputMode="decimal"
              value={draft.heightCm}
              onChange={(e) => patch({ heightCm: e.target.value.replace(/[^0-9.,]/g, "") })}
              className="mt-1 w-full rounded border border-input bg-background px-2 py-1 text-sm text-foreground"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Diamètre tronc (cm)
            <input
              disabled={!canEdit}
              inputMode="decimal"
              value={draft.trunkMm}
              onChange={(e) => patch({ trunkMm: e.target.value.replace(/[^0-9.,]/g, "") })}
              className="mt-1 w-full rounded border border-input bg-background px-2 py-1 text-sm text-foreground"
            />
          </label>
        </div>

        {/* Pollinisateur */}
        <div className="mt-4">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Pollinisateur</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {POLL.map((opt) => (
              <button
                key={opt.v || "none"}
                disabled={!canEdit}
                onClick={() => patch({ pollinator: opt.v })}
                className={`rounded-md border px-2 py-1 text-xs font-medium ${
                  draft.pollinator === opt.v
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
            {/* Custom pollinator */}
            <input
              disabled={!canEdit}
              value={!POLL.some((o) => o.v === draft.pollinator) ? draft.pollinator : ""}
              onChange={(e) => patch({ pollinator: e.target.value.slice(0, 4).toUpperCase() })}
              placeholder="+ Autre"
              className="w-20 rounded-md border border-dashed border-input bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Photos */}
        <div className="mt-4">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Photos</p>
          <div className="flex flex-wrap gap-2">
            {draft.photos.map((src, i) => (
              <div key={i} className="relative">
                <img src={src} alt="" className="h-16 w-16 rounded-md object-cover" />
                {canEdit && (
                  <button
                    onClick={() =>
                      patch({ photos: draft.photos.filter((_, idx) => idx !== i) })
                    }
                    className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-destructive-foreground"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
            {canEdit && (
              <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-md border border-dashed border-input text-muted-foreground hover:bg-accent">
                <Camera className="h-5 w-5" />
                <input type="file" accept="image/*" onChange={onPhoto} className="hidden" />
              </label>
            )}
          </div>
        </div>

        {/* Signaler problème */}
        <div className="mt-5 rounded-xl border bg-muted/30 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <AlertCircle className="h-3.5 w-3.5" /> Signaler un problème
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <ProblemBtn
              active={draft.problem === "fuite"}
              icon={<Droplet className="h-3.5 w-3.5" />}
              label="Fuite"
              hint="Exécutants"
              onClick={() => chooseProblem("fuite")}
              disabled={!canEdit}
              tone="orange"
            />
            <ProblemBtn
              active={draft.problem === "tuyau"}
              icon={<Wrench className="h-3.5 w-3.5" />}
              label="Tuyau"
              hint="Exécutants"
              onClick={() => chooseProblem("tuyau")}
              disabled={!canEdit}
              tone="orange"
            />
            <ProblemBtn
              active={draft.problem === "maladie"}
              icon={<Bug className="h-3.5 w-3.5" />}
              label="Maladie"
              hint="Ingénieur"
              onClick={() => chooseProblem("maladie")}
              disabled={!canEdit}
              tone="red"
            />
            <ProblemBtn
              active={draft.problem === "aucun"}
              icon={<Check className="h-3.5 w-3.5" />}
              label="Aucun"
              hint="Annuler"
              onClick={() => chooseProblem("aucun")}
              disabled={!canEdit}
              tone="green"
            />
          </div>

          {pendingProblem === "maladie" && engPhone && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <a
                href={whatsappUrl(l, p, draft)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md bg-[#25D366] px-3 py-2 text-xs font-semibold text-white"
              >
                <MessageCircle className="h-4 w-4" /> Ouvrir WhatsApp
              </a>
              <button
                type="button"
                onClick={() => copyWhatsapp(l, p, draft)}
                className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-accent"
              >
                Copier le message
              </button>
            </div>
          )}
          {pendingProblem && pendingProblem !== "aucun" && (
            <p className="mt-2 text-xs text-muted-foreground">
              {pendingProblem === "maladie"
                ? "Une fois validée, l'anomalie est envoyée à l'ingénieur et enregistrée dans l'onglet « Anomalies »."
                : "Une fois validée, l'anomalie est envoyée aux exécutants et enregistrée dans l'onglet « Anomalies »."}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="mt-5 flex items-center justify-end gap-2 border-t pt-3">
          <button
            onClick={onClose}
            className="rounded-md border border-input bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-accent"
          >
            Annuler
          </button>
          <button
            disabled={!canEdit || !dirty}
            onClick={handleValidate}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" /> Valider
          </button>
        </div>
      </div>
    </div>
  );
}

function ProblemBtn({
  active,
  icon,
  label,
  hint,
  onClick,
  disabled,
  tone,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  hint: string;
  onClick: () => void;
  disabled: boolean;
  tone: "orange" | "red" | "green";
}) {
  const bg =
    tone === "orange"
      ? "bg-orange-500"
      : tone === "red"
      ? "bg-destructive"
      : "bg-olive-mid";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center gap-0.5 rounded-md border px-2 py-2 text-xs font-medium transition-colors ${
        active
          ? `${bg} border-transparent text-white`
          : "border-input bg-background text-foreground hover:bg-accent"
      } disabled:opacity-50`}
    >
      <span className="flex items-center gap-1">
        {icon}
        {label}
      </span>
      <span className={`text-[10px] ${active ? "text-white/80" : "text-muted-foreground"}`}>
        {hint}
      </span>
    </button>
  );
}
