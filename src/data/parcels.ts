export type ParcelType = "olivier" | "nectarine" | "pommier" | "vide";
export type ParcelStatus = "sain" | "alerte" | "intervention";

export interface ParcelInfo {
  // Périodes & pompe
  flowering: string;
  harvest: string;
  pumpBar: string;
  frequency: string;
  anneeAgricoleDebut: string;
  anneeAgricoleFin: string;
  // Identification
  espece: string;
  porteGreffe: string;
  surface: string;
  age: string;
  // Caractéristiques agronomiques
  espacementM: string;
  nbArbres: string;
  longueurM: string;
  largeurM: string;
  nbLignes: string;
  arbresLigne: string;
  // Système irrigation Ferkani (1 gouteur / ligne) — Olivier
  ferkaniDebitG: string;
  ferkaniNbPompe: string;
  ferkaniDebitArbre: string;
  ferkaniDebitTotal: string;
  // Système irrigation Chamlal (3 gouteurs / ligne) — Olivier
  chamlalDebitG: string;
  chamlalNbPompe: string;
  chamlalDebitArbre: string;
  chamlalDebitTotal: string;
  // Système Hydraulique unique — Nectarine / Pommier
  sysDebitG: string;
  sysNbPompe: string;
  sysNbGouteurs: string;
  sysDebitTotal: string;
  // Pollinisateurs — Pommier
  pollin1Espece: string;
  pollin1Nb: string;
  pollin2Espece: string;
  pollin2Nb: string;
  // Brise vent
  briseEspece: string;
  briseAge: string;
  briseNbLignes: string;
  briseNbPompe: string;
  briseEspacement: string;
  briseNbArbres: string;
  briseDebitG: string;
  briseNbGouteurs: string;
  briseDebitTotal: string;
  // Totaux
  nbArbresParcelle: string;
  debitGlobal: string;
}

export interface Parcel {
  id: string;
  name: string;
  type: ParcelType;
  colorVar: string;
  status: ParcelStatus;
  info: ParcelInfo;
}

const empty = (): ParcelInfo => ({
  flowering: "", harvest: "", pumpBar: "", frequency: "", anneeAgricoleDebut: "", anneeAgricoleFin: "",
  espece: "", porteGreffe: "", surface: "", age: "",
  espacementM: "", nbArbres: "", longueurM: "", largeurM: "", nbLignes: "", arbresLigne: "",
  ferkaniDebitG: "", ferkaniNbPompe: "", ferkaniDebitArbre: "", ferkaniDebitTotal: "",
  chamlalDebitG: "", chamlalNbPompe: "", chamlalDebitArbre: "", chamlalDebitTotal: "",
  sysDebitG: "", sysNbPompe: "", sysNbGouteurs: "", sysDebitTotal: "",
  pollin1Espece: "", pollin1Nb: "", pollin2Espece: "", pollin2Nb: "",
  briseEspece: "", briseAge: "", briseNbLignes: "", briseNbPompe: "",
  briseEspacement: "", briseNbArbres: "", briseDebitG: "", briseNbGouteurs: "", briseDebitTotal: "",
  nbArbresParcelle: "", debitGlobal: "",
});

const merge = (patch: Partial<ParcelInfo>): ParcelInfo => ({ ...empty(), ...patch });

// Données de référence par parcelle (modif v4)
const olivierBase: Partial<ParcelInfo> = {
  flowering: "à partir de Avril",
  harvest: "à partir de Novembre",
  pumpBar: "1,6",
  frequency: "29",
  espece: "Chamlal/Ferkani",
  porteGreffe: "Zabouge",
  surface: "2,16",
  age: "12",
  espacementM: "5",
  longueurM: "120",
  largeurM: "180",
};

const nectarineBase: Partial<ParcelInfo> = {
  flowering: "à partir du 11 février",
  pumpBar: "1,6",
  frequency: "29",
  espece: "Nectarine",
  porteGreffe: "GF",
  surface: "2,16",
  age: "2",
  espacementM: "2,5",
  longueurM: "120",
  largeurM: "180",
  nbArbres: "1 872",
  nbLignes: "39",
  arbresLigne: "48",
  sysDebitG: "4",
  sysNbPompe: "2",
  sysNbGouteurs: "15 600",
  sysDebitTotal: "62 400",
  briseEspece: "Grenadier",
  briseAge: "2",
  briseNbLignes: "2",
  briseNbPompe: "1",
  briseDebitG: "2,1",
  briseNbArbres: "240",
  briseNbGouteurs: "960",
  briseDebitTotal: "2016",
  nbArbresParcelle: "2 112",
  debitGlobal: "64 416",
};

