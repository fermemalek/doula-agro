import { useState, useMemo, useEffect } from "react";
import { Droplet, FlaskConical, SprayCan, Send, Camera, X, Plus, Trash2, Info, AlertTriangle, Sparkles, CheckCircle2, Copy } from "lucide-react";
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
import { PHYTO_DATABASE, getMatiereActive, getMatiereActiveAr, getIracFracCode, checkTankMixCompatibility, type TankMixCheckResult } from "@/data/phytosanitaires";
import { useTranslation } from "@/lib/i18n";
import { PhytoHistoryModal } from "@/components/ingenieur/PhytoHistoryModal";
import { PhytoAdvisorModal } from "@/components/ingenieur/PhytoAdvisorModal";
import { ACTIVE_INGREDIENTS_DATABASE } from "@/lib/phyto/database";
import { History } from "lucide-react";
import { useSuppliers, useSupplierActions } from "@/lib/suppliers-store";
import { useModuleActions } from "@/lib/modules-store";
import { useParcels } from "@/lib/parcel-store";
import { validateRecommendationAndPurchases } from "@/lib/reco-validation";
import { matchProductName } from "@/lib/stock-alerts";

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
      } catch (e) { }
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
  isDuplicate = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recoToEdit?: Recommendation | null;
  isDuplicate?: boolean;
}) {
  const { create, update, remove, accept } = useRecommendationActions();
  const products = useProducts();
  const suppliers = useSuppliers();
  const parcels = useParcels();
  const { addPurchase } = useSupplierActions();
  const { add: addModuleRecord } = useModuleActions();
  const { add: addProduct } = useProductActions();
  const { t, lang } = useTranslation();
  const isAr = lang === "ar";
  const [duplicateMode, setDuplicateMode] = useState(isDuplicate);

  useEffect(() => {
    setDuplicateMode(isDuplicate);
  }, [isDuplicate, open]);

  const getLiveStock = (prodName: string): number => {
    if (!prodName) return 0;
    return suppliers
      .filter((p) => matchProductName(p.productName, prodName))
      .reduce((sum, p) => sum + Math.max(0, p.quantity - (p.consumed || 0)), 0);
  };

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
    const list: { name: string; matiereActive: string; cible: string; dosage: string; price: string; dar: string }[] = [];
    for (const item of PHYTO_DATABASE) {
      list.push({
        name: item.name,
        matiereActive: item.matiereActive || getMatiereActive(item.name),
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
          matiereActive: (item as any).matiereActive || getMatiereActive(item.name),
          cible: item.note || "",
          dosage: "",
          price: item.price.toString(),
          dar: item.solubility ? `${item.solubility}j` : "",
        });
      }
    }
    for (const ing of ACTIVE_INGREDIENTS_DATABASE) {
      if (!list.some(x => x.name.toLowerCase() === ing.name.toLowerCase())) {
        list.push({
          name: ing.name,
          matiereActive: ing.name,
          cible: ing.codeGroup,
          dosage: ing.standardDose,
          price: "0",
          dar: `${ing.phiDays}j`,
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

  // Une seule date globale d'application (appDate) pour toute la recommandation

  // Product Creation Modal States
  const [newProductDialogOpen, setNewProductDialogOpen] = useState(false);
  const [newProductType, setNewProductType] = useState<"foliar" | "phyto">("foliar");
  const [newProductName, setNewProductName] = useState("");
  const [newProductUnit, setNewProductUnit] = useState("kg");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [newProductCible, setNewProductCible] = useState("");
  const [newProductDosage, setNewProductDosage] = useState("");
  const [newProductDar, setNewProductDar] = useState("");

  // Sub-Form 1: Fertilisation par Irrigation (Multi-programmes A1, A2...)
  interface FertProgramItem {
    id: string;
    label: string; // Ex: "Programme A1", "Programme A2"
    date?: string;
    period: "matin" | "soir";
    frequency: string;
    pureIrrigationFrequency: string; // Fréquence d'irrigation seule sans fertilisation (0, 1, 2, 3...)
    pureIrrigationTime: string; // Durée irrigation seule (ex: "1h30")
    irrigationTime: string;
    injectionTime: number;
    rinsingTime: number;
    activeBac: "A" | "B" | "C" | "D";
    entries: { bac: "A" | "B" | "C" | "D"; items: any[] }[];
  }

  const createDefaultFertProgram = (id: string, label: string, defaultDate?: string): FertProgramItem => ({
    id,
    label,
    date: defaultDate,
    period: "matin",
    frequency: "2",
    pureIrrigationFrequency: "1",
    pureIrrigationTime: "1h30",
    irrigationTime: "1h30",
    injectionTime: 45,
    rinsingTime: 10,
    activeBac: "A",
    entries: [
      { bac: "A", items: [] },
      { bac: "B", items: [] },
      { bac: "C", items: [] },
      { bac: "D", items: [] },
    ],
  });

  const [fertPrograms, setFertPrograms] = useState<FertProgramItem[]>([
    createDefaultFertProgram("fert_1", "Programme A1"),
  ]);

  // Backward compatibility state pointers
  const [activeFertProgIndex, setActiveFertProgIndex] = useState(0);
  const currentFertProg = fertPrograms[activeFertProgIndex] || fertPrograms[0];
  const fertBac = currentFertProg.activeBac;
  const setFertBac = (b: "A" | "B" | "C" | "D") => {
    setFertPrograms(prev => prev.map((fp, i) => i === activeFertProgIndex ? { ...fp, activeBac: b } : fp));
  };
  const fertEntries = currentFertProg.entries;
  const setFertEntries = (fnOrVal: any[] | ((prev: any[]) => any[])) => {
    setFertPrograms(prev => prev.map((fp, i) => {
      if (i !== activeFertProgIndex) return fp;
      const nextEntries = typeof fnOrVal === "function" ? fnOrVal(fp.entries) : fnOrVal;
      return { ...fp, entries: nextEntries };
    }));
  };
  const fertIrrigationTime = currentFertProg.irrigationTime;
  const setFertIrrigationTime = (val: string) => {
    setFertPrograms(prev => prev.map((fp, i) => i === activeFertProgIndex ? { ...fp, irrigationTime: val } : fp));
  };
  const fertInjectionTime = currentFertProg.injectionTime;
  const setFertInjectionTime = (val: number) => {
    setFertPrograms(prev => prev.map((fp, i) => i === activeFertProgIndex ? { ...fp, injectionTime: val } : fp));
  };
  const fertRinsingTime = currentFertProg.rinsingTime;
  const setFertRinsingTime = (val: number) => {
    setFertPrograms(prev => prev.map((fp, i) => i === activeFertProgIndex ? { ...fp, rinsingTime: val } : fp));
  };
  const fertFrequency = currentFertProg.frequency;
  const setFertFrequency = (val: string) => {
    setFertPrograms(prev => prev.map((fp, i) => i === activeFertProgIndex ? { ...fp, frequency: val } : fp));
  };
  const pureIrrFreq = currentFertProg.pureIrrigationFrequency ?? "1";
  const setPureIrrFreq = (val: string) => {
    setFertPrograms(prev => prev.map((fp, i) => i === activeFertProgIndex ? { ...fp, pureIrrigationFrequency: val } : fp));
  };
  const pureIrrTime = currentFertProg.pureIrrigationTime ?? "1h30";
  const setPureIrrTime = (val: string) => {
    setFertPrograms(prev => prev.map((fp, i) => i === activeFertProgIndex ? { ...fp, pureIrrigationTime: val } : fp));
  };
  const fertDate = currentFertProg.date;
  const setFertDate = (val: string) => {
    setFertPrograms(prev => prev.map((fp, i) => i === activeFertProgIndex ? { ...fp, date: val } : fp));
  };

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

  // Sub-Form 2: Fertilisation par Pulvérisation (Multi-pulvérisations 1, 2...)
  interface PulvPassageItem {
    id: string;
    label: string; // Ex: "Pulvérisation 1", "Pulvérisation 2"
    date?: string;
    period: "matin" | "soir";
    waterVolume: string; // Ex: 1000 L
    items: { name: string; qty: string; unit: string; price: string }[];
  }

  const createDefaultPulvPassage = (id: string, label: string, defaultDate?: string): PulvPassageItem => ({
    id,
    label,
    date: defaultDate,
    period: "matin",
    waterVolume: "1000",
    items: [{ name: "", qty: "", unit: "kg", price: "" }],
  });

  const [pulvPassages, setPulvPassages] = useState<PulvPassageItem[]>([
    createDefaultPulvPassage("pulv_1", "Pulvérisation 1"),
  ]);

  const [activePulvIndex, setActivePulvIndex] = useState(0);
  const currentPulvPassage = pulvPassages[activePulvIndex] || pulvPassages[0];
  const pulvDate = currentPulvPassage.date;
  const setPulvDate = (val: string) => {
    setPulvPassages(prev => prev.map((p, i) => i === activePulvIndex ? { ...p, date: val } : p));
  };
  const pulvItems = currentPulvPassage.items;
  const setPulvItems = (fnOrVal: any[] | ((prev: any[]) => any[])) => {
    setPulvPassages(prev => prev.map((p, i) => {
      if (i !== activePulvIndex) return p;
      const nextItems = typeof fnOrVal === "function" ? fnOrVal(p.items) : fnOrVal;
      return { ...p, items: nextItems };
    }));
  };

  // Sub-Form 3: Phytosanitaire (Multi-traitements 1, 2...)
  interface PhytoPassageItem {
    id: string;
    label: string; // Ex: "Traitement 1", "Traitement 2"
    date?: string;
    period: "matin" | "soir";
    products: { product: string; cible: string; dosage: string; volume: string; price: string; dar: string }[];
  }

  const createDefaultPhytoPassage = (id: string, label: string, defaultDate?: string): PhytoPassageItem => ({
    id,
    label,
    date: defaultDate,
    period: "soir",
    products: [{ product: "", cible: "", dosage: "", volume: "1000", price: "", dar: "" }],
  });

  const [phyPassages, setPhyPassages] = useState<PhytoPassageItem[]>([
    createDefaultPhytoPassage("phy_1", "Traitement 1"),
  ]);

  const [activePhyIndex, setActivePhyIndex] = useState(0);
  const [phytoHistoryOpen, setPhytoHistoryOpen] = useState(false);
  const [phytoAdvisorOpen, setPhytoAdvisorOpen] = useState(false);

  const handleSelectFromAdvisor = (ingredient: any, pest: any) => {
    const matchedOption = phytoDropdownOptions.find(
      opt => opt.name.toLowerCase().trim() === ingredient.name.toLowerCase().trim()
    );
    const chosenName = matchedOption ? matchedOption.name : ingredient.name;

    const targetIdx = phyProducts.findIndex(p => !p.product);
    const newRow = {
      product: chosenName,
      cible: `${pest.nameFr} (${ingredient.codeGroup})`,
      dosage: ingredient.standardDose,
      volume: "100 L",
      dar: `${ingredient.phiDays}j`,
      price: "0",
    };
    if (targetIdx !== -1) {
      updatePhyItem(targetIdx, newRow);
    } else {
      setPhyProducts((prev: any[]) => [...prev, newRow]);
    }
    toast.success(
      isAr
        ? `تم اختيار ${chosenName} (${ingredient.codeGroup}) لمكافحة ${pest.nameAr}`
        : `${chosenName} (${ingredient.codeGroup}) sélectionné contre ${pest.nameFr}`
    );
  };
  const currentPhyPassage = phyPassages[activePhyIndex] || phyPassages[0];
  const phyDate = currentPhyPassage.date;
  const setPhyDate = (val: string) => {
    setPhyPassages(prev => prev.map((p, i) => i === activePhyIndex ? { ...p, date: val } : p));
  };
  const phyProducts = currentPhyPassage.products;
  const setPhyProducts = (fnOrVal: any[] | ((prev: any[]) => any[])) => {
    setPhyPassages(prev => prev.map((p, i) => {
      if (i !== activePhyIndex) return p;
      const nextProds = typeof fnOrVal === "function" ? fnOrVal(p.products) : fnOrVal;
      return { ...p, products: nextProds };
    }));
  };

  // Agronomic Tank Mix Compatibility Check (Vérification automatique de compatibilité en cuve)
  const tankMixCheck: TankMixCheckResult | null = useMemo(() => {
    if (phyProducts.length < 2) return null;
    const p1 = phyProducts[0]?.product?.trim();
    const p2 = phyProducts[1]?.product?.trim();
    if (!p1 || !p2) return null;
    return checkTankMixCompatibility(p1, p2, (lang as "fr" | "ar") || "fr");
  }, [phyProducts, lang]);

  useEffect(() => {
    if (open && recoToEdit) {
      setTitle(
        recoToEdit.title
          .replace(" (Irrigation)", "")
          .replace(" (Foliaire)", "")
          .replace(" (Phyto)", "")
      );
      setComment(recoToEdit.comment || "");
      if (isDuplicate) {
        setCreatedAtDate(new Date().toISOString().slice(0, 10));
      } else {
        setCreatedAtDate(recoToEdit.created_at.slice(0, 10));
      }

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
          setFertFrequency(String(prog.frequency || "2"));
          setPureIrrFreq(String(prog.pureIrrigationFrequency ?? "1"));
          setPureIrrTime(prog.pureIrrigationTime || "1h30");
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
    setFertEntries((prev: any[]) => prev.map((e: any) => e.bac === fertBac ? { ...e, items: [...e.items, newItem] } : e));
  }

  function updateFertItem(idx: number, patch: any) {
    setFertEntries((prev: any[]) => prev.map((e: any) => {
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
    setFertEntries((prev: any[]) => prev.map((e: any) => {
      if (e.bac !== fertBac) return e;
      return {
        ...e,
        items: e.items.filter((_: any, i: number) => i !== idx)
      };
    }));
  }

  // Pulverisation handlers
  function addPulvRow() {
    setPulvItems((prev: any[]) => [...prev, { name: "", qty: "", unit: "kg", price: "" }]);
  }
  function updatePulvItem(idx: number, patch: any) {
    setPulvItems((prev: any[]) => prev.map((it: any, i: number) => i === idx ? { ...it, ...patch } : it));
  }
  function removePulvRow(idx: number) {
    setPulvItems((prev: any[]) => prev.filter((_: any, i: number) => i !== idx));
  }

  // Phytosanitaire handlers
  function addPhyRow() {
    const baseVolume = phyProducts[0]?.volume || "1000";
    setPhyProducts((prev: any[]) => [...prev, { product: "", cible: "", dosage: "", volume: baseVolume, price: "", dar: "" }]);
  }
  function addSecondPhyProduct() {
    const baseVolume = phyProducts[0]?.volume || "1000";
    setPhyProducts((prev: any[]) => [
      ...prev,
      { product: "", cible: "", dosage: "", volume: baseVolume, price: "", dar: "" }
    ]);
    toast.info(
      isAr
        ? "🧪 تمت إضافة خانة للمنتج الثاني (مادة فعالة مختلفة في نفس خليط الرش)."
        : "🧪 2ème produit ajouté ! Sélectionnez une matière active différente pour ce mélange."
    );
  }
  function updatePhyItem(idx: number, patch: any) {
    setPhyProducts((prev: any[]) => prev.map((it: any, i: number) => {
      if (i === idx) return { ...it, ...patch };
      // Synchroniser le volume d'eau si modifié pour un traitement combiné dans la même cuve
      if (patch.volume !== undefined && it.volume !== patch.volume) {
        return { ...it, volume: patch.volume };
      }
      return it;
    }));
  }
  function removePhyRow(idx: number) {
    setPhyProducts((prev: any[]) => prev.filter((_: any, i: number) => i !== idx));
  }

  async function submit(autoValidate = false) {
    if (!appDate) return toast.error("Date d'application requise");
    if (cropGroups.length === 0) return toast.error(t("reco.form.errorCropRequired"));
    if (selectedPrescriptions.length === 0) return toast.error(t("reco.form.errorPrescriptionRequired"));

    // Vérification de sécurité agronomique : Alerte incompatibilité chimique en cuve
    if (selectedPrescriptions.includes("phytosanitaire")) {
      for (const traitItem of phyPassages) {
        const activeProds = traitItem.products.filter(p => p.product);
        if (activeProds.length >= 2) {
          const check = checkTankMixCompatibility(
            activeProds[0].product,
            activeProds[1].product,
            (lang as "fr" | "ar") || "fr"
          );
          if (check && check.status === "incompatible") {
            const confirmMix = window.confirm(
              isAr
                ? `⚠️ تحذير زراعي: تم رصد تعارض كيميائي خطير في (${traitItem.label}) بين (${activeProds[0].product}) و (${activeProds[1].product})!\n\n${check.title}\n${check.message}\n\nنصيحة: ${check.advice}\n\nهل أنت متأكد من حفظ هذه التوصية بهذا الخلط؟`
                : `⚠️ ALERTE AGRONOMIQUE : Incompatibilité chimique détectée dans "${traitItem.label}" entre "${activeProds[0].product}" et "${activeProds[1].product}" !\n\n${check.title}\n${check.message}\n\nRecommandation : ${check.advice}\n\nSouhaitez-vous malgré tout enregistrer cette recommandation ?`
            );
            if (!confirmMix) {
              return;
            }
          }
        }
      }
    }

    setSubmitting(true);
    try {
      let photo_urls: string[] = [];
      if (files.length > 0) photo_urls = await uploadRecommendationPhotos(files);

      // Calculate time of day to preserve current time for ordering
      const now = new Date();
      const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      const createdAtIso = new Date(`${createdAtDate}T${timeString}`).toISOString();

      if (recoToEdit && !duplicateMode) {
        const presc = selectedPrescriptions[0];
        let currentKind: RecoKind = "fertilisation";
        let currentPayload: any = null;
        const cropNames = cropGroups.map((g) => t(`crop.${g}`)).join(", ");
        const autoBaseTitle = `${cropNames} - ${appDate}`;
        let currentTitle = autoBaseTitle;

        if (presc === "fert_irrigation") {
          const activeEntries = fertEntries.filter(e => e.items.length > 0);
          if (activeEntries.length === 0) {
            setSubmitting(false);
            return toast.error(t("reco.form.errorNoFertilizerAdded"));
          }
          currentKind = "fertilisation";
          currentTitle = `${autoBaseTitle} (${currentFertProg.label || "Irrigation"})`;
          currentPayload = {
            method: "irrigation",
            crop_group: cropGroups,
            program: {
              kind: "fertilisation",
              date: appDate,
              period: currentFertProg.period || "matin",
              label: currentFertProg.label,
              frequency: parseFloat(fertFrequency) || 2,
              pureIrrigationFrequency: parseFloat(pureIrrFreq) || 0,
              pureIrrigationTime: pureIrrTime,
              irrigationTime: fertIrrigationTime,
              injectionTime: fertInjectionTime,
              rinsingTime: fertRinsingTime,
              wettingTime: wettingMin,
              entries: activeEntries,
              total: 0
            }
          };
        } else if (presc === "fert_pulverisation") {
          const activeItems = pulvItems.filter(it => it.name && it.qty);
          if (activeItems.length === 0) {
            setSubmitting(false);
            return toast.error(t("reco.form.errorNoPulvElement"));
          }
          currentKind = "fertilisation";
          currentTitle = `${autoBaseTitle} (${currentPulvPassage.label || "Foliaire"})`;
          currentPayload = {
            method: "pulverisation",
            crop_group: cropGroups,
            program: {
              kind: "pulverisation",
              date: appDate,
              period: currentPulvPassage.period || "matin",
              label: currentPulvPassage.label,
              waterVolume: currentPulvPassage.waterVolume,
              items: activeItems,
              total: activeItems.reduce((s, it) => s + (parseFloat(it.qty) || 0) * (parseFloat(it.price) || 0), 0),
              weatherOk: true,
              weatherNote: "Validé par l'Ingénieur"
            }
          };
        } else if (presc === "phytosanitaire") {
          const activeProducts = phyProducts.filter(p => p.product);
          if (activeProducts.length === 0) {
            setSubmitting(false);
            return toast.error(t("reco.form.errorNoPhytoProduct"));
          }
          currentKind = "phytosanitaire";
          const prodsLabel = activeProducts.map(p => p.product).filter(Boolean).join(" + ");
          currentTitle = prodsLabel
            ? `${autoBaseTitle} (${prodsLabel})`
            : `${autoBaseTitle} (${currentPhyPassage.label || "Phyto"})`;
          currentPayload = {
            method: "pulverisation",
            crop_group: cropGroups,
            program: {
              kind: "phytosanitaire",
              date: appDate,
              period: currentPhyPassage.period || "soir",
              label: currentPhyPassage.label,
              products: activeProducts,
              total: activeProducts.reduce((s, p) => s + (parseFloat((p.price || "").replace(",", ".")) || 0), 0),
              weatherOk: true,
              weatherNote: "Validé par l'Ingénieur"
            }
          };
        }

        const shouldReValidate = autoValidate || recoToEdit.status === "acceptee";

        await update.mutateAsync({
          id: recoToEdit.id,
          title: currentTitle,
          comment: comment.trim() || `Recommandation agronomique pour les groupes ${cropGroups.join(", ")}`,
          parcel_ids: [],
          payload: currentPayload,
          photo_urls: [...recoToEdit.photo_urls, ...photo_urls],
          status: shouldReValidate ? "acceptee" : recoToEdit.status,
        });

        if (shouldReValidate) {
          const updatedReco: Recommendation = {
            ...recoToEdit,
            title: currentTitle,
            payload: currentPayload,
            status: "acceptee",
          };
          await validateRecommendationAndPurchases({
            reco: updatedReco,
            parcels,
            suppliers,
            addPurchase,
            acceptReco: async (id) => accept.mutateAsync(id),
            addModuleRecord,
            options: {
              supplierName: "Achat Validé (Historique Ingénieur)",
              markAsExecutedIfPast: true,
            },
          });
          toast.success("✅ Recommandation modifiée et mise à jour avec succès !");
        } else {
          toast.success(t("reco.form.successModified"));
        }
      } else {
        const cropNames = cropGroups.map((g) => t(`crop.${g}`)).join(", ");
        const autoBaseTitle = `${cropNames} - ${appDate}`;
        let totalCreatedPurchases = 0;

        for (const presc of selectedPrescriptions) {
          if (presc === "fert_irrigation") {
            for (const progItem of fertPrograms) {
              const activeEntries = progItem.entries.filter(e => e.items.length > 0);
              if (activeEntries.length === 0) continue;

              const totM =
                progItem.irrigationTime === "1h" ? 60
                  : progItem.irrigationTime === "1h30" ? 90
                    : progItem.irrigationTime === "2h" ? 120
                      : progItem.irrigationTime === "2h30" ? 150
                        : progItem.irrigationTime === "3h" ? 180 : 90;
              const wMin = Math.max(0, totM - progItem.injectionTime - progItem.rinsingTime);

              const currentTitle = `${autoBaseTitle} (${progItem.label || "Irrigation"})`;
              const currentPayload = {
                method: "irrigation",
                crop_group: cropGroups,
                program: {
                  kind: "fertilisation",
                  date: appDate,
                  period: progItem.period || "matin",
                  label: progItem.label,
                  frequency: parseFloat(progItem.frequency) || 2,
                  pureIrrigationFrequency: parseFloat(progItem.pureIrrigationFrequency ?? "1") || 0,
                  pureIrrigationTime: progItem.pureIrrigationTime || "1h30",
                  irrigationTime: progItem.irrigationTime,
                  injectionTime: progItem.injectionTime,
                  rinsingTime: progItem.rinsingTime,
                  wettingTime: wMin,
                  entries: activeEntries,
                  total: 0
                }
              };

              const created = await create.mutateAsync({
                kind: "fertilisation",
                title: currentTitle,
                comment: comment.trim() || `Recommandation agronomique pour les groupes ${cropGroups.join(", ")}`,
                parcel_ids: [],
                payload: currentPayload,
                photo_urls,
                created_at: createdAtIso,
                status: autoValidate ? "acceptee" : "envoyee",
              });

              if (autoValidate && created) {
                const res = await validateRecommendationAndPurchases({
                  reco: created,
                  parcels,
                  suppliers,
                  addPurchase,
                  acceptReco: async (id) => accept.mutateAsync(id),
                  addModuleRecord,
                  options: {
                    supplierName: "Achat Validé (Historique Ingénieur)",
                    markAsExecutedIfPast: true,
                  },
                });
                totalCreatedPurchases += res.createdPurchasesCount;
              }
            }
          } else if (presc === "fert_pulverisation") {
            for (const passItem of pulvPassages) {
              const activeItems = passItem.items.filter(it => it.name && it.qty);
              if (activeItems.length === 0) continue;

              const currentTitle = `${autoBaseTitle} (${passItem.label || "Foliaire"})`;
              const currentPayload = {
                method: "pulverisation",
                crop_group: cropGroups,
                program: {
                  kind: "pulverisation",
                  date: appDate,
                  period: passItem.period || "matin",
                  label: passItem.label,
                  waterVolume: passItem.waterVolume,
                  items: activeItems,
                  total: activeItems.reduce((s, it) => s + (parseFloat(it.qty) || 0) * (parseFloat(it.price) || 0), 0),
                  weatherOk: true,
                  weatherNote: "Validé par l'Ingénieur"
                }
              };

              const created = await create.mutateAsync({
                kind: "fertilisation",
                title: currentTitle,
                comment: comment.trim() || `Recommandation agronomique pour les groupes ${cropGroups.join(", ")}`,
                parcel_ids: [],
                payload: currentPayload,
                photo_urls,
                created_at: createdAtIso,
                status: autoValidate ? "acceptee" : "envoyee",
              });

              if (autoValidate && created) {
                const res = await validateRecommendationAndPurchases({
                  reco: created,
                  parcels,
                  suppliers,
                  addPurchase,
                  acceptReco: async (id) => accept.mutateAsync(id),
                  addModuleRecord,
                  options: {
                    supplierName: "Achat Validé (Historique Ingénieur)",
                    markAsExecutedIfPast: true,
                  },
                });
                totalCreatedPurchases += res.createdPurchasesCount;
              }
            }
          } else if (presc === "phytosanitaire") {
            for (const traitItem of phyPassages) {
              const activeProducts = traitItem.products.filter(p => p.product);
              if (activeProducts.length === 0) continue;

              const prodsLabel = activeProducts.map(p => p.product).filter(Boolean).join(" + ");
              const currentTitle = prodsLabel
                ? `${autoBaseTitle} (${prodsLabel})`
                : `${autoBaseTitle} (${traitItem.label || "Phyto"})`;
              const currentPayload = {
                method: "pulverisation",
                crop_group: cropGroups,
                program: {
                  kind: "phytosanitaire",
                  date: appDate,
                  period: traitItem.period || "soir",
                  label: traitItem.label,
                  products: activeProducts,
                  total: activeProducts.reduce((s, p) => s + (parseFloat((p.price || "").replace(",", ".")) || 0), 0),
                  weatherOk: true,
                  weatherNote: "Validé par l'Ingénieur"
                }
              };

              const created = await create.mutateAsync({
                kind: "phytosanitaire",
                title: currentTitle,
                comment: comment.trim() || `Recommandation agronomique pour les groupes ${cropGroups.join(", ")}`,
                parcel_ids: [],
                payload: currentPayload,
                photo_urls,
                created_at: createdAtIso,
                status: autoValidate ? "acceptee" : "envoyee",
              });

              if (autoValidate && created) {
                const res = await validateRecommendationAndPurchases({
                  reco: created,
                  parcels,
                  suppliers,
                  addPurchase,
                  acceptReco: async (id) => accept.mutateAsync(id),
                  addModuleRecord,
                  options: {
                    supplierName: "Achat Validé (Historique Ingénieur)",
                    markAsExecutedIfPast: true,
                  },
                });
                totalCreatedPurchases += res.createdPurchasesCount;
              }
            }
          }
        }

        if (duplicateMode) {
          toast.success(
            isAr
              ? `✅ تم نسخ التوصية بنجاح وإنشاء برنامج جديد ! ${totalCreatedPurchases > 0 ? `(${totalCreatedPurchases} مشتريات مسجلة)` : ""}`
              : `✅ Recommandation dupliquée avec succès comme nouveau programme ! ${totalCreatedPurchases > 0 ? `(${totalCreatedPurchases} achats créés)` : ""}`
          );
        } else if (autoValidate) {
          toast.success(
            `✅ Recommandation passée validée avec succès ! ${totalCreatedPurchases > 0 ? `${totalCreatedPurchases} achat(s) de produits créé(s) et ` : ""}programmes parcelles enregistrés.`
          );
        } else {
          toast.success(t("reco.form.successSubmitted"));
        }
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

  const handleSafeClose = (newOpen: boolean) => {
    if (!newOpen) {
      const hasData =
        cropGroups.length > 0 ||
        appDate !== "" ||
        comment.trim() !== "" ||
        fertEntries.some((e) => e.items.length > 0) ||
        pulvItems.some((it) => it.name) ||
        phyProducts.some((p) => p.product);

      if (hasData && !submitting) {
        const confirmClose = window.confirm(
          isAr
            ? "هل أنت متأكد من إغلاق التوصية؟ ستفقد البيانات التي قمت بإدخالها."
            : "Êtes-vous sûr de vouloir fermer ce formulaire ? Les données saisies seront perdues."
        );
        if (!confirmClose) return;
      }
      onOpenChange(false);
    } else {
      onOpenChange(true);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleSafeClose}>
        <DialogContent
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          className="max-h-[90vh] overflow-y-auto sm:max-w-2xl bg-card text-card-foreground"
        >
          <DialogHeader className="border-b pb-2">
            <DialogTitle className="text-base font-black uppercase tracking-wide flex items-center justify-between">
              <div className="flex items-center gap-2">
                {duplicateMode ? (
                  <Copy className="h-5 w-5 text-amber-500" />
                ) : (
                  <Plus className="h-5 w-5 text-primary" />
                )}
                <span>
                  {duplicateMode
                    ? t("reco.form.duplicate")
                    : recoToEdit
                    ? t("reco.form.edit")
                    : t("reco.form.new")}
                </span>
              </div>
              {duplicateMode && (
                <span className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-bold px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1">
                  <Copy className="h-3 w-3" />
                  <span>{isAr ? "وضع النسخ والتكرار" : "Mode Duplication"}</span>
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-xs">
            {duplicateMode && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 flex items-start gap-2.5 text-amber-900 dark:text-amber-200">
                <Copy className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                <div>
                  <p className="font-bold text-xs">
                    {isAr ? "وضع النسخ مفعل (Duplication)" : "Mode Duplication actif"}
                  </p>
                  <p className="text-[11px] opacity-90 mt-0.5">
                    {t("reco.form.duplicateDesc")}
                  </p>
                </div>
              </div>
            )}
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
                        className={`flex flex-col items-center justify-center gap-1 rounded-xl border py-2 text-center transition-all font-bold ${active ? "border-primary bg-primary/10 text-primary shadow-xs" : "border-input hover:bg-muted"
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
                      className={`rounded-full border px-2.5 py-1.5 font-bold text-[10px] uppercase transition-all ${cropGroups.includes(g.v)
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

            {/* Date d'application uniquement */}
            <div className="rounded-2xl border border-primary/30 bg-primary/[0.03] p-3.5 shadow-xs">
              <label className="block">
                <span className="font-extrabold uppercase text-primary text-xs flex items-center gap-1.5">
                  📅 {t("reco.form.globalAppDate")} *
                </span>
                <input
                  type="date"
                  value={appDate}
                  onChange={(e) => setAppDate(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm font-bold shadow-xs focus:ring-2 focus:ring-primary/20"
                />
              </label>
            </div>

            {/* Bloc Irrigation Seule (Sans fertilisation / Eau claire) - Positionné en haut après la date d'application */}
            {selectedPrescriptions.includes("fert_irrigation") && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-blue-500/10 border-2 border-blue-500/30 p-3 rounded-2xl shadow-xs">
                <label className="block">
                  <span className="font-bold text-blue-700 dark:text-blue-300 text-xs flex items-center gap-1">
                    <span>💧</span> {t("reco.form.pureIrrigationFreq", "Irrigations seules (eau claire) / sem")}
                  </span>
                  <select
                    value={pureIrrFreq}
                    onChange={(e) => setPureIrrFreq(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold"
                  >
                    <option value="0">{t("reco.freq.none", "0 (Aucune)")}</option>
                    <option value="1">{t("reco.freq.1perWeek", "1 fois par semaine")}</option>
                    <option value="2">{t("reco.freq.2perWeek", "2 fois par semaine")}</option>
                    <option value="3">{t("reco.freq.3perWeek", "3 fois par semaine")}</option>
                  </select>
                </label>
                {pureIrrFreq !== "0" && (
                  <label className="block">
                    <span className="font-bold text-blue-700 dark:text-blue-300 text-xs flex items-center gap-1">
                      <span>⏱️</span> {t("reco.form.pureIrrigationTime", "Durée irrigation seule")}
                    </span>
                    <select
                      value={pureIrrTime}
                      onChange={(e) => setPureIrrTime(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold"
                    >
                      <option value="1h">1h</option>
                      <option value="1h30">1h30</option>
                      <option value="2h">2h</option>
                      <option value="2h30">2h30</option>
                      <option value="3h">3h</option>
                    </select>
                  </label>
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* NESTED FORM SECTION (EMBEDDING THE ADMIN INTERFACES)       */}
            {/* ========================================================= */}
            {cropGroups.length > 0 && selectedPrescriptions.length > 0 && (
              <div className="space-y-4">
                {selectedPrescriptions.map((presc) => {
                  if (presc === "fert_irrigation") {
                    return (
                      <div key={presc} className="border rounded-2xl p-4 bg-muted/30 space-y-3">
                        <div className="flex justify-between items-center border-b pb-1">
                          <h4 className="font-black text-xs text-primary uppercase flex items-center gap-1.5">
                            <Droplet className="h-4 w-4 text-sky-600" />
                            <span>{t("reco.form.fertilizerIrrigation")}</span>
                          </h4>
                          <button
                            type="button"
                            onClick={() => {
                              const nextIndex = fertPrograms.length + 1;
                              const newProg = createDefaultFertProgram(
                                `fert_${Date.now()}`,
                                `Programme A${nextIndex}`,
                                appDate
                              );
                              setFertPrograms(prev => [...prev, newProg]);
                              setActiveFertProgIndex(fertPrograms.length);
                            }}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 shadow-xs transition"
                          >
                            <Plus className="h-3.5 w-3.5" /> {t("reco.sub.addFert", "+ Ajouter un sous-programme")} (A{fertPrograms.length + 1})
                          </button>
                        </div>

                        {/* Sélecteur d'onglets des sous-programmes Fertigation */}
                        <div className="flex flex-wrap gap-1.5 p-1 bg-background/60 rounded-xl border">
                          {fertPrograms.map((fp, idx) => (
                            <div key={fp.id} className="flex items-center">
                              <button
                                type="button"
                                onClick={() => setActiveFertProgIndex(idx)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${activeFertProgIndex === idx
                                  ? "bg-primary text-primary-foreground shadow-xs"
                                  : "text-muted-foreground hover:bg-muted"
                                  }`}
                              >
                                <span>{fp.label}</span>
                                {fp.entries.some(e => e.items.length > 0) && (
                                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                                )}
                              </button>
                              {fertPrograms.length > 1 && (
                                <button
                                  type="button"
                                  title={t("reco.sub.deleteProgConfirm", "Supprimer ce sous-programme")}
                                  onClick={() => {
                                    setFertPrograms(prev => prev.filter((_, i) => i !== idx));
                                    setActiveFertProgIndex(0);
                                  }}
                                  className="text-muted-foreground hover:text-destructive p-1"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <label className="block">
                              <span className="font-bold text-muted-foreground text-xs">{t("reco.sub.fertProgName", "Nom du sous-programme")}</span>
                              <input
                                type="text"
                                value={currentFertProg.label}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setFertPrograms(prev => prev.map((p, i) => i === activeFertProgIndex ? { ...p, label: val } : p));
                                }}
                                className="mt-1 w-full rounded border border-input bg-background px-2.5 py-1.5 text-xs font-bold"
                                placeholder={isAr ? "مثال: برنامج A1" : "Ex: Programme A1"}
                              />
                            </label>
                            <div className="block">
                              <span className="font-bold text-muted-foreground text-xs block mb-1">{t("reco.sub.appPeriod", "Période d'application")}</span>
                              <div className="flex gap-1.5 mt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFertPrograms(prev => prev.map((p, i) => i === activeFertProgIndex ? { ...p, period: "matin" } : p));
                                  }}
                                  className={`flex-1 py-1.5 px-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 transition-all ${(currentFertProg.period || "matin") === "matin"
                                    ? "bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300 font-extrabold shadow-xs"
                                    : "bg-background border-input text-muted-foreground hover:bg-muted"
                                    }`}
                                >
                                  <span>🌅</span> Matin / صباحاً
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFertPrograms(prev => prev.map((p, i) => i === activeFertProgIndex ? { ...p, period: "soir" } : p));
                                  }}
                                  className={`flex-1 py-1.5 px-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 transition-all ${currentFertProg.period === "soir"
                                    ? "bg-indigo-500/20 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-extrabold shadow-xs"
                                    : "bg-background border-input text-muted-foreground hover:bg-muted"
                                    }`}
                                >
                                  <span>🌙</span> Soir / مساءً
                                </button>
                              </div>
                            </div>
                            <label className="block">
                              <span className="font-bold text-muted-foreground text-xs">{t("reco.form.fertIrrigationFreq", "Irrigations avec fertilisation / sem")}</span>
                              <select
                                value={fertFrequency}
                                onChange={(e) => setFertFrequency(e.target.value)}
                                className="mt-1 w-full rounded border border-input bg-background px-3 py-1.5 text-xs font-semibold"
                              >
                                <option value="3">{t("reco.freq.3perWeek", "3 fois par semaine")}</option>
                                <option value="2">{t("reco.freq.2perWeek", "2 fois par semaine")}</option>
                                <option value="1">{t("reco.freq.1perWeek", "1 fois par semaine")}</option>
                                <option value="3.5">{t("reco.freq.every2")}</option>
                                <option value="2.3">{t("reco.freq.every3")}</option>
                                <option value="7">{t("reco.freq.daily")}</option>
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
                                    className={`rounded-lg border py-2 font-black transition-all ${fertBac === b
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
                                    <div className="col-span-6 space-y-0.5">
                                      <select
                                        value={it.name}
                                        onChange={(e) => handleFertProductChange(idx, e.target.value)}
                                        className="w-full rounded border bg-background px-2 py-1 text-xs"
                                      >
                                        {getProductsForBac(fertBac).map(p => (
                                          <option key={p.name} value={p.name}>{p.name}</option>
                                        ))}
                                      </select>
                                      {it.name && (
                                        <span className={`text-[10px] block font-semibold ${getLiveStock(it.name) > 0 ? "text-emerald-600" : "text-amber-600"}`}>
                                          {getLiveStock(it.name) > 0
                                            ? `📦 Stock : ${getLiveStock(it.name).toFixed(1)} ${it.unit || "kg"}`
                                            : `⚠️ Rupture (0 kg) — Achat requis`}
                                        </span>
                                      )}
                                    </div>

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
                        <div className="flex justify-between items-center border-b pb-1">
                          <h4 className="font-black text-xs text-primary uppercase flex items-center gap-1.5">
                            <SprayCan className="h-4 w-4 text-emerald-600" />
                            <span>{t("reco.form.fertilizerFoliar")}</span>
                          </h4>
                          <button
                            type="button"
                            onClick={() => {
                              const nextIndex = pulvPassages.length + 1;
                              const newPass = createDefaultPulvPassage(
                                `pulv_${Date.now()}`,
                                `Pulvérisation ${nextIndex}`,
                                appDate
                              );
                              setPulvPassages(prev => [...prev, newPass]);
                              setActivePulvIndex(pulvPassages.length);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 shadow-xs transition"
                          >
                            <Plus className="h-3.5 w-3.5" /> {t("reco.sub.addPulv", "+ Ajouter une pulvérisation")} ({pulvPassages.length + 1})
                          </button>
                        </div>

                        {/* Sélecteur de pulvérisations */}
                        <div className="flex flex-wrap gap-1.5 p-1 bg-background/60 rounded-xl border">
                          {pulvPassages.map((pp, idx) => (
                            <div key={pp.id} className="flex items-center">
                              <button
                                type="button"
                                onClick={() => setActivePulvIndex(idx)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${activePulvIndex === idx
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : "text-muted-foreground hover:bg-muted"
                                  }`}
                              >
                                <span>{pp.label}</span>
                                {pp.items.some(it => it.name && it.qty) && (
                                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                                )}
                              </button>
                              {pulvPassages.length > 1 && (
                                <button
                                  type="button"
                                  title={t("reco.sub.deletePassConfirm", "Supprimer ce passage")}
                                  onClick={() => {
                                    setPulvPassages(prev => prev.filter((_, i) => i !== idx));
                                    setActivePulvIndex(0);
                                  }}
                                  className="text-muted-foreground hover:text-destructive p-1"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <label className="block">
                              <span className="font-bold text-muted-foreground text-xs">{t("reco.sub.pulvPassName", "Nom du passage")}</span>
                              <input
                                type="text"
                                value={currentPulvPassage.label}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setPulvPassages(prev => prev.map((p, i) => i === activePulvIndex ? { ...p, label: val } : p));
                                }}
                                className="mt-1 w-full rounded border border-input bg-background px-2.5 py-1.5 text-xs font-bold"
                                placeholder={isAr ? "مثال: رشة 1" : "Ex: Passage 1"}
                              />
                            </label>
                            <div className="block">
                              <span className="font-bold text-muted-foreground text-xs block mb-1">{t("reco.sub.passPeriod", "Période de passage")}</span>
                              <div className="flex gap-1.5 mt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPulvPassages(prev => prev.map((p, i) => i === activePulvIndex ? { ...p, period: "matin" } : p));
                                  }}
                                  className={`flex-1 py-1.5 px-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 transition-all ${(currentPulvPassage.period || "matin") === "matin"
                                    ? "bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300 font-extrabold shadow-xs"
                                    : "bg-background border-input text-muted-foreground hover:bg-muted"
                                    }`}
                                >
                                  <span>🌅</span> Matin / صباحاً
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPulvPassages(prev => prev.map((p, i) => i === activePulvIndex ? { ...p, period: "soir" } : p));
                                  }}
                                  className={`flex-1 py-1.5 px-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 transition-all ${currentPulvPassage.period === "soir"
                                    ? "bg-indigo-500/20 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-extrabold shadow-xs"
                                    : "bg-background border-input text-muted-foreground hover:bg-muted"
                                    }`}
                                >
                                  <span>🌙</span> Soir / مساءً
                                </button>
                              </div>
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
                        <div className="flex flex-wrap justify-between items-center gap-2 border-b pb-1.5">
                          <h4 className="font-black text-xs text-primary uppercase flex items-center gap-1.5">
                            <FlaskConical className="h-4 w-4 text-violet-600" />
                            <span>{t("reco.form.phytosanitaire")}</span>
                          </h4>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setPhytoAdvisorOpen(true)}
                              className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-xs transition"
                            >
                              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                              <span>{isAr ? "دليل المقاومة (IRAC/FRAC)" : "Guide Anti-Résistance (IRAC/FRAC)"}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setPhytoHistoryOpen(true)}
                              className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-xs transition"
                            >
                              <History className="h-3.5 w-3.5" />
                              <span>{t("reco.phyto.historyBtn", "Historique des traitements")}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const nextIndex = phyPassages.length + 1;
                                const defaultLbl = isAr ? `معاملة ${nextIndex}` : `Traitement ${nextIndex}`;
                                const newPass = createDefaultPhytoPassage(
                                  `phy_${Date.now()}`,
                                  defaultLbl
                                );
                                setPhyPassages(prev => [...prev, newPass]);
                                setActivePhyIndex(phyPassages.length);
                              }}
                              className="bg-violet-600 hover:bg-violet-700 text-white px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 shadow-xs transition"
                            >
                              <Plus className="h-3.5 w-3.5" /> {t("reco.sub.addPhyto", "+ Ajouter un traitement")} ({phyPassages.length + 1})
                            </button>
                          </div>
                        </div>

                        {/* Sélecteur de sous-programmes Phytosanitaire */}
                        <div className="flex flex-wrap gap-1.5 p-1 bg-background/60 rounded-xl border">
                          {phyPassages.map((ph, idx) => (
                            <div key={ph.id} className="flex items-center">
                              <button
                                type="button"
                                onClick={() => setActivePhyIndex(idx)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${activePhyIndex === idx
                                  ? "bg-violet-600 text-white shadow-xs"
                                  : "text-muted-foreground hover:bg-muted"
                                  }`}
                              >
                                <span>{ph.label}</span>
                                {ph.products.some(p => p.product) && (
                                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                                )}
                              </button>
                              {phyPassages.length > 1 && (
                                <button
                                  type="button"
                                  title={t("reco.sub.deleteTraitConfirm", "Supprimer ce traitement")}
                                  onClick={() => {
                                    setPhyPassages(prev => prev.filter((_, i) => i !== idx));
                                    setActivePhyIndex(0);
                                  }}
                                  className="text-muted-foreground hover:text-destructive p-1"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <label className="block">
                              <span className="font-bold text-muted-foreground text-xs">{t("reco.sub.phyTraitName", "Nom du traitement")}</span>
                              <input
                                type="text"
                                value={currentPhyPassage.label}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setPhyPassages(prev => prev.map((p, i) => i === activePhyIndex ? { ...p, label: val } : p));
                                }}
                                className="mt-1 w-full rounded border border-input bg-background px-2.5 py-1.5 text-xs font-bold"
                                placeholder={isAr ? "مثال: معاملة 1" : "Ex: Traitement 1"}
                              />
                            </label>
                            <div className="block">
                              <span className="font-bold text-muted-foreground text-xs block mb-1">{t("reco.sub.traitPeriod", "Période de traitement")}</span>
                              <div className="flex gap-1.5 mt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPhyPassages(prev => prev.map((p, i) => i === activePhyIndex ? { ...p, period: "matin" } : p));
                                  }}
                                  className={`flex-1 py-1.5 px-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 transition-all ${currentPhyPassage.period === "matin"
                                    ? "bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300 font-extrabold shadow-xs"
                                    : "bg-background border-input text-muted-foreground hover:bg-muted"
                                    }`}
                                >
                                  <span>🌅</span> Matin / صباحاً
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPhyPassages(prev => prev.map((p, i) => i === activePhyIndex ? { ...p, period: "soir" } : p));
                                  }}
                                  className={`flex-1 py-1.5 px-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 transition-all ${(currentPhyPassage.period || "soir") === "soir"
                                    ? "bg-indigo-500/20 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-extrabold shadow-xs"
                                    : "bg-background border-input text-muted-foreground hover:bg-muted"
                                    }`}
                                >
                                  <span>🌙</span> Soir / مساءً
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="flex justify-between items-center border-b pb-1">
                              <span className="font-extrabold uppercase text-primary text-[10px]">{t("reco.form.phytoActives")}</span>
                              <div className="flex items-center gap-1.5">
                                {phyProducts.length === 1 && (
                                  <button
                                    type="button"
                                    onClick={addSecondPhyProduct}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-0.5 rounded font-bold text-[10px] flex items-center gap-1 shadow-xs transition active:scale-95"
                                    title="Associer un 2ème produit (mélange dans la même bouillie)"
                                  >
                                    <span>🧪</span>
                                    <span>{isAr ? "+ إضافة منتج ثانٍ (مادة مختلفة)" : "+ 2ème Produit"}</span>
                                  </button>
                                )}
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
                            </div>

                            {phyProducts.length >= 2 && (
                              <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-2.5 flex items-center justify-between text-indigo-900 dark:text-indigo-200">
                                <div className="flex items-center gap-2">
                                  <span className="text-base">🧪</span>
                                  <div>
                                    <p className="font-bold text-xs">
                                      {isAr
                                        ? "معاملة مشتركة بمنتجين (مادتان فعالتان مختلفتان في نفس الرش)"
                                        : "Recommandation à 2 produits (Mélange de 2 matières actives)"}
                                    </p>
                                    <p className="text-[10px] opacity-80">
                                      {isAr
                                        ? "يتم تطبيق المنتجين معاً في نفس خزان الماء (Bouillie commune)"
                                        : "Les 2 produits sont préparés ensemble dans la même cuve / bouillie"}
                                    </p>
                                  </div>
                                </div>
                                <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
                                  {isAr ? "خلط مشترك" : "Mélange 2 produits"}
                                </span>
                              </div>
                            )}

                            {phyProducts.map((p, idx) => (
                              <div key={idx} className="p-3 border rounded-xl bg-card space-y-2 relative">
                                <button
                                  type="button"
                                  onClick={() => removePhyRow(idx)}
                                  className="absolute right-2 top-2 text-muted-foreground hover:text-destructive"
                                >
                                  <X className="h-4 w-4" />
                                </button>

                                <div className="flex items-center justify-between pr-6">
                                  {idx === 0 ? (
                                    <span className="font-extrabold text-primary flex items-center gap-1.5 text-xs">
                                      <span className="h-5 w-5 rounded-md bg-primary/10 flex items-center justify-center text-[10px] font-bold">1</span>
                                      <span>{isAr ? "المنتج الأول (المادة الفعالة الأولى)" : "Produit 1 (Matière active 1)"}</span>
                                    </span>
                                  ) : idx === 1 ? (
                                    <span className="font-extrabold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 text-xs">
                                      <span className="h-5 w-5 rounded-md bg-indigo-500/20 flex items-center justify-center text-[10px] font-bold">2</span>
                                      <span>{isAr ? "المنتج الثاني (مادة فعالة مختلفة)" : "Produit 2 (Matière active différente)"}</span>
                                    </span>
                                  ) : (
                                    <span className="font-bold text-muted-foreground text-xs">
                                      {isAr ? `المنتج ${idx + 1}` : `Produit ${idx + 1}`}
                                    </span>
                                  )}
                                  {idx === 1 && (
                                    <span className="text-[10px] bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-bold px-2 py-0.5 rounded-full border border-indigo-500/30">
                                      {isAr ? "خلط مشترك" : "Association"}
                                    </span>
                                  )}
                                </div>

                                <div className="space-y-1">
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
                                    className="w-full rounded border bg-background px-2 py-1 text-xs font-semibold"
                                  >
                                    <option value="">
                                      {isAr ? "-- اختيار المنتج التجاري / المادة الفعالة --" : "-- Choisir le produit / matière active --"}
                                    </option>
                                    {p.product && !phytoDropdownOptions.some(pr => pr.name === p.product) && (
                                      <option value={p.product}>
                                        {p.product} {getMatiereActive(p.product) ? `— (${getMatiereActive(p.product)})` : ""} {getIracFracCode(p.product) ? `[${getIracFracCode(p.product)}]` : ""}
                                      </option>
                                    )}
                                    {phytoDropdownOptions.map(pr => {
                                      const ma = pr.matiereActive || getMatiereActive(pr.name);
                                      const code = getIracFracCode(pr.name);
                                      return (
                                        <option key={pr.name} value={pr.name}>
                                          {pr.name} {ma ? `— (${ma})` : ""} {code ? `[${code}]` : ""}
                                        </option>
                                      );
                                    })}
                                  </select>
                                  {p.product && (() => {
                                    const activeIng = isAr ? getMatiereActiveAr(p.product) || getMatiereActive(p.product) : getMatiereActive(p.product);
                                    const iracFrac = getIracFracCode(p.product);
                                    const isFrac = iracFrac.includes("FRAC");
                                    const isMultiSite = iracFrac.includes("M0") || iracFrac.includes("M") || iracFrac.includes("M01") || iracFrac.includes("M04") || iracFrac.includes("M09");
                                    const stock = getLiveStock(p.product);
                                    return (
                                      <div className="space-y-1.5 pt-0.5">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                          {activeIng && (
                                            <span className="text-[10px] font-bold text-primary flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-md">
                                              <span>🧪</span>
                                              <span>{isAr ? `المادة الفعالة : ${activeIng}` : `Matière active : ${activeIng}`}</span>
                                            </span>
                                          )}
                                          {iracFrac && (
                                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1 border shadow-xs ${isMultiSite
                                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                                : isFrac
                                                  ? "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30"
                                                  : "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30"
                                              }`}>
                                              <span>🛡️</span>
                                              <span>{isAr ? `تصنيف المقاومة : ${iracFrac}` : `Groupe : ${iracFrac}`}</span>
                                              {isMultiSite && (
                                                <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                                                  ({isAr ? "متعدد المواقع / آمن" : "Multi-site"})
                                                </span>
                                              )}
                                            </span>
                                          )}
                                        </div>
                                        <span className={`text-[10px] block font-semibold ${stock > 0 ? "text-emerald-600" : "text-amber-600"}`}>
                                          {stock > 0
                                            ? `📦 Stock dispo : ${stock.toFixed(1)} L`
                                            : `⚠️ Rupture (0 L) — Achat requis`}
                                        </span>
                                      </div>
                                    );
                                  })()}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                                      <span>🎯</span>
                                      <span>{isAr ? "الهدف (المرض / الآفة) :" : "Cible (Maladie / Ravageur) :"}</span>
                                    </label>
                                    <input
                                      placeholder={isAr ? "مثال: تثقب، بياض دقيقي، جرب..." : "Ex: Coryneum, Oïdium, Tavelure..."}
                                      value={p.cible}
                                      onChange={(e) => updatePhyItem(idx, { cible: e.target.value })}
                                      className="w-full rounded-lg border bg-background px-2.5 py-1.5 text-xs font-semibold"
                                    />
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                                      <span>⚖️</span>
                                      <span>{isAr ? "الجرعة (لكل 100 لتر ماء أو للهكتار) :" : "Dose (par hl ou par ha) :"}</span>
                                    </label>
                                    <input
                                      placeholder={isAr ? "مثال: 30 إلى 50 غ / 100 لتر" : "Ex: 30 à 50 g / hl"}
                                      value={p.dosage}
                                      onChange={(e) => updatePhyItem(idx, { dosage: e.target.value })}
                                      className="w-full rounded-lg border bg-background px-2.5 py-1.5 text-xs font-semibold"
                                    />
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                                      <span>💧</span>
                                      <span>{isAr ? "حجم الماء / المحلول (لتر) :" : "Volume de bouillie (Litres) :"}</span>
                                    </label>
                                    <input
                                      placeholder={isAr ? "مثال: 1000 لتر" : "Ex: 1000"}
                                      inputMode="decimal"
                                      value={p.volume}
                                      onChange={(e) => updatePhyItem(idx, { volume: e.target.value })}
                                      className="w-full rounded-lg border bg-background px-2.5 py-1.5 text-xs font-semibold"
                                    />
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                                      <span>⏳</span>
                                      <span>{isAr ? "فترة الأمان قبل الجني (DAR بالأيام) :" : "Délai Avant Récolte (DAR en jours) :"}</span>
                                    </label>
                                    <input
                                      placeholder={isAr ? "مثال: 7 أو 14 يوم" : "Ex: 7j"}
                                      value={p.dar}
                                      onChange={(e) => updatePhyItem(idx, { dar: e.target.value })}
                                      className="w-full rounded-lg border bg-background px-2.5 py-1.5 text-xs font-semibold"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}

                            {/* Détection et Analyse Agronomique de Compatibilité (Tank Mix) */}
                            {phyProducts.length >= 2 && (!phyProducts[0]?.product || !phyProducts[1]?.product) && (
                              <div className="rounded-xl border border-dashed border-indigo-500/30 bg-indigo-500/5 p-2.5 text-center text-xs text-indigo-700 dark:text-indigo-300 flex items-center justify-center gap-2">
                                <span className="text-base">💡</span>
                                <span className="font-medium">
                                  {isAr
                                    ? "اختر المنتجين أعلاه للتحقق الفوري والآلي من التوافق الكيميائي في الخزان (Tank Mix)"
                                    : "Sélectionnez les 2 produits ci-dessus pour lancer la vérification automatique de compatibilité en cuve"}
                                </span>
                              </div>
                            )}

                            {tankMixCheck && (
                              <div
                                className={`rounded-2xl border-2 p-3.5 space-y-2.5 shadow-xs transition-all ${
                                  tankMixCheck.status === "compatible"
                                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-950 dark:text-emerald-100"
                                    : tankMixCheck.status === "incompatible"
                                    ? "bg-rose-500/15 border-rose-500/50 text-rose-950 dark:text-rose-100 ring-2 ring-rose-500/20"
                                    : "bg-amber-500/15 border-amber-500/50 text-amber-950 dark:text-amber-100"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-start gap-2.5">
                                    <span className="text-2xl shrink-0 mt-0.5">
                                      {tankMixCheck.status === "compatible" ? "✅" : tankMixCheck.status === "incompatible" ? "⛔" : "⚠️"}
                                    </span>
                                    <div>
                                      <h5 className="font-extrabold text-xs sm:text-sm tracking-tight">
                                        {tankMixCheck.title}
                                      </h5>
                                      <p className="text-xs mt-1 font-medium leading-relaxed opacity-90">
                                        {tankMixCheck.message}
                                      </p>
                                    </div>
                                  </div>
                                  <span
                                    className={`shrink-0 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border shadow-xs ${
                                      tankMixCheck.status === "compatible"
                                        ? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border-emerald-500/30"
                                        : tankMixCheck.status === "incompatible"
                                        ? "bg-rose-500/20 text-rose-800 dark:text-rose-200 border-rose-500/40 animate-pulse"
                                        : "bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-500/40"
                                    }`}
                                  >
                                    {tankMixCheck.status === "compatible"
                                      ? (isAr ? "خلط متوافق" : "Compatible")
                                      : tankMixCheck.status === "incompatible"
                                      ? (isAr ? "تعارض كيميائي خطير" : "Incompatible")
                                      : (isAr ? "انتباه / تكرار" : "Attention")}
                                  </span>
                                </div>

                                {tankMixCheck.advice && (
                                  <div
                                    className={`flex items-start gap-2 rounded-xl p-2.5 text-xs font-semibold ${
                                      tankMixCheck.status === "compatible"
                                        ? "bg-emerald-500/15 text-emerald-900 dark:text-emerald-200"
                                        : tankMixCheck.status === "incompatible"
                                        ? "bg-rose-500/20 text-rose-900 dark:text-rose-200 font-bold"
                                        : "bg-amber-500/20 text-amber-900 dark:text-amber-200"
                                    }`}
                                  >
                                    <span className="shrink-0 text-base">{tankMixCheck.status === "compatible" ? "📋" : "💡"}</span>
                                    <div className="space-y-0.5">
                                      <span className="font-extrabold text-[11px] block">
                                        {tankMixCheck.status === "compatible"
                                          ? (isAr ? "بروتوكول إذابة الخزان (Règle WALES) :" : "Ordre d'incorporation dans la cuve :")
                                          : (isAr ? "توجيه وقائي إلزامي :" : "Consigne agronomique obligatoire :")}
                                      </span>
                                      <span className="text-[11px] font-normal leading-normal">{tankMixCheck.advice}</span>
                                    </div>
                                  </div>
                                )}

                                {(tankMixCheck.codeA || tankMixCheck.codeB) && (
                                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-current/15 text-[10px]">
                                    <span className="font-bold opacity-80">{isAr ? "تصنيف المواد الفعالة :" : "Modes d'action (FRAC/IRAC) :"}</span>
                                    {tankMixCheck.codeA && (
                                      <span className="bg-background/80 px-2 py-0.5 rounded border font-mono font-bold">
                                        {phyProducts[0]?.product}: {tankMixCheck.codeA}
                                      </span>
                                    )}
                                    <span>+</span>
                                    {tankMixCheck.codeB && (
                                      <span className="bg-background/80 px-2 py-0.5 rounded border font-mono font-bold">
                                        {phyProducts[1]?.product}: {tankMixCheck.codeB}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            {phyProducts.length === 1 ? (
                              <button
                                type="button"
                                onClick={addSecondPhyProduct}
                                className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-2 border-dashed border-indigo-500/40 p-2.5 rounded-xl w-full font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition active:scale-95"
                              >
                                <span className="text-base">🧪</span>
                                <span>
                                  {isAr
                                    ? "+ إضافة منتج ثانٍ بمادة فعالة مختلفة (معاملة ثنائية / خلط مشترك)"
                                    : "+ Ajouter un 2ème produit avec une matière active différente (Traitement combiné)"}
                                </span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={addPhyRow}
                                className="bg-primary/5 hover:bg-primary/10 text-primary border border-dashed px-3 py-1.5 rounded-lg w-full font-bold text-[10px] flex items-center justify-center gap-1"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                <span>{isAr ? "+ إضافة مادة فعالة أخرى" : "+ Ajouter une autre matière active"}</span>
                              </button>
                            )}
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

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => submit(true)}
                disabled={submitting}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase active:scale-95 disabled:opacity-50 shadow-md transition"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  {submitting
                    ? "Validation en cours..."
                    : duplicateMode
                    ? (isAr ? "تفعيل التوصية المنسوخة مع الشراء" : "Valider la copie & ses Achats")
                    : "Valider Recommandation & Achats (Mois précédent)"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => submit(false)}
                disabled={submitting}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold uppercase active:scale-95 disabled:opacity-50 transition"
              >
                <Send className="h-3.5 w-3.5" />
                <span>
                  {submitting
                    ? t("gen.sending")
                    : duplicateMode
                    ? (isAr ? "حفظ التوصية المنسوخة (قيد الانتظار)" : "Créer la recommandation dupliquée (En attente)")
                    : recoToEdit
                    ? t("reco.form.saveChanges")
                    : `${t("reco.form.submit")} (En attente)`}
                </span>
              </button>

              {recoToEdit && !duplicateMode && (
                <button
                  type="button"
                  onClick={() => {
                    setDuplicateMode(true);
                    setCreatedAtDate(new Date().toISOString().slice(0, 10));
                    toast.info(
                      isAr
                        ? "تم تفعيل وضع النسخ! يمكنك تعديل التاريخ أو القيم ثم الحفظ لإنشاء توصية جديدة."
                        : "Mode duplication activé ! Modifiez la date ou les valeurs puis enregistrez pour créer une nouvelle recommandation."
                    );
                  }}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 text-xs font-bold uppercase active:scale-95 transition"
                >
                  <Copy className="h-4 w-4" />
                  <span>{isAr ? "نسخ كتوصية جديدة (Dupliquer)" : "Dupliquer comme nouvelle recommandation"}</span>
                </button>
              )}
            </div>

            {recoToEdit && !duplicateMode && (
              <button
                type="button"
                onClick={async () => {
                  if (!window.confirm("Voulez-vous vraiment supprimer définitivement cette recommandation ?")) return;
                  try {
                    await remove.mutateAsync(recoToEdit.id);
                    toast.success("Recommandation supprimée avec succès !");
                    onOpenChange(false);
                  } catch (e) {
                    toast.error("Erreur lors de la suppression de la recommandation");
                  }
                }}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 px-4 text-sm font-bold uppercase active:scale-95 transition"
              >
                <Trash2 className="h-4 w-4" /> Supprimer cette recommandation
              </button>
            )}
            <button
              type="button"
              onClick={() => handleSafeClose(false)}
              className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-muted-foreground/20 text-muted-foreground hover:bg-muted/30 text-xs font-semibold active:scale-95 transition"
            >
              <X className="h-3.5 w-3.5" />
              <span>{isAr ? "إلغاء وإغلاق" : "Annuler et fermer"}</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Product Creation Dialog */}
      <Dialog open={newProductDialogOpen} onOpenChange={setNewProductDialogOpen}>
        <DialogContent
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          className="max-w-md bg-card text-card-foreground text-xs"
        >
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

      {/* Modal Historique des Traitements Phyto & Rotation Matières Actives */}
      <PhytoHistoryModal
        open={phytoHistoryOpen}
        onOpenChange={setPhytoHistoryOpen}
        currentCrops={cropGroups}
      />
      <PhytoAdvisorModal
        open={phytoAdvisorOpen}
        onOpenChange={setPhytoAdvisorOpen}
        cropGroup={cropGroups[0]}
        onSelectIngredient={handleSelectFromAdvisor}
      />
    </>
  );
}
