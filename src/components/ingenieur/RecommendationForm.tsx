import { useState, useMemo, useEffect } from "react";
import { Droplet, FlaskConical, SprayCan, Send, Camera, X, Plus, Trash2, Info, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  useRecommendationActions,
  uploadRecommendationPhotos,
  type RecoKind,
  type RecoMethod,
  type CropGroup,
  type Recommendation,
} from "@/lib/cloud/recommendations";
import { FERTILIZER_DATABASE } from "@/data/fertilizers";
import { useProducts, useProductActions } from "@/lib/products-store";
import { PHYTO_DATABASE } from "@/data/phytosanitaires";
import { useTranslation } from "@/lib/i18n";

const getPhytoProductDetails = (pName: string, products: any[]) => {
  const staticPhyto = PHYTO_DATABASE.find(x => x.name === pName);
  if (staticPhyto) {
    return {
      price: staticPhyto.price,
      dar: staticPhyto.dar,
      cible: staticPhyto.cible,
      dosage: staticPhyto.dosage,
    };
  }
  const customPhyto = products.find(x => x.name === pName);
  if (customPhyto) {
    let cible = customPhyto.note || "";
    let dosage = "";
    if (cible.startsWith("{")) {
      try {
        const parsed = JSON.parse(cible);
        cible = parsed.cible || "";
        dosage = parsed.dosage || "";
      } catch (e) {}
    }
    return {
      price: customPhyto.price?.toString() || "0",
      dar: customPhyto.solubility ? `${customPhyto.solubility}j` : "",
      cible: cible,
      dosage: dosage,
    };
  }
  return null;
};

const CROP_GROUPS: { v: CropGroup; label: string }[] = [
  { v: "oliviers", label: "OLIVIERS (Olivier P1 et P2 P3 P4)" },
  { v: "pommiers", label: "POMMIERS (Pommier 1 2)" },
  { v: "redix25", label: "REDIX 25" },
  { v: "nablara", label: "NABLARA" },
  { v: "casuarina", label: "CASUARINA" },
  { v: "p9", label: "P 9" },
  { v: "p10", label: "P 10" },
  { v: "p11", label: "P 11" },
  { v: "p12", label: "P 12" },
];

const CLEANED_BAC_PRODUCTS = {
  A: ["Nitrate de Calcium / نترات كالسـيوم"],
  B: [
    "Sulfate de Potassium / سلفات البوتاسيوم SOP",
    "Sulfate de Potassium / سلفat البوتاسيوم SOP",
    "Nitrate de Potassium / نترات البوتاسيوم",
    "Sulfate de Magnésium / سلفات ماغنسيوم",
    "Sulfate de Magnésium / سلفat ماغنسيوم",
    "Nitrate de Magnésium / نترات ماغنسيوم",
    "Nitrate de Magnésium / نترات ماغنسiوم",
    "Urée / يوريا"
  ],
  C: [
    "Acide Humique / أسمدة عضوية",
    "Fer 6% / حدid 6%",
    "Fer 6% / حديد 6%",
    "Oligo-éléments / عناصر صغri",
    "Oligo-éléments / عناصر صغري",
    "GZB Stimulateur de racines / منشط جذور"
  ],
  D: [
    "Acide Nitrique / حامض نيتريك",
    "Acide Nitrique / حامض nيتريك",
    "Acide Phosphorique / حامض فوسفوريك",
    "Acide Citrique / حامض سيتريك",
    "Acide Ascorbique / اسكوربيك اسيد",
    "Acide Ascorbique / اسكوربيك اسid"
  ]
};

function getProductsForBac(bac: "A" | "B" | "C" | "D") {
  const allowed = CLEANED_BAC_PRODUCTS[bac];
  const list: typeof FERTILIZER_DATABASE = [];
  for (const name of allowed) {
    const found = FERTILIZER_DATABASE.find((p) => p.name === name);
    if (found && !list.some((p) => p.name === found.name)) {
      list.push(found);
    }
  }
  return list;
}

const DEFAULT_PULV_ELEMENTS = ["Bore", "Zinc", "Algues", "Oligo", "Calcium"];

