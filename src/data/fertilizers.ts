export interface FertilizerProduct {
  name: string;
  type: string;
  solubility: number; // g/L or 5000 for liquid acids/liquids
  time: number; // agitation time in minutes
  note: string; // terrain note / safety rule
  price: number; // DA
  unit: "kg" | "litres";
}

export const FERTILIZER_DATABASE: FertilizerProduct[] = [
  {
    name: "Nitrate de Calcium / نترات كالسـيوم",
    type: "Fertigation - Bac A",
    solubility: 120.0,
    time: 6,
    note: "CRITIQUE : Isoler totalement des Sulfates/Phosphates.",
    price: 160,
    unit: "kg"
  },
  {
    name: "Urée / يوريا",
    type: "Fertigation - Bac B",
    solubility: 105.0,
    time: 5,
    note: "Très soluble. Refroidit l'eau (endothermique).",
    price: 45,
    unit: "kg"
  },
  {
    name: "Nitrate de Potassium / نترات البوتاسيوم",
    type: "Fertigation - Bac B",
    solubility: 30.0,
    time: 15,
    note: "Sensible à l'eau froide du puits.",
    price: 26,
    unit: "kg"
  },
  {
    name: "Sulfate de Potassium / سلفات البوتاسيوم SOP",
    type: "Fertigation - Bac B",
    solubility: 10.0,
    time: 20,
    note: "Le plus difficile à dissoudre du marché.",
    price: 220,
    unit: "kg"
  },
  {
    name: "Nitrate de Magnésium / نترات ماغنسيوم",
    type: "Fertigation - Bac B",
    solubility: 70.0,
    time: 8,
    note: "Excellente source de magnésium soluble.",
    price: 260,
    unit: "kg"
  },
  {
    name: "Sulfate de Magnésium / سلفات ماغنسيوم",
    type: "Fertigation - Bac B",
    solubility: 0,
    time: 0,
    note: "",
    price: 240,
    unit: "kg"
  },
  {
    name: "Oligo-éléments / عناصر صغري",
    type: "Fertigation - Bac C",
    solubility: 60.0,
    time: 10,
    note: "Mélange complet d'oligo-éléments chélatés.",
    price: 3450,
    unit: "kg"
  },
  {
    name: "Acide Humique / أسمدة عضوية",
    type: "Fertigation - Bac C",
    solubility: 50.0,
    time: 15,
    note: "Améliore la structure du sol et l'assimilation.",
    price: 420,
    unit: "litres"
  },
  {
    name: "Fer 6% / حديد 6%",
    type: "Fertigation - Bac C",
    solubility: 90.0,
    time: 8,
    note: "Indispensable contre la chlorose en sol calcaire.",
    price: 3200,
    unit: "kg"
  },
  {
    name: "Fer 6% / حديد 6%",
    type: "Fertigation - Bac C",
    solubility: 90.0,
    time: 8,
    note: "Indispensable contre la chlorose en sol calcaire.",
    price: 2700,
    unit: "kg"
  },
  {
    name: "GZB Stimulateur de racines / منشط جذور",
    type: "Fertigation - Bac C",
    solubility: 5000,
    time: 0,
    note: "Stimulant organique complexe à injecter à part.",
    price: 2200,
    unit: "litres"
  },
  {
    name: "Acide Nitrique / حامض نيتريك",
    type: "Fertigation - Bac D",
    solubility: 5000,
    time: 1,
    note: "CORROSIF : Gants + lunettes obligatoires.",
    price: 378.15,
    unit: "litres"
  },
  {
    name: "Acide Nitrique AGRIZOTE/ حامض نيتريك",
    type: "Fertigation - Bac D",
    solubility: 5000,
    time: 1,
    note: "CORROSIF : Gants + lunettes obligatoires.",
    price: 177.31,
    unit: "litres"
  },
  {
    name: "Acide Phosphorique AGRIPHOS / حامض فوسفوريك",
    type: "Fertigation - Bac D",
    solubility: 5000,
    time: 1,
    note: "Sécurité : Toujours verser l'acide dans l'eau.",
    price: 664,
    unit: "litres"
  },
  {
    name: "Acide Phosphorique / حامض فوسفوريك",
    type: "Fertigation - Bac D",
    solubility: 5000,
    time: 1,
    note: "Sécurité : Toujours verser l'acide dans l'eau.",
    price: 500,
    unit: "litres"
  },
  {
    name: "Acide Citrique / حامض سيتريك",
    type: "Fertigation - Bac D",
    solubility: 590.0,
    time: 4,
    note: "Idéal pour chélater et nettoyer les goutteurs.",
    price: 410.55,
    unit: "kg"
  },
  {
    name: "Acide Ascorbique / اسكوربيك اسيد",
    type: "Fertigation - Bac D",
    solubility: 330.0,
    time: 5,
    note: "Soutient la plante contre le stress thermique saharien.",
    price: 3000,
    unit: "kg"
  },
  {
    name: "Acides Aminés 80% / أحماض أمينية",
    type: "Pulvérisation Foliaire",
    solubility: 0,
    time: 0,
    note: "Anti-stress foliaire post-Sirocco.",
    price: 1500,
    unit: "litres"
  },
  {
    name: "Algreen / طحالب بحرية",
    type: "Pulvérisation Foliaire",
    solubility: 5000,
    time: 0,
    note: "Soutien de la vigueur foliaire et division.",
    price: 2000,
    unit: "litres"
  },
  {
    name: "Calcium-Bore Foliaire / كالسيوم بورون",
    type: "Pulvérisation Foliaire",
    solubility: 5000,
    time: 0,
    note: "Appliquer aux stades critiques du fruit.",
    price: 550,
    unit: "litres"
  },
  {
    name: "Soufre Micronisé / كبريت ميكروني",
    type: "Pulvérisation Foliaire",
    solubility: 0,
    time: 0,
    note: "Traitement préventif oïdium/tavelure.",
    price: 400,
    unit: "kg"
  },
  {
    name: "Gibbérelline 10% / جبريليك",
    type: "Pulvérisation Foliaire",
    solubility: 0,
    time: 0,
    note: "Allongement et calibre cellulaire (5 pastilles/1000L).",
    price: 2000,
    unit: "litres"
  },
  {
    name: "Cytokinine / سيتوكينين",
    type: "Pulvérisation Foliaire",
    solubility: 5000,
    time: 0,
    note: "Division cellulaire",
    price: 2500,
    unit: "litres"
  },
  {
    name: "Calypso",
    type: "Phytosanitaire",
    solubility: 14.0,
    time: 0,
    note: "Insecticide systémique (Pucerons, Carpocapse du pommier)",
    price: 20000,
    unit: "litres"
  },
  {
    name: "Sivento",
    type: "Phytosanitaire",
    solubility: 14.0,
    time: 0,
    note: "Excellente systémie (Pucerons, Aleurodes)",
    price: 10000,
    unit: "litres"
  },
  {
    name: "Verlan",
    type: "Phytosanitaire",
    solubility: 14.0,
    time: 0,
    note: "Action translaminaire (Acariens, Mineuses)",
    price: 11000,
    unit: "litres"
  },
  {
    name: "Bellis",
    type: "Phytosanitaire",
    solubility: 14.0,
    time: 0,
    note: "Spécifique arbres à noyau (Coryneum du nectarinier, Oïdium)",
    price: 24000,
    unit: "kg"
  },
  {
    name: "Erlan",
    type: "Phytosanitaire",
    solubility: 14.0,
    time: 0,
    note: "Insectes piqueurs-suceurs",
    price: 0,
    unit: "litres"
  },
  {
    name: "Sherpa 25 EC",
    type: "Phytosanitaire",
    solubility: 14.0,
    time: 0,
    note: "Effet de choc par contact (Psylle de l'olivier, Noctuelles)",
    price: 1600,
    unit: "litres"
  },
  {
    name: "Decis Expert",
    type: "Phytosanitaire",
    solubility: 7.0,
    time: 0,
    note: "Large spectre, action foudroyante",
    price: 3200,
    unit: "litres"
  },
  {
    name: "Acetaplan",
    type: "Phytosanitaire",
    solubility: 14.0,
    time: 0,
    note: "Insecticide systémiques",
    price: 0,
    unit: "litres"
  },
  {
    name: "Amistar",
    type: "Phytosanitaire",
    solubility: 14.0,
    time: 0,
    note: "Fongicide préventif large spectre",
    price: 4500,
    unit: "litres"
  },
  {
    name: "Azostar 325SC",
    type: "Phytosanitaire",
    solubility: 14.0,
    time: 0,
    note: "Double action (Tavelure du pommier, Oïdium)",
    price: 0,
    unit: "litres"
  },
  {
    name: "Zorro",
    type: "Phytosanitaire",
    solubility: 14.0,
    time: 0,
    note: "Acaricide de référence (Acariens rouges)",
    price: 0,
    unit: "litres"
  },
  {
    name: "Fosetyl Aluminium",
    type: "Phytosanitaire",
    solubility: 14.0,
    time: 0,
    note: "Systémie ascendante/descendante (Phytophthora, Mildiou)",
    price: 3500,
    unit: "kg"
  },
  {
    name: "Luna",
    type: "Phytosanitaire",
    solubility: 14.0,
    time: 0,
    note: "Très haute efficacité (Monilia, Tavelure, Oïdium)",
    price: 19250,
    unit: "litres"
  },
  {
    name: "Criptan",
    type: "Phytosanitaire",
    solubility: 21.0,
    time: 0,
    note: "Fongicide de contact (Tavelure, Monilia)",
    price: 2800,
    unit: "kg"
  },
  {
    name: "Extrachim",
    type: "Phytosanitaire",
    solubility: 14.0,
    time: 0,
    note: "Distributeur local proposant plusieurs matières actives",
    price: 750,
    unit: "kg"
  },
  {
    name: "Rustilan",
    type: "Phytosanitaire",
    solubility: 14.0,
    time: 0,
    note: "Systémique racinaire et foliaire (Pucerons)",
    price: 1000,
    unit: "kg"
  },
  {
    name: "Tachigazol",
    type: "Phytosanitaire",
    solubility: 14.0,
    time: 0,
    note: "Désinfection des sols (Fusarium). Apport en irrigation.",
    price: 5500,
    unit: "litres"
  },
  {
    name: "Phytocap",
    type: "",
    solubility: 0,
    time: 0,
    note: "",
    price: 2500,
    unit: "kg"
  }
];