const pommierBase: Partial<ParcelInfo> = {
  flowering: "à partir du 25 Mars",
  harvest: "du 15 au 31 Aout",
  pumpBar: "1,6",
  frequency: "29",
  espece: "Gala One®",
  porteGreffe: "M9",
  surface: "1,6",
  age: "2",
  espacementM: "0,9",
  longueurM: "120",
  largeurM: "80",
  nbLignes: "22",
  arbresLigne: "135",
  pollin1Espece: "Golden Delicious",
  pollin1Nb: "280",
  pollin2Espece: "Granny Smith",
  pollin2Nb: "297",
  sysDebitG: "2,1",
  sysNbPompe: "2",
  sysNbGouteurs: "16 000",
  sysDebitTotal: "33 600",
  briseEspece: "Grenadier",
  briseAge: "2",
  briseNbLignes: "1",
  briseNbPompe: "1",
  briseDebitG: "2,1",
  briseNbArbres: "120",
  briseNbGouteurs: "480",
  briseDebitTotal: "1008",
  debitGlobal: "34 608",
};

export const PARCELS: Parcel[] = [
  {
    id: "p1", name: "OLIVIER P1", type: "olivier", colorVar: "var(--olive-dark)", status: "sain",
    info: merge({
      ...olivierBase,
      nbArbres: "282", nbLignes: "27", arbresLigne: "26",
      chamlalDebitG: "8", chamlalNbPompe: "2", chamlalDebitArbre: "48", chamlalDebitTotal: "13 536",
      nbArbresParcelle: "", debitGlobal: "13 536",
    }),
  },
  {
    id: "p2", name: "OLIVIER P2", type: "olivier", colorVar: "var(--olive-dark)", status: "sain",
    info: merge({
      ...olivierBase,
      nbArbres: "692/766", nbLignes: "37", arbresLigne: "62",
      ferkaniDebitG: "8", ferkaniNbPompe: "2", ferkaniDebitArbre: "16", ferkaniDebitTotal: "12 256",
      chamlalDebitG: "8", chamlalNbPompe: "2", chamlalDebitArbre: "48", chamlalDebitTotal: "33 216",
      nbArbresParcelle: "", debitGlobal: "45 472",
    }),
  },
  {
    id: "p3", name: "OLIVIER P3", type: "olivier", colorVar: "var(--olive-dark)", status: "sain",
    info: merge({
      ...olivierBase,
      nbArbres: "523", nbLignes: "33", arbresLigne: "27",
      chamlalDebitG: "8", chamlalNbPompe: "2", chamlalDebitArbre: "48", chamlalDebitTotal: "25 104",
      nbArbresParcelle: "", debitGlobal: "25 104",
    }),
  },
  {
    id: "p4", name: "OLIVIER P4", type: "olivier", colorVar: "var(--olive-dark)", status: "sain",
    info: merge({
      ...olivierBase,
      nbArbres: "540 / 599", nbLignes: "33", arbresLigne: "39",
      ferkaniDebitG: "8", ferkaniNbPompe: "2", ferkaniDebitArbre: "16", ferkaniDebitTotal: "9 584",
      chamlalDebitG: "8", chamlalNbPompe: "2", chamlalDebitArbre: "48", chamlalDebitTotal: "25 920",
      nbArbresParcelle: "", debitGlobal: "35 504",
    }),
  },
  {
    id: "nablara", name: "NABLARA", type: "nectarine", colorVar: "var(--olive-mid)", status: "sain",
    info: merge({ ...nectarineBase, harvest: "du 15 au 20 juin" }),
  },
  {
    id: "redix25", name: "REDIX® 25", type: "nectarine", colorVar: "var(--olive-mid)", status: "sain",
    info: merge({ ...nectarineBase, harvest: "du 20 au 30 juin" }),
  },
  {
    id: "pommier1", name: "POMMIER 1", type: "pommier", colorVar: "var(--olive-light)", status: "sain",
    info: merge({ ...pommierBase, nbArbres: "2 915", nbArbresParcelle: "3 492" }),
  },
  {
    id: "pommier2", name: "POMMIER 2", type: "pommier", colorVar: "var(--olive-light)", status: "sain",
    info: merge({ ...pommierBase, nbArbres: "2 878", nbArbresParcelle: "3 455" }),
  },
  { id: "p9", name: "P9", type: "vide", colorVar: "var(--sector-empty)", status: "sain", info: empty() },
  { id: "p10", name: "P10", type: "vide", colorVar: "var(--sector-empty)", status: "sain", info: empty() },
  { id: "p11", name: "P11", type: "vide", colorVar: "var(--sector-empty)", status: "sain", info: empty() },
  { id: "p12", name: "P12", type: "vide", colorVar: "var(--sector-empty)", status: "sain", info: empty() },
  {
    id: "brisevent", name: "CASUARINA BRISE VENT", type: "vide", colorVar: "var(--sector-empty)", status: "sain",
    info: merge({
      briseEspece: "Casuarina",
      briseAge: "2",
      briseNbLignes: "1",
      briseNbPompe: "1",
      briseDebitG: "4",
      briseNbArbres: "12000",
      briseNbGouteurs: "24000",
      briseDebitTotal: "96000",
    }),
  },
];

