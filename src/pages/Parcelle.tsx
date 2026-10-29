import { useParams, Link, useNavigate } from "@/lib/router-compat";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ChevronUp,
  ChevronDown,
  Pencil,
  Check,
  Leaf,
  SprayCan,
  Bug,
  Apple,
  AlertTriangle,
  TestTube2,
  Grid3x3,
  Sprout,
  Droplets,
  Scissors,
  TrendingUp,
} from "lucide-react";
import { useParcel, useParcels, useParcelActions } from "@/lib/parcel-store";
import { INFO_LABELS, TEXT_FIELDS, type ParcelInfo, type ParcelType } from "@/data/parcels";
import { useRole } from "@/lib/role";
import { PulverisationModule } from "@/components/modules/PulverisationModule";
import { PhytosanitaireModule } from "@/components/modules/PhytosanitaireModule";
import { RecolteModule } from "@/components/modules/RecolteModule";
import { AnalyseModule } from "@/components/modules/AnalyseModule";
import { IrrigationModule } from "@/components/modules/IrrigationModule";
import { FertilisationModule } from "@/components/modules/FertilisationModule";
import { PlanParcelleModule } from "@/components/modules/PlanParcelleModule";
import { AnomaliesModule } from "@/components/modules/AnomaliesModule";
import { ParcelExecutantView } from "@/components/executant/ParcelExecutantView";
import { useDisplayRole } from "@/lib/display-role";
import { TailleModule } from "@/components/modules/TailleModule";
import { AmendementModule } from "@/components/modules/AmendementModule";
import { PrevisionModule } from "@/components/modules/PrevisionModule";

const MODULES = [
  { id: "info", label: "Infos", icon: Leaf },
  { id: "plan", label: "Plan", icon: Grid3x3 },
  { id: "prevision", label: "Prévision", icon: TrendingUp },
  { id: "pulverisation", label: "Pulvérisation", icon: SprayCan },
  { id: "phytosanitaire", label: "Phytosanitaire", icon: Bug },
  { id: "recolte", label: "Récolte", icon: Apple },
  { id: "taille", label: "Taille", icon: Scissors },
  { id: "amendement", label: "Amendement", icon: Sprout },
  { id: "analyses", label: "Analyses", icon: TestTube2 },
  { id: "anomalies", label: "Anomalies", icon: AlertTriangle },
] as const;

// Tabs not shown in the strip but still renderable via ?tab= query (centralised in /programmes).
type HiddenTabId = "irrigation" | "fertilisation";

type TabId = (typeof MODULES)[number]["id"] | HiddenTabId;

