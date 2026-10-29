// Données d'analyses pré-remplies depuis les rapports PDF Soil&co
// Date de réception 31/03/2026, libération 06/04/2026

export type SolAnalyse = {
  date: string;
  argile: string;
  limon: string;
  sable: string;
  ph: string;
  ce: string;
  tds: string;
  calcaireTotal: string;
  calcaireActif: string;
  matiereOrg: string;
  azote: string;
  phosphore: string;
  potassium: string;
  calcium: string;
  sodium: string;
  cec: string;
  fer?: string;
  cuivre?: string;
  zinc?: string;
  mgo?: string;
  notes?: string;
};

export type EauAnalyse = {
  date: string;
  ph: string;
  ce: string;
  tds: string;
  chlorure: string;
  bicarbonate: string;
  sodium: string;
  potassium: string;
  calcium: string;
  magnesium: string;
  source: string;
};

const base = (over: Partial<SolAnalyse>): SolAnalyse => ({
  date: "31/03/2026",
  argile: "", limon: "", sable: "", ph: "", ce: "", tds: "",
  calcaireTotal: "", calcaireActif: "", matiereOrg: "", azote: "",
  phosphore: "", potassium: "", calcium: "", sodium: "", cec: "",
  ...over,
});

export const SOL_PAR_PARCELLE: Record<string, SolAnalyse> = {
  pommier1: base({
    argile: "11", limon: "46", sable: "43", ph: "8,7", ce: "340", tds: "—",
    calcaireTotal: "38", calcaireActif: "10", matiereOrg: "3,4", azote: "0,04",
    phosphore: "413", potassium: "0,5", calcium: "9,5", sodium: "1,1", cec: "13,6",
    fer: "2,5", cuivre: "1,9", zinc: "2,2", mgo: "220",
  }),
  pommier2: base({
    argile: "12", limon: "45", sable: "43", ph: "8,5", ce: "460", tds: "—",
    calcaireTotal: "36", calcaireActif: "10", matiereOrg: "3,0", azote: "0,040",
    phosphore: "466", potassium: "0,7", calcium: "9,7", sodium: "1,0", cec: "13,8",
    fer: "2,5", cuivre: "1,9", zinc: "2,2", mgo: "220",
  }),
  p3: base({
    argile: "12", limon: "44", sable: "44", ph: "8,67", ce: "885",
    tds: "—", calcaireTotal: "32", calcaireActif: "8", matiereOrg: "3,8",
    azote: "0,02", phosphore: "35", potassium: "0,4", calcium: "9,2", sodium: "2,1", cec: "13,2",
    fer: "2,3", cuivre: "3,0", zinc: "1,3", mgo: "462",
  }),
  p4: base({
    argile: "13", limon: "44", sable: "43", ph: "8,5", ce: "978",
    tds: "—", calcaireTotal: "34", calcaireActif: "11", matiereOrg: "3,9",
    azote: "0,026", phosphore: "176,66", potassium: "0,5", calcium: "9,4", sodium: "2,3", cec: "13,5",
    fer: "2,3", cuivre: "3,0", zinc: "1,3", mgo: "462",
  }),
  p1: base({
    argile: "11", limon: "46", sable: "43", ph: "8,67", ce: "885",
    calcaireTotal: "32", calcaireActif: "8", matiereOrg: "3,8",
    azote: "0,02", phosphore: "35", potassium: "0,4", calcium: "9,2", sodium: "2,1", cec: "13,2",
    fer: "2,3", cuivre: "3,0", zinc: "1,3", mgo: "462",
  }),
  p2: base({
    argile: "12", limon: "44", sable: "44", ph: "8,5", ce: "978",
    calcaireTotal: "34", calcaireActif: "11", matiereOrg: "3,9",
    azote: "0,026", phosphore: "176,66", potassium: "0,5", calcium: "9,4", sodium: "2,3", cec: "13,5",
    fer: "2,3", cuivre: "3,0", zinc: "1,3", mgo: "462",
  }),
  redix25: base({
    argile: "13", limon: "45", sable: "42", ph: "8,5", ce: "260",
    calcaireTotal: "30", calcaireActif: "8", matiereOrg: "4,0",
    azote: "0,022", phosphore: "150", potassium: "0,4", calcium: "9,0", sodium: "0,9", cec: "13,0",
    fer: "2,2", cuivre: "1,6", zinc: "1,1", mgo: "283",
  }),
  nablara: base({
    argile: "9", limon: "30", sable: "61", ph: "8,2", ce: "320",
    calcaireTotal: "28", calcaireActif: "8", matiereOrg: "1,8",
    azote: "0,024", phosphore: "40", potassium: "0,3", calcium: "8,1", sodium: "0,8", cec: "10,5",
    fer: "2,2", cuivre: "1,6", zinc: "1,1", mgo: "283",
  }),
};

export const EAU_DEFAULT: EauAnalyse = {
  date: "12/03/2026",
  ph: "7,5", ce: "980", tds: "480", chlorure: "110", bicarbonate: "180",
  sodium: "40", potassium: "2", calcium: "80", magnesium: "35",
  source: "Forage 1",
};

export const SOL_LABELS: Record<keyof SolAnalyse, string> = {
  date: "Date d'analyse",
  argile: "Argile (%)", limon: "Limon (%)", sable: "Sable (%)",
  ph: "pH (1/5)", ce: "CE (μS/cm)", tds: "TDS (g/l)",
  calcaireTotal: "Calcaire Total (%)", calcaireActif: "Calcaire Actif (%)",
  matiereOrg: "Matière organique (%)", azote: "Azote Total (%)",
  phosphore: "Phosphore (ppm)", potassium: "Potassium (méq/100g)",
  calcium: "Calcium (méq/100g)", sodium: "Sodium (méq/100g)",
  cec: "CEC (méq/100g)",
  fer: "Fer (ppm)", cuivre: "Cuivre (ppm)", zinc: "Zinc (ppm)",
  mgo: "MgO (mg/kg)", notes: "Notes",
};

export const EAU_LABELS: Record<keyof EauAnalyse, string> = {
  date: "Date d'analyse",
  ph: "pH (1/5) ISO-10390",
  ce: "CE (μS/cm) ISO-11265",
  tds: "TDS (ppt)",
  chlorure: "Chlorure (mg/L)",
  bicarbonate: "Bicarbonate (mg/L)",
  sodium: "Sodium Na+ (mg/L)",
  potassium: "Potassium K+ (mg/L)",
  calcium: "Calcium Ca2+ (mg/L)",
  magnesium: "Magnésium Mg2+ (mg/L)",
  source: "Source",
};