export const INFO_LABELS: Record<keyof ParcelInfo, string> = {
  flowering: "Période de floraison",
  harvest: "Période de récolte",
  pumpBar: "Débit (bar)",
  frequency: "Fréquence",
  anneeAgricoleDebut: "Année agricole du",
  anneeAgricoleFin: "au",
  espece: "Espèce",
  porteGreffe: "Porte-greffe",
  surface: "Surface (ha)",
  age: "Âge (ans)",
  espacementM: "Espacement (m)",
  nbArbres: "Nb. Arbres",
  longueurM: "Longueur Parcelle (m)",
  largeurM: "Largeur Parcelle (m)",
  nbLignes: "Nb lignes",
  arbresLigne: "Arbres/ligne",
  ferkaniDebitG: "DébitG (L/h)",
  ferkaniNbPompe: "Nb. Pompe",
  ferkaniDebitArbre: "Débit par arbres (L/h)",
  ferkaniDebitTotal: "DébitTotal (L/h)",
  chamlalDebitG: "DébitG (L/h)",
  chamlalNbPompe: "Nb. Pompe",
  chamlalDebitArbre: "Débit par arbres (L/h)",
  chamlalDebitTotal: "DébitTotal (L/h)",
  sysDebitG: "DébitG (L/h)",
  sysNbPompe: "Nb. Pompe",
  sysNbGouteurs: "Nombre de Gouteurs",
  sysDebitTotal: "DébitTotal (L/h)",
  pollin1Espece: "Espèce 1",
  pollin1Nb: "Nb. Arbres",
  pollin2Espece: "Espèce 2",
  pollin2Nb: "Nb. Arbres",
  briseEspece: "Espèce",
  briseAge: "Âge (ans)",
  briseNbLignes: "Nombre de ligne",
  briseNbPompe: "Nb. Pompe",
  briseEspacement: "Espacement (m)",
  briseNbArbres: "Nb. Arbres",
  briseDebitG: "DébitG (L/h)",
  briseNbGouteurs: "Nombre de Gouteurs",
  briseDebitTotal: "DébitTotal (L/h)",
  nbArbresParcelle: "Nb. Arbres Parcelle",
  debitGlobal: "DébitGlobale (L/h)",
};

// Champs alphanumériques (texte libre)
export const TEXT_FIELDS: ReadonlySet<keyof ParcelInfo> = new Set<keyof ParcelInfo>([
  "flowering",
  "harvest",
  "anneeAgricoleDebut",
  "anneeAgricoleFin",
  "espece",
  "porteGreffe",
  "briseEspece",
  "pollin1Espece",
  "pollin2Espece",
  "nbArbres", // peut contenir "692/766"
]);