function ParcellePage() {
  const { id } = useParams<{id: string}>();
  const parcel = useParcel(id);
  const allParcels = useParcels();
  const { updateInfo, setStatus } = useParcelActions();
  const { isAdmin, isIngenieur, session, loading } = useRole();
  const displayRole = useDisplayRole();
  const navigate = useNavigate();
  const [editMode, setEditMode] = useState(false);
  const canEdit = isAdmin || isIngenieur;
  const initialTab: TabId = (() => {
    if (typeof window === "undefined") return "info";
    const searchParams = new URLSearchParams(window.location.search);
    let t = searchParams.get("tab");
    if (!t && window.location.hash.includes("?")) {
      const hashQuery = window.location.hash.split("?")[1];
      t = new URLSearchParams(hashQuery).get("tab");
    }
    if (t === "irrigation" || t === "fertilisation") return t;
    const valid = (MODULES as readonly { id: string }[]).some((m) => m.id === t);
    return valid ? (t as TabId) : "info";
  })();
  const [tab, setTab] = useState<TabId>(initialTab);

  const idx = allParcels.findIndex((p) => p.id === id);
  const prevId = idx > 0 ? allParcels[idx - 1].id : null;
  const nextId = idx >= 0 && idx < allParcels.length - 1 ? allParcels[idx + 1].id : null;

  useEffect(() => {
    if (loading) return;
    if (!session && !(typeof navigator !== "undefined" && navigator.onLine === false)) {
      navigate({ to: "/login" });
    }
  }, [session, loading, navigate]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  if (!parcel) {
    return (
      <main className="mx-auto max-w-3xl px-4 pt-6">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Retour
        </Link>
        <p className="mt-4 text-foreground">Parcelle inconnue</p>
      </main>
    );
  }
  if (displayRole === "executant") {
    return <ParcelExecutantView parcel={parcel} />;
  }

  const statusColor =
    parcel.status === "sain"
      ? "bg-olive-mid text-white"
      : parcel.status === "alerte"
      ? "bg-orange-500 text-white"
      : "bg-destructive text-destructive-foreground";

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-4">
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Retour
        </Link>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusColor}`}>
            {parcel.status === "sain" ? "Sain" : parcel.status === "alerte" ? "Alerte" : "Intervention"}
          </span>
          {isAdmin && parcel.status !== "sain" && (
            <button
              onClick={() => setStatus(parcel.id, "sain")}
              title="Rétablir Sain"
              className="inline-flex items-center gap-1 rounded-full border border-olive-mid bg-olive-mid/10 px-2 py-1 text-xs font-medium text-olive-dark hover:bg-olive-mid/20"
            >
              <Check className="h-3.5 w-3.5" /> Sain
            </button>
          )}
          {isAdmin && tab === "info" && (
            <button
              onClick={() => setEditMode((v) => !v)}
              title={editMode ? "Terminer" : "Modifier"}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium ${
                editMode
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-card text-foreground hover:bg-accent"
              }`}
            >
              {editMode ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
              {editMode ? "Terminer" : "Modifier"}
            </button>
          )}
        </div>
      </div>

      <header className="mt-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold text-foreground">Parcelle : {parcel.name}</h1>
          <div className="ml-auto flex flex-col">
            <button
              type="button"
              disabled={!prevId}
              onClick={() => prevId && navigate({ to: "/parcelle/$id", params: { id: prevId } })}
              title="Parcelle précédente"
              className="rounded-t-md border border-input bg-card p-0.5 text-foreground hover:bg-accent disabled:opacity-30"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={!nextId}
              onClick={() => nextId && navigate({ to: "/parcelle/$id", params: { id: nextId } })}
              title="Parcelle suivante"
              className="-mt-px rounded-b-md border border-input bg-card p-0.5 text-foreground hover:bg-accent disabled:opacity-30"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Information complète sur la parcelle</p>
      </header>

      {/* Module tabs */}
      {(() => {
        const tabList = [
          ...MODULES,
          ...(tab === "fertilisation" ? [{ id: "fertilisation" as const, label: "Fertilisation", icon: Sprout }] : []),
          ...(tab === "irrigation" ? [{ id: "irrigation" as const, label: "Irrigation", icon: Droplets }] : []),
        ];
        return (
          <div className="mt-4 flex gap-1 overflow-x-auto border-b">
            {tabList.map(({ id: mid, label, icon: Icon }) => (
              <button
                key={mid}
                onClick={() => setTab(mid)}
                className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
                  tab === mid
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        );
      })()}

      <section className="mt-4">
        {tab === "info" && (
          <InfoTable
            info={parcel.info}
            type={parcel.type}
            parcelId={parcel.id}
            editMode={editMode && isAdmin}
            onChange={(field, value) => updateInfo(parcel.id, { [field]: value })}
          />
        )}
        {tab === "plan" && <PlanParcelleModule parcelId={parcel.id} canEdit={canEdit} />}
        {tab === "prevision" && <PrevisionModule parcelId={parcel.id} canEdit={canEdit} />}
        {tab === "pulverisation" && <PulverisationModule parcelId={parcel.id} canEdit={canEdit} />}
        {tab === "phytosanitaire" && <PhytosanitaireModule parcelId={parcel.id} canEdit={canEdit} />}
        {tab === "recolte" && <RecolteModule parcelId={parcel.id} canEdit={canEdit} />}
        {tab === "taille" && <TailleModule parcelId={parcel.id} canEdit={canEdit} />}
        {tab === "amendement" && <AmendementModule parcelId={parcel.id} canEdit={canEdit} />}
        {tab === "analyses" && <AnalyseModule parcelId={parcel.id} canEdit={canEdit} />}
        {tab === "irrigation" && <IrrigationModule parcelId={parcel.id} canEdit={canEdit} />}
        {tab === "fertilisation" && <FertilisationModule parcelId={parcel.id} canEdit={canEdit} />}
        {tab === "anomalies" && <AnomaliesModule parcelId={parcel.id} canEdit={canEdit} />}
      </section>

      {!canEdit && tab === "info" && (
        <p className="mt-3 text-xs text-muted-foreground">
          Mode Exécutant : lecture seule. Passez en Admin ou Ingénieur pour modifier.
        </p>
      )}
    </main>
  );
}

type Field = keyof ParcelInfo;
type RowDef = [Field, Field] | [Field];

interface SectionDef {
  title?: string;
  subtitle?: string;
  rows: RowDef[];
}

const COMMON_TOP: SectionDef[] = [
  {
    rows: [
      ["flowering", "pumpBar"],
      ["harvest", "frequency"],
      ["anneeAgricoleDebut", "anneeAgricoleFin"],
    ],
  },
  {
    title: "Identification",
    rows: [
      ["espece", "porteGreffe"],
      ["surface", "age"],
    ],
  },
  {
    title: "Caractéristiques Agronomiques",
    rows: [
      ["espacementM", "nbArbres"],
      ["longueurM", "largeurM"],
      ["nbLignes", "arbresLigne"],
    ],
  },
];

const OLIVIER_HYDRO: SectionDef[] = [
  {
    title: "Système Hydraulique",
    subtitle: "Système irrigation Ferkani · 1 gouteur par ligne",
    rows: [
      ["ferkaniDebitG", "ferkaniNbPompe"],
      ["ferkaniDebitArbre", "ferkaniDebitTotal"],
    ],
  },
  {
    subtitle: "Système irrigation Chamlal · 3 gouteurs par ligne",
    rows: [
      ["chamlalDebitG", "chamlalNbPompe"],
      ["chamlalDebitArbre", "chamlalDebitTotal"],
    ],
  },
];

const SINGLE_HYDRO: SectionDef[] = [
  {
    title: "Système Hydraulique",
    rows: [
      ["sysDebitG", "sysNbPompe"],
      ["sysNbGouteurs", "sysDebitTotal"],
    ],
  },
];

const POLLINISATEURS: SectionDef[] = [
  {
    title: "Pollinisateurs",
    rows: [
      ["pollin1Espece", "pollin1Nb"],
      ["pollin2Espece", "pollin2Nb"],
    ],
  },
];

const BRISE_OLIVIER: SectionDef = {
  title: "Brise vent",
  rows: [
    ["briseEspece", "briseAge"],
    ["briseNbLignes", "briseNbPompe"],
    ["briseEspacement", "briseNbArbres"],
    ["briseDebitG", "briseDebitTotal"],
  ],
};

const BRISE_FRUITIER: SectionDef = {
  title: "Brise vent",
  rows: [
    ["briseEspece", "briseAge"],
    ["briseNbLignes", "briseNbPompe"],
    ["briseDebitG", "briseNbArbres"],
    ["briseNbGouteurs", "briseDebitTotal"],
  ],
};

const BRISEVENT_ONLY: SectionDef = {
  title: "Brise vent",
  rows: [
    ["briseEspece", "briseAge"],
    ["briseNbLignes", "briseNbPompe"],
    ["briseDebitG", "briseNbArbres"],
    ["briseNbGouteurs", "briseDebitTotal"],
  ],
};

function sectionsFor(type: ParcelType, parcelId?: string): SectionDef[] {
  if (parcelId === "brisevent") return [BRISEVENT_ONLY];
  if (type === "olivier") return [...COMMON_TOP, ...OLIVIER_HYDRO, BRISE_OLIVIER];
  if (type === "pommier") return [...COMMON_TOP, ...POLLINISATEURS, ...SINGLE_HYDRO, BRISE_FRUITIER];
  if (type === "nectarine") return [...COMMON_TOP, ...SINGLE_HYDRO, BRISE_FRUITIER];
  return COMMON_TOP;
}

const EMPHASIZED: ReadonlySet<Field> = new Set<Field>(["nbArbresParcelle", "debitGlobal"]);

function InfoTable({
  info,
  type,
  parcelId,
  editMode,
  onChange,
}: {
  info: ParcelInfo;
  type: ParcelType;
  parcelId?: string;
  editMode: boolean;
  onChange: (field: Field, value: string) => void;
}) {
  const sections = sectionsFor(type, parcelId);
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      {/* Bandeau d'en-tête : Nom Parcelle | Information Pompe */}
      <div className="grid grid-cols-2 border-b bg-muted/60">
        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-foreground">
          Nom Parcelle
        </div>
        <div className="border-l px-3 py-2 text-xs font-semibold uppercase tracking-wide text-foreground">
          Information Pompe
        </div>
      </div>

      {sections.map((section, si) => (
        <div key={si}>
          {section.title && (
            <div className="border-b bg-primary/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-primary">
              {section.title}
            </div>
          )}
          {section.subtitle && (
            <div className="border-b bg-muted/40 px-3 py-1 text-[11px] font-semibold italic text-foreground">
              {section.subtitle}
            </div>
          )}
          {section.rows.map((row, ri) => (
            <div key={ri} className="grid grid-cols-2 border-b last:border-b-0">
              <Cell field={row[0]} value={info[row[0]]} editMode={editMode} onChange={onChange} />
              {row[1] ? (
                <Cell
                  field={row[1]}
                  value={info[row[1]]}
                  editMode={editMode}
                  onChange={onChange}
                  bordered
                />
              ) : (
                <div className="border-l" />
              )}
            </div>
          ))}
        </div>
      ))}

      {/* Totaux */}
      <div className="grid grid-cols-2 border-t bg-primary/5">
        <Cell
          field="nbArbresParcelle"
          value={info.nbArbresParcelle}
          editMode={editMode}
          onChange={onChange}
        />
        <Cell
          field="debitGlobal"
          value={info.debitGlobal}
          editMode={editMode}
          onChange={onChange}
          bordered
        />
      </div>
    </div>
  );
}