export function RecommendationForm({
  open,
  onOpenChange,
  recoToEdit = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recoToEdit?: Recommendation | null;
}) {
  const { create, update } = useRecommendationActions();
  const products = useProducts();
  const { add: addProduct } = useProductActions();
  const { t } = useTranslation();

  const foliarProducts = useMemo(() => {
    return products.filter((p) =>
      p.type.toLowerCase().includes("pulv") ||
      p.type.toLowerCase().includes("foliar") ||
      p.type.toLowerCase().includes("foliaire")
    );
  }, [products]);

  const phytoProductsList = useMemo(() => {
    return products.filter((p) =>
      p.type.toLowerCase().includes("phyto")
    );
  }, [products]);

  const phytoDropdownOptions = useMemo(() => {
    const list: { name: string; cible: string; dosage: string; price: string; dar: string }[] = [];
    for (const item of PHYTO_DATABASE) {
      list.push({
        name: item.name,
        cible: item.cible,
        dosage: item.dosage,
        price: item.price,
        dar: item.dar,
      });
    }
    for (const item of phytoProductsList) {
      if (!list.some(x => x.name.toLowerCase() === item.name.toLowerCase())) {
        list.push({
          name: item.name,
          cible: item.note || "",
          dosage: "",
          price: item.price.toString(),
          dar: item.solubility ? `${item.solubility}j` : "",
        });
      }
    }
    return list;
  }, [phytoProductsList]);

  // Basic Info
  const [selectedPrescriptions, setSelectedPrescriptions] = useState<string[]>(["fert_irrigation"]);
  const [cropGroups, setCropGroups] = useState<CropGroup[]>([]);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [createdAtDate, setCreatedAtDate] = useState(new Date().toISOString().slice(0, 10));
  const [appDate, setAppDate] = useState("");

  useEffect(() => {
    if (appDate) {
      setFertDate(appDate);
      setPulvDate(appDate);
      setPhyDate(appDate);
    }
  }, [appDate]);

  // Product Creation Modal States
  const [newProductDialogOpen, setNewProductDialogOpen] = useState(false);
  const [newProductType, setNewProductType] = useState<"foliar" | "phyto">("foliar");
  const [newProductName, setNewProductName] = useState("");
  const [newProductUnit, setNewProductUnit] = useState("kg");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [newProductCible, setNewProductCible] = useState("");
  const [newProductDosage, setNewProductDosage] = useState("");
  const [newProductDar, setNewProductDar] = useState("");

  // Sub-Form 1: Fertilisation par Irrigation
  const [fertDate, setFertDate] = useState("");
  const [fertFrequency, setFertFrequency] = useState("1");
  const [fertBac, setFertBac] = useState<"A" | "B" | "C" | "D">("A");
  const [fertEntries, setFertEntries] = useState<any[]>([
    { bac: "A", items: [] },
    { bac: "B", items: [] },
    { bac: "C", items: [] },
    { bac: "D", items: [] },
  ]);
  const [fertIrrigationTime, setFertIrrigationTime] = useState("1h30");
  const [fertInjectionTime, setFertInjectionTime] = useState(45);
  const [fertRinsingTime, setFertRinsingTime] = useState(10);

  const totalMin =
    fertIrrigationTime === "1h"
      ? 60
      : fertIrrigationTime === "1h30"
        ? 90
        : fertIrrigationTime === "2h"
          ? 120
          : fertIrrigationTime === "2h30"
            ? 150
            : fertIrrigationTime === "3h"
              ? 180
              : 90;
  const wettingMin = Math.max(0, totalMin - fertInjectionTime - fertRinsingTime);

  // Sub-Form 2: Fertilisation par Pulvérisation
  const [pulvDate, setPulvDate] = useState("");
  const [pulvItems, setPulvItems] = useState<any[]>([
    { name: "", qty: "", unit: "kg", price: "" }
  ]);

  // Sub-Form 3: Phytosanitaire
  const [phyDate, setPhyDate] = useState("");
  const [phyProducts, setPhyProducts] = useState<any[]>([
    { product: "", cible: "", dosage: "", volume: "1000", price: "", dar: "" }
  ]);

  useEffect(() => {
    if (open && recoToEdit) {
      setTitle(
        recoToEdit.title
          .replace(" (Irrigation)", "")
          .replace(" (Foliaire)", "")
          .replace(" (Phyto)", "")
      );
      setComment(recoToEdit.comment || "");
      setCreatedAtDate(recoToEdit.created_at.slice(0, 10));

      const payload = (recoToEdit.payload || {}) as any;
      const cropGroup = payload.crop_group;
      if (Array.isArray(cropGroup)) {
        setCropGroups(cropGroup as CropGroup[]);
      } else if (cropGroup) {
        setCropGroups([cropGroup as CropGroup]);
      } else {
        setCropGroups([]);
      }

      if (recoToEdit.kind === "fertilisation") {
        if (payload.method === "irrigation") {
          setSelectedPrescriptions(["fert_irrigation"]);
          const prog = payload.program || {};
          setFertDate(prog.date || "");
          setAppDate(prog.date || "");
          setFertFrequency(String(prog.frequency || "1"));
          setFertIrrigationTime(prog.irrigationTime || "1h30");
          setFertInjectionTime(prog.injectionTime || 45);
          setFertRinsingTime(prog.rinsingTime || 10);
          setFertEntries(
            prog.entries || [
              { bac: "A", items: [] },
              { bac: "B", items: [] },
              { bac: "C", items: [] },
              { bac: "D", items: [] },
            ]
          );
        } else {
          setSelectedPrescriptions(["fert_pulverisation"]);
          const prog = payload.program || {};
          setPulvDate(prog.date || "");
          setAppDate(prog.date || "");
          setPulvItems(prog.items || [{ name: "", qty: "", unit: "kg", price: "" }]);
        }
      } else if (recoToEdit.kind === "phytosanitaire") {
        setSelectedPrescriptions(["phytosanitaire"]);
        const prog = payload.program || {};
        setPhyDate(prog.date || "");
        setAppDate(prog.date || "");
        setPhyProducts(
          prog.products || [
            { product: "", cible: "", dosage: "", volume: "1000", price: "", dar: "" },
          ]
        );
      }
    } else if (open && !recoToEdit) {
      reset();
    }
  }, [open, recoToEdit]);

  function reset() {
    setSelectedPrescriptions(["fert_irrigation"]);
    setCropGroups([]);
    setTitle("");
    setComment("");
    setFiles([]);
    setCreatedAtDate(new Date().toISOString().slice(0, 10));
    setAppDate("");
    setFertDate("");
    setFertFrequency("1");
    setFertBac("A");
    setFertEntries([
      { bac: "A", items: [] },
      { bac: "B", items: [] },
      { bac: "C", items: [] },
      { bac: "D", items: [] },
    ]);
    setFertIrrigationTime("1h30");
    setFertInjectionTime(45);
    setFertRinsingTime(10);
    setPulvDate("");
    setPulvItems([{ name: "", qty: "", unit: "kg", price: "" }]);
    setPhyDate("");
    setPhyProducts([{ product: "", cible: "", dosage: "", volume: "1000", price: "", dar: "" }]);
  }

  // Fertilisation Irrigation handlers
  function addFertRow() {
    const allowed = getProductsForBac(fertBac);
    const def = allowed[0] || FERTILIZER_DATABASE[0];
    const newItem = {
      name: def.name,
      unit: def.unit,
      qty: "",
      price: def.price.toString(),
      solubility: def.solubility,
      time: def.time,
      note: def.note,
    };
    setFertEntries(prev => prev.map(e => e.bac === fertBac ? { ...e, items: [...e.items, newItem] } : e));
  }

  function updateFertItem(idx: number, patch: any) {
    setFertEntries(prev => prev.map(e => {
      if (e.bac !== fertBac) return e;
      return {
        ...e,
        items: e.items.map((it: any, i: number) => i === idx ? { ...it, ...patch } : it)
      };
    }));
  }

  function handleFertProductChange(idx: number, productName: string) {
    const p = FERTILIZER_DATABASE.find(x => x.name === productName);
    if (!p) return;
    updateFertItem(idx, {
      name: p.name,
      unit: p.unit,
      price: p.price.toString(),
      solubility: p.solubility,
      time: p.time,
      note: p.note
    });
  }

  function removeFertRow(idx: number) {
    setFertEntries(prev => prev.map(e => {
      if (e.bac !== fertBac) return e;
      return {
        ...e,
        items: e.items.filter((_: any, i: number) => i !== idx)
      };
    }));
  }

  // Pulverisation handlers
  function addPulvRow() {
    setPulvItems(prev => [...prev, { name: "", qty: "", unit: "kg", price: "" }]);
  }
  function updatePulvItem(idx: number, patch: any) {
    setPulvItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
  }
  function removePulvRow(idx: number) {
    setPulvItems(prev => prev.filter((_, i) => i !== idx));
  }

  // Phytosanitaire handlers
  function addPhyRow() {
    setPhyProducts(prev => [...prev, { product: "", cible: "", dosage: "", volume: "1000", price: "", dar: "" }]);
  }
  function updatePhyItem(idx: number, patch: any) {
    setPhyProducts(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
  }
  function removePhyRow(idx: number) {
    setPhyProducts(prev => prev.filter((_, i) => i !== idx));
  }

  async function submit() {
    if (!title.trim()) return toast.error(t("reco.form.errorTitleRequired"));
    if (cropGroups.length === 0) return toast.error(t("reco.form.errorCropRequired"));
    if (selectedPrescriptions.length === 0) return toast.error(t("reco.form.errorPrescriptionRequired"));

    setSubmitting(true);
    try {
      let photo_urls: string[] = [];
      if (files.length > 0) photo_urls = await uploadRecommendationPhotos(files);

      // Calculate time of day to preserve current time for ordering
      const now = new Date();
      const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      const createdAtIso = new Date(`${createdAtDate}T${timeString}`).toISOString();

      if (recoToEdit) {
        const presc = selectedPrescriptions[0];
        let currentKind: RecoKind = "fertilisation";
        let currentPayload: any = null;
        let currentTitle = title.trim();

        if (presc === "fert_irrigation") {
          if (!fertDate) {
            setSubmitting(false);
            return toast.error(t("reco.form.errorFertDateRequired"));
          }
          const activeEntries = fertEntries.filter(e => e.items.length > 0);
          if (activeEntries.length === 0) {
            setSubmitting(false);
            return toast.error(t("reco.form.errorNoFertilizerAdded"));
          }
          currentKind = "fertilisation";
          currentTitle = `${title.trim()} (Irrigation)`;
          currentPayload = {
            method: "irrigation",
            crop_group: cropGroups,
            program: {
              kind: "fertilisation",
              date: fertDate,
              frequency: parseFloat(fertFrequency) || 1,
              irrigationTime: fertIrrigationTime,
              injectionTime: fertInjectionTime,
              rinsingTime: fertRinsingTime,
              wettingTime: wettingMin,
              entries: activeEntries,
              total: 0
            }
          };
        } else if (presc === "fert_pulverisation") {
          if (!pulvDate) {
            setSubmitting(false);
            return toast.error(t("reco.form.errorPulvDateRequired"));
          }
          const activeItems = pulvItems.filter(it => it.name && it.qty);
          if (activeItems.length === 0) {
            setSubmitting(false);
            return toast.error(t("reco.form.errorNoPulvElement"));
          }
          currentKind = "fertilisation";
          currentTitle = `${title.trim()} (Foliaire)`;
          currentPayload = {
            method: "pulverisation",
            crop_group: cropGroups,
            program: {
              kind: "pulverisation",
              date: pulvDate,
              items: activeItems,
              total: activeItems.reduce((s, it) => s + (parseFloat(it.qty) || 0) * (parseFloat(it.price) || 0), 0),
              weatherOk: true,
              weatherNote: "Validé par l'Ingénieur"
            }
          };
        } else if (presc === "phytosanitaire") {
          if (!phyDate) {
            setSubmitting(false);
            return toast.error(t("reco.form.errorPhyDateRequired"));
          }
          const activeProducts = phyProducts.filter(p => p.product);
          if (activeProducts.length === 0) {
            setSubmitting(false);
            return toast.error(t("reco.form.errorNoPhytoProduct"));
          }
          currentKind = "phytosanitaire";
          currentTitle = `${title.trim()} (Phyto)`;
          currentPayload = {
            method: "pulverisation",
            crop_group: cropGroups,
            program: {
              kind: "phytosanitaire",
              date: phyDate,
              products: activeProducts,
              total: activeProducts.reduce((s, p) => s + (parseFloat((p.price || "").replace(",", ".")) || 0), 0),
              weatherOk: true,
              weatherNote: "Validé par l'Ingénieur"
            }
          };
        }

        await update.mutateAsync({
          id: recoToEdit.id,
          title: currentTitle,
          comment: comment.trim() || `Recommandation agronomique pour les groupes ${cropGroups.join(", ")}`,
          parcel_ids: [],
          payload: currentPayload,
          photo_urls: [...recoToEdit.photo_urls, ...photo_urls],
        });
        toast.success(t("reco.form.successModified"));
      } else {
        for (const presc of selectedPrescriptions) {
          let currentKind: RecoKind = "fertilisation";
          let currentPayload: any = null;
          let currentTitle = title.trim();

          if (presc === "fert_irrigation") {
            if (!fertDate) {
              setSubmitting(false);
              return toast.error(t("reco.form.errorFertDateRequired"));
            }
            const activeEntries = fertEntries.filter(e => e.items.length > 0);
            if (activeEntries.length === 0) {
              setSubmitting(false);
              return toast.error(t("reco.form.errorNoFertilizerAdded"));
            }
            currentKind = "fertilisation";
            currentTitle = `${title.trim()} (Irrigation)`;
            currentPayload = {
              method: "irrigation",
              crop_group: cropGroups,
              program: {
                kind: "fertilisation",
                date: fertDate,
                frequency: parseFloat(fertFrequency) || 1,
                irrigationTime: fertIrrigationTime,
                injectionTime: fertInjectionTime,
                rinsingTime: fertRinsingTime,
                wettingTime: wettingMin,
                entries: activeEntries,
                total: 0
              }
            };
          } else if (presc === "fert_pulverisation") {
            if (!pulvDate) {
              setSubmitting(false);
              return toast.error(t("reco.form.errorPulvDateRequired"));
            }
            const activeItems = pulvItems.filter(it => it.name && it.qty);
            if (activeItems.length === 0) {
              setSubmitting(false);
              return toast.error(t("reco.form.errorNoPulvElement"));
            }
            currentKind = "fertilisation";
            currentTitle = `${title.trim()} (Foliaire)`;
            currentPayload = {
              method: "pulverisation",
              crop_group: cropGroups,
              program: {
                kind: "pulverisation",
                date: pulvDate,
                items: activeItems,
                total: activeItems.reduce((s, it) => s + (parseFloat(it.qty) || 0) * (parseFloat(it.price) || 0), 0),
                weatherOk: true,
                weatherNote: "Validé par l'Ingénieur"
              }
            };
          } else if (presc === "phytosanitaire") {
            if (!phyDate) {
              setSubmitting(false);
              return toast.error(t("reco.form.errorPhyDateRequired"));
            }
            const activeProducts = phyProducts.filter(p => p.product);
            if (activeProducts.length === 0) {
              setSubmitting(false);
              return toast.error(t("reco.form.errorNoPhytoProduct"));
            }
            currentKind = "phytosanitaire";
            currentTitle = `${title.trim()} (Phyto)`;
            currentPayload = {
              method: "pulverisation",
              crop_group: cropGroups,
              program: {
                kind: "phytosanitaire",
                date: phyDate,
                products: activeProducts,
                total: activeProducts.reduce((s, p) => s + (parseFloat((p.price || "").replace(",", ".")) || 0), 0),
                weatherOk: true,
                weatherNote: "Validé par l'Ingénieur"
              }
            };
          }

          await create.mutateAsync({
            kind: currentKind,
            title: currentTitle,
            comment: comment.trim() || `Recommandation agronomique pour les groupes ${cropGroups.join(", ")}`,
            parcel_ids: [],
            payload: currentPayload,
            photo_urls,
            created_at: createdAtIso,
          });
        }
        toast.success(t("reco.form.successSubmitted"));
      }

      reset();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("reco.form.errorProcessing"));
    } finally {
      setSubmitting(false);
    }
  }

  const currentBacEntry = fertEntries.find(e => e.bac === fertBac) || { bac: fertBac, items: [] };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl bg-card text-card-foreground">
        <DialogHeader className="border-b pb-2">
          <DialogTitle className="text-base font-black uppercase tracking-wide flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" /> {recoToEdit ? t("reco.form.edit") : t("reco.form.new")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-xs">
          {/* 1. Kinds Selectors */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-1.5 font-bold uppercase text-muted-foreground">{t("reco.form.prescriptionType")}</p>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: "fert_irrigation", label: t("reco.form.shortFertIrrigation"), icon: Droplet },
                  { id: "fert_pulverisation", label: t("reco.form.shortFertFoliar"), icon: SprayCan },
                  { id: "phytosanitaire", label: t("reco.form.shortPhyto"), icon: FlaskConical },
                ].map(({ id, label, icon: Icon }) => {
                  const active = selectedPrescriptions.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setSelectedPrescriptions(prev =>
                          prev.includes(id)
                            ? prev.filter(x => x !== id)
                            : [...prev, id]
                        );
                      }}
                      className={`flex flex-col items-center justify-center gap-1 rounded-xl border py-2 text-center transition-all font-bold ${
                        active ? "border-primary bg-primary/10 text-primary shadow-xs" : "border-input hover:bg-muted"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-[10px] leading-tight">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Espèce ciblée */}
            <div>
              <p className="mb-1.5 font-bold uppercase text-muted-foreground">{t("reco.form.cropTargeted")}</p>
              <div className="flex flex-wrap gap-1">
                {CROP_GROUPS.map((g) => (
                  <button
                    key={g.v}
                    type="button"
                    onClick={() => {
                      setCropGroups(prev =>
                        prev.includes(g.v)
                          ? prev.filter(x => x !== g.v)
                          : [...prev, g.v]
                      );
                    }}
                    className={`rounded-full border px-2.5 py-1.5 font-bold text-[10px] uppercase transition-all ${
                      cropGroups.includes(g.v)
                        ? "border-primary bg-primary text-primary-foreground shadow-xs"
                        : "border-input bg-background hover:bg-muted"
                    }`}
                  >
                    {t(`crop.${g.v}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Title & Comment */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="block">
              <span className="font-bold uppercase text-muted-foreground">{t("reco.form.title")}</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("reco.form.titlePlaceholder")}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="font-bold uppercase text-muted-foreground">{t("reco.form.creationDate")}</span>
              <input
                type="date"
                value={createdAtDate}
                onChange={(e) => setCreatedAtDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="font-bold uppercase text-muted-foreground">{t("reco.form.globalAppDate")}</span>
              <input
                type="date"
                value={appDate}
                onChange={(e) => setAppDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </label>
          </div>

          {/* ========================================================= */}
          {/* NESTED FORM SECTION (EMBEDDING THE ADMIN INTERFACES)       */}
          {/* ========================================================= */}
          {cropGroups.length > 0 && selectedPrescriptions.length > 0 && (
            <div className="space-y-4">
              {selectedPrescriptions.map((presc) => {
                if (presc === "fert_irrigation") {
                  return (
                    <div key={presc} className="border rounded-2xl p-4 bg-muted/30 space-y-3">
                      <h4 className="font-black text-xs text-primary uppercase border-b pb-1 flex items-center gap-1.5">
                        <Droplet className="h-4 w-4 text-sky-600" />
                        <span>{t("reco.form.fertilizerIrrigation")}</span>
                      </h4>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="block">
                            <span className="font-bold text-muted-foreground">{t("reco.form.appDate")}</span>
                            <div className="mt-1 w-full rounded border border-input bg-muted/40 px-3 py-1.5 font-bold text-muted-foreground text-center">
                              {appDate || t("gen.undefined")}
                            </div>
                          </div>
                          <label className="block">
                            <span className="font-bold text-muted-foreground">{t("reco.form.frequency")}</span>
                            <select
                              value={fertFrequency}
                              onChange={(e) => setFertFrequency(e.target.value)}
                              className="mt-1 w-full rounded border border-input bg-background px-3 py-1.5 text-xs font-semibold"
                            >
                              <option value="7">{t("reco.freq.daily")}</option>
                              <option value="3.5">{t("reco.freq.every2")}</option>
                              <option value="2.3">{t("reco.freq.every3")}</option>
                              <option value="1">{t("reco.freq.weekly")}</option>
                            </select>
                          </label>
                        </div>

                        {/* Temps d'irrigation detail fields */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-t pt-2 mt-2">
                          <label className="block">
                            <span className="font-bold text-muted-foreground">{t("reco.form.irrigationTime")}</span>
                            <select
                              value={fertIrrigationTime}
                              onChange={(e) => setFertIrrigationTime(e.target.value)}
                              className="mt-1 w-full rounded border border-input bg-background px-2 py-1.5"
                            >
                              <option value="1h">1h</option>
                              <option value="1h30">1h30</option>
                              <option value="2h">2h</option>
                              <option value="2h30">2h30</option>
                              <option value="3h">3h</option>
                            </select>
                          </label>
                          <label className="block">
                            <span className="font-bold text-muted-foreground">{t("reco.form.injectionTime")}</span>
                            <input
                              type="number"
                              value={fertInjectionTime}
                              onChange={(e) => setFertInjectionTime(parseInt(e.target.value) || 0)}
                              className="mt-1 w-full rounded border border-input bg-background px-2 py-1.5"
                            />
                          </label>
                          <label className="block">
                            <span className="font-bold text-muted-foreground">{t("reco.form.rinsingTime")}</span>
                            <input
                              type="number"
                              value={fertRinsingTime}
                              onChange={(e) => setFertRinsingTime(parseInt(e.target.value) || 0)}
                              className="mt-1 w-full rounded border border-input bg-background px-2 py-1.5"
                            />
                          </label>
                          <label className="block">
                            <span className="font-bold text-muted-foreground">{t("reco.form.wettingTime")}</span>
                            <input
                              type="text"
                              disabled
                              value={`${wettingMin} ${t("gen.minutes")}`}
                              className="mt-1 w-full rounded border bg-muted/40 px-2 py-1.5 font-bold text-foreground text-center"
                            />
                          </label>
                        </div>

                        {/* Bac Selector */}
                        <div className="space-y-1">
                          <span className="font-bold text-muted-foreground">{t("reco.form.bacSelect")}</span>
                          <div className="grid grid-cols-4 gap-1.5">
                            {(["A", "B", "C", "D"] as const).map((b) => {
                              const filled = fertEntries.find(e => e.bac === b && e.items.length > 0);
                              return (
                                <button
                                  key={b}
                                  type="button"
                                  onClick={() => setFertBac(b)}
                                  className={`rounded-lg border py-2 font-black transition-all ${
                                    fertBac === b
                                      ? "border-primary bg-primary text-primary-foreground shadow-xs"
                                      : filled
                                      ? "border-olive-mid bg-olive-mid/10 text-olive-dark"
                                      : "border-input bg-background text-muted-foreground hover:bg-muted"
                                  }`}
                                >
                                  {t("reco.form.bac")} {b}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Bac Items Table */}
                        <div className="rounded-xl border bg-card p-3 space-y-2">
                          <div className="flex justify-between items-center border-b pb-1">
                            <span className="font-extrabold uppercase text-primary text-[10px]">{t("reco.form.bacAuthorized").replace("{bac}", fertBac)}</span>
                            <button
                              type="button"
                              onClick={addFertRow}
                              className="bg-olive-mid/10 hover:bg-olive-mid/20 text-olive-dark px-2 py-1 rounded font-bold text-[10px]"
                            >
                              {t("reco.form.addFertilizer")}
                            </button>
                          </div>

                          {currentBacEntry.items.length === 0 ? (
                            <p className="text-center py-4 text-muted-foreground">{t("reco.form.noFertilizer")}</p>
                          ) : (
                            <div className="space-y-2">
                              {currentBacEntry.items.map((it: any, idx: number) => (
                                <div key={idx} className="grid grid-cols-12 gap-2 items-center border-b pb-2">
                                  {/* Product dropdown */}
                                  <select
                                    value={it.name}
                                    onChange={(e) => handleFertProductChange(idx, e.target.value)}
                                    className="col-span-6 rounded border bg-background px-2 py-1 text-xs"
                                  >
                                    {getProductsForBac(fertBac).map(p => (
                                      <option key={p.name} value={p.name}>{p.name}</option>
                                    ))}
                                  </select>

                                  {/* Dose / Ha */}
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder={t("reco.form.doseHa")}
                                    value={it.qty}
                                    onChange={(e) => updateFertItem(idx, { qty: e.target.value })}
                                    className="col-span-3 rounded border bg-background px-2 py-1 text-right text-xs"
                                  />
                                  
                                  <span className="col-span-2 text-center font-bold text-muted-foreground">{it.unit}</span>

                                  <button
                                    type="button"
                                    onClick={() => removeFertRow(idx)}
                                    className="col-span-1 text-muted-foreground hover:text-destructive flex justify-center"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }

                if (presc === "fert_pulverisation") {
                  return (
                    <div key={presc} className="border rounded-2xl p-4 bg-muted/30 space-y-3">
                      <h4 className="font-black text-xs text-primary uppercase border-b pb-1 flex items-center gap-1.5">
                        <SprayCan className="h-4 w-4 text-emerald-600" />
                        <span>{t("reco.form.fertilizerFoliar")}</span>
                      </h4>
                      <div className="space-y-3">
                        <div className="block max-w-xs">
                          <span className="font-bold text-muted-foreground">{t("reco.form.appDate")}</span>
                          <div className="mt-1 w-full rounded border border-input bg-muted/40 px-3 py-1.5 font-bold text-muted-foreground text-center">
                            {appDate || t("gen.undefined")}
                          </div>
                        </div>
 
                        <div className="space-y-2">
                          <div className="flex justify-between items-center border-b pb-1">
                            <span className="font-extrabold uppercase text-primary text-[10px]">{t("reco.form.elementsPulv")}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setNewProductType("foliar");
                                setNewProductName("");
                                setNewProductPrice("");
                                setNewProductUnit("kg");
                                setNewProductDialogOpen(true);
                              }}
                              className="bg-primary/10 hover:bg-primary/20 text-primary px-2 py-0.5 rounded font-bold text-[10px]"
                            >
                              {t("reco.form.newFoliar")}
                            </button>
                          </div>
                          <div className="grid grid-cols-12 gap-2 text-[10px] font-bold uppercase text-muted-foreground px-1 border-b">
                            <span className="col-span-5">{t("reco.form.element")}</span>
                            <span className="col-span-3 text-right">{t("reco.form.dosage")}</span>
                            <span className="col-span-2 text-center">{t("reco.form.unit")}</span>
                            <span className="col-span-2"></span>
                          </div>

                          {pulvItems.map((it, idx) => (
                            <div key={idx} className="grid grid-cols-12 gap-2">
                              <select
                                value={it.name}
                                onChange={(e) => {
                                  const pName = e.target.value;
                                  const prod = products.find(p => p.name === pName);
                                  updatePulvItem(idx, {
                                    name: pName,
                                    unit: prod ? prod.unit : "kg",
                                    price: prod ? prod.price.toString() : "0"
                                  });
                                }}
                                className="col-span-5 rounded border bg-background px-2 py-1 text-xs"
                              >
                                <option value="">{t("reco.form.choose")}</option>
                                {foliarProducts.map(p => (
                                  <option key={p.name} value={p.name}>{p.name}</option>
                                ))}
                              </select>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={it.qty}
                                onChange={(e) => updatePulvItem(idx, { qty: e.target.value })}
                                placeholder={t("reco.form.qty")}
                                className="col-span-3 rounded border bg-background px-2 py-1 text-right text-xs"
                              />
                              <input
                                value={it.unit}
                                disabled
                                placeholder={t("reco.form.unit")}
                                className="col-span-2 rounded border bg-muted/40 px-2 py-1 text-center text-xs text-muted-foreground"
                              />
                              <button
                                type="button"
                                onClick={() => removePulvRow(idx)}
                                className="col-span-2 text-muted-foreground hover:text-destructive flex justify-center items-center"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ))}

                          <button
                            type="button"
                            onClick={addPulvRow}
                            className="bg-primary/5 hover:bg-primary/10 text-primary border border-dashed px-3 py-1.5 rounded-lg w-full font-bold text-[10px]"
                          >
                            {t("reco.form.addElementPulv")}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (presc === "phytosanitaire") {
                  return (
                    <div key={presc} className="border rounded-2xl p-4 bg-muted/30 space-y-3">
                      <h4 className="font-black text-xs text-primary uppercase border-b pb-1 flex items-center gap-1.5">
                        <FlaskConical className="h-4 w-4 text-emerald-600" />
                        <span>{t("reco.form.phytosanitaire")}</span>
                      </h4>
                      <div className="space-y-3">
                        <div className="block max-w-xs">
                          <span className="font-bold text-muted-foreground">{t("reco.form.appDate")}</span>
                          <div className="mt-1 w-full rounded border border-input bg-muted/40 px-3 py-1.5 font-bold text-muted-foreground text-center">
                            {appDate || t("gen.undefined")}
                          </div>
                        </div>
 
                        <div className="space-y-3">
                          <div className="flex justify-between items-center border-b pb-1">
                            <span className="font-extrabold uppercase text-primary text-[10px]">{t("reco.form.phytoActives")}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setNewProductType("phyto");
                                setNewProductName("");
                                setNewProductPrice("");
                                setNewProductCible("");
                                setNewProductDosage("");
                                setNewProductDar("");
                                setNewProductUnit("kg");
                                setNewProductDialogOpen(true);
                              }}
                              className="bg-primary/10 hover:bg-primary/20 text-primary px-2 py-0.5 rounded font-bold text-[10px]"
                            >
                              {t("reco.form.newPhyto")}
                            </button>
                          </div>

                          {phyProducts.map((p, idx) => (
                            <div key={idx} className="p-3 border rounded-xl bg-card space-y-2 relative">
                              <button
                                type="button"
                                onClick={() => removePhyRow(idx)}
                                className="absolute right-2 top-2 text-muted-foreground hover:text-destructive"
                              >
                                <X className="h-4 w-4" />
                              </button>
 
                              <span className="font-bold text-muted-foreground">{t("reco.form.activeName")} {idx + 1}</span>
 
                              <div className="grid grid-cols-2 gap-2">
                                <select
                                  value={p.product}
                                  onChange={(e) => {
                                    const pName = e.target.value;
                                    const details = getPhytoProductDetails(pName, products);
                                    updatePhyItem(idx, {
                                      product: pName,
                                      price: details ? details.price : "0",
                                      dar: details ? details.dar : "",
                                      cible: details ? details.cible : "",
                                      dosage: details ? details.dosage : "",
                                    });
                                  }}
                                  className="rounded border bg-background px-2 py-1 text-xs col-span-2 font-semibold"
                                >
                                  <option value="">{t("reco.form.chooseActive")}</option>
                                  {phytoDropdownOptions.map(pr => (
                                    <option key={pr.name} value={pr.name}>{pr.name}</option>
                                  ))}
                                </select>
                                <input
                                  placeholder={t("reco.form.cible")}
                                  value={p.cible}
                                  onChange={(e) => updatePhyItem(idx, { cible: e.target.value })}
                                  className="rounded border bg-background px-2 py-1 text-xs"
                                />
                                <input
                                  placeholder={t("reco.form.dosageEx")}
                                  inputMode="decimal"
                                  value={p.dosage}
                                  onChange={(e) => updatePhyItem(idx, { dosage: e.target.value })}
                                  className="rounded border bg-background px-2 py-1 text-xs"
                                />
                                <input
                                  placeholder={t("reco.form.volume")}
                                  inputMode="decimal"
                                  value={p.volume}
                                  onChange={(e) => updatePhyItem(idx, { volume: e.target.value })}
                                  className="rounded border bg-background px-2 py-1 text-xs"
                                />
                                <input
                                  placeholder={t("reco.form.darLabel")}
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  value={p.dar}
                                  onChange={(e) => updatePhyItem(idx, { dar: e.target.value })}
                                  className="rounded border bg-background px-2 py-1 text-xs"
                                />
                              </div>
                            </div>
                          ))}
 
                          <button
                            type="button"
                            onClick={addPhyRow}
                            className="bg-primary/5 hover:bg-primary/10 text-primary border border-dashed px-3 py-1.5 rounded-lg w-full font-bold text-[10px]"
                          >
                            {t("reco.form.addActive")}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          )}

          {/* Photos Upload */}
          <div>
            <p className="mb-1 font-bold uppercase text-muted-foreground">
              {t("reco.form.photos")} ({files.length}/6)
            </p>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed px-3 py-2 text-muted-foreground hover:bg-muted/40 transition-all font-semibold">
              <Camera className="h-4 w-4" />
              {t("reco.form.addPhotos")}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const list = Array.from(e.target.files ?? []);
                  if (list.length) setFiles((f) => [...f, ...list].slice(0, 6));
                  e.currentTarget.value = "";
                }}
              />
            </label>
            {files.length > 0 && (
              <ul className="mt-2 grid grid-cols-4 gap-2">
                {files.map((f, i) => (
                  <li key={i} className="relative group border rounded-lg overflow-hidden">
                    <span className="truncate block p-1 max-w-full text-[9px] font-semibold bg-muted text-center">{f.name}</span>
                    <button
                      onClick={() => setFiles((arr) => arr.filter((_, idx) => idx !== i))}
                      className="absolute right-1 top-1 bg-destructive text-white rounded-full p-0.5"
                      type="button"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            onClick={submit}
            disabled={submitting}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold uppercase text-primary-foreground active:scale-95 disabled:opacity-50 shadow-md"
          >
            <Send className="h-4 w-4" /> {submitting ? t("gen.sending") : (recoToEdit ? t("reco.form.saveChanges") : t("reco.form.submit"))}
          </button>
        </div>
      </DialogContent>

      {/* Product Creation Dialog */}
      <Dialog open={newProductDialogOpen} onOpenChange={setNewProductDialogOpen}>
        <DialogContent className="max-w-md bg-card text-card-foreground text-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase tracking-wide">
              {newProductType === "foliar" ? t("reco.form.createFoliar") : t("reco.form.createPhyto")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="font-bold text-muted-foreground uppercase text-[10px]">{t("reco.form.productName")}</Label>
              <Input
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                placeholder={t("reco.form.productNamePlaceholder")}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="font-bold text-muted-foreground uppercase text-[10px]">{t("reco.form.unit")}</Label>
                <select
                  value={newProductUnit}
                  onChange={(e) => setNewProductUnit(e.target.value)}
                  className="mt-1 w-full rounded border border-input bg-background px-3 py-2 text-sm font-semibold"
                >
                  <option value="kg">kg</option>
                  <option value="litres">litres</option>
                </select>
              </div>
              <div>
                <Label className="font-bold text-muted-foreground uppercase text-[10px]">{t("reco.form.price")}</Label>
                <Input
                  type="number"
                  value={newProductPrice}
                  onChange={(e) => setNewProductPrice(e.target.value)}
                  placeholder={t("reco.form.pricePlaceholder")}
                  className="mt-1"
                />
              </div>
            </div>
            {newProductType === "phyto" && (
              <>
                <div>
                  <Label className="font-bold text-muted-foreground uppercase text-[10px]">{t("reco.form.cibleLabel")}</Label>
                  <Input
                    value={newProductCible}
                    onChange={(e) => setNewProductCible(e.target.value)}
                    placeholder={t("reco.form.ciblePlaceholder")}
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="font-bold text-muted-foreground uppercase text-[10px]">{t("reco.form.dosageDefault")}</Label>
                    <Input
                      value={newProductDosage}
                      onChange={(e) => setNewProductDosage(e.target.value)}
                      placeholder={t("reco.form.dosagePlaceholder")}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="font-bold text-muted-foreground uppercase text-[10px]">{t("reco.form.darLabel")}</Label>
                    <Input
                      type="number"
                      value={newProductDar}
                      onChange={(e) => setNewProductDar(e.target.value)}
                      placeholder={t("reco.form.darLabel")}
                      className="mt-1"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setNewProductDialogOpen(false)}>
              {t("irr.cancel")}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (!newProductName.trim()) {
                  return toast.error(t("reco.form.errorProductNameRequired"));
                }
                const isPhyto = newProductType === "phyto";
                const noteValue = isPhyto
                  ? JSON.stringify({ cible: newProductCible.trim(), dosage: newProductDosage.trim() })
                  : "";
                
                addProduct({
                  name: newProductName.trim(),
                  type: isPhyto ? "phytosanitaire" : "foliaire",
                  solubility: isPhyto ? (parseFloat(newProductDar) || 0) : 0,
                  time: 0,
                  note: noteValue,
                  price: parseFloat(newProductPrice) || 0,
                  unit: newProductUnit as "kg" | "litres",
                });
                
                toast.success(t("reco.form.successProductCreated"));
                setNewProductDialogOpen(false);
              }}
            >
              {t("irr.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