function Cell({
  field,
  value,
  editMode,
  onChange,
  bordered,
}: {
  field: Field;
  value: string;
  editMode: boolean;
  onChange: (field: Field, value: string) => void;
  bordered?: boolean;
}) {
  const emphasized = EMPHASIZED.has(field);
  const isText = TEXT_FIELDS.has(field);
  const inputMode = isText ? "text" : "decimal";
  const isDate = field === "anneeAgricoleDebut" || field === "anneeAgricoleFin";

  function handle(v: string) {
    if (isText || isDate) return onChange(field, v);
    const cleaned = v.replace(/[^0-9.,\s/-]/g, "");
    onChange(field, cleaned);
  }

  return (
    <div className={`flex items-center justify-between gap-2 px-3 py-2 ${bordered ? "border-l" : ""}`}>
      <span
        className={`text-xs ${
          emphasized ? "font-bold text-foreground" : "text-muted-foreground"
        }`}
      >
        {INFO_LABELS[field]}
      </span>
      {editMode ? (
        <input
          type={isDate ? "date" : "text"}
          value={value}
          inputMode={isDate ? undefined : (inputMode as "text" | "decimal")}
          onChange={(e) => handle(e.target.value)}
          className={`${isDate ? "w-36" : "w-28"} rounded border border-input bg-background px-2 py-1 text-right text-sm text-foreground focus:border-primary focus:outline-none`}
        />
      ) : (
        <span
          className={`text-sm ${emphasized ? "font-bold text-foreground" : "text-foreground"}`}
        >
          {isDate && value ? new Date(value).toLocaleDateString("fr-FR") : (value || "—")}
        </span>
      )}
    </div>
  );
}

export default ParcellePage;
