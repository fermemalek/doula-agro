/**
 * DOULA AGRI-MANAGER - RÉFÉRENTIEL VARIÉTAL & HISTORIQUE PHÉNOLOGIQUE
 * Fichier : src/lib/chilling/varietiesConfig.ts
 */

export interface PhenologyRecord {
  year: number;
  pruningDate: string;       // Date de taille (ex: "2026-01-25")
  bloomStartDate: string;    // Début floraison (ex: "2026-02-11")
  fullBloomDate?: string;    // Pleine floraison (stade F)
  petalFallDate?: string;    // Chute des pétales / Nouaison
  harvestStartDate?: string; // Début récolte
  accumulatedHoursAtBloom?: number; // Heures < 7.2°C atteintes au réveil
  accumulatedUtahAtBloom?: number;  // Unités Utah atteintes au réveil
  accumulatedDynamicCPAtBloom?: number; // Chill Portions (Fishman 1987) atteintes au réveil
  notes?: string;
}

export interface VarietyProfile {
  id: string;
  cropKey: 'nectarine' | 'pomme' | 'olive';
  nameFr: string;
  nameAr: string;
  pedigree: string;
  icon: string;
  
  // Besoins en froid calibrés
  chillRequirements: {
    weinbergerHours: number; // Heures < 7.2°C
    utahUnits: number;       // Unités Utah (CU)
    dynamicCP: number;       // Chill Portions — Modèle Dynamique (Fishman 1987)
  };

  // Caractéristiques phénologiques de référence
  phenologyReference: {
    bloomPeriodFr: string;
    bloomPeriodAr: string;
    maturityPeriodFr: string;
    vigor: string;
    frostSensitivity: 'très forte' | 'forte' | 'moyenne' | 'faible';
  };

  // Historique annuel réel de la ferme (enrichi chaque saison)
  campaignHistory: PhenologyRecord[];
  // Années par défaut explicitement supprimées par l'utilisateur
  deletedYears?: number[];
}

export const VARIETIES_CATALOG: VarietyProfile[] = [
  // -------------------------------------------------------------
  // 1. NECTARINE BLANCHE : NABLARA (AC Fruit / Star Fruits)
  // -------------------------------------------------------------
  {
    id: 'nec_nablara',
    cropKey: 'nectarine',
    nameFr: 'Nectarine Blanche Nablara (SF 12138)',
    nameAr: 'نكتارين بيضاء نبلارة (مبكرة جداً)',
    pedigree: 'Obtenteur AC Fruit / Éditeur Star Fruits',
    icon: '🍑',
    chillRequirements: {
      weinbergerHours: 500, // Besoin modéré (floraison précoce)
      utahUnits: 550,
      dynamicCP: 35,
    },
    phenologyReference: {
      bloomPeriodFr: 'Très précoce (début à mi-février)',
      bloomPeriodAr: 'مبكرة جداً (بداية إلى منتصف فيفري)',
      maturityPeriodFr: 'Époque Turquoise + 5 jours (mi/fin juin)',
      vigor: 'Faible à moyenne (port semi-érigé)',
      frostSensitivity: 'très forte', // Floraison hâtive exposée aux gelées blanches
    },
    campaignHistory: [
      {
        year: 2026,
        pruningDate: '2026-01-25',
        bloomStartDate: '2026-02-11', // Constat réel : 17 jours après la taille
        harvestStartDate: '2026-06-15',
        notes: 'Réveil très précoce. Débourrement homogène après cumul hivernal régulier.',
      },
      {
        year: 2025,
        pruningDate: '2025-01-28',
        bloomStartDate: '2025-02-14',
        harvestStartDate: '2025-06-18',
        notes: 'Campagne 2025 : floraison précoce mi-février, débourrement vigoureux.',
      },
    ],
  },

  // -------------------------------------------------------------
  // 2. NECTARINE BLANCHE : REDIX® 25 (Proseplan / VIF International)
  // -------------------------------------------------------------
  {
    id: 'nec_redix25',
    cropKey: 'nectarine',
    nameFr: 'Nectarine Blanche Redix® 25',
    nameAr: 'نكتارين بيضاء ريديكس 25 (موسمية)',
    pedigree: 'Sélection Proseplan / Diffuseur VIF International',
    icon: '🍑',
    chillRequirements: {
      weinbergerHours: 600, // Floraison calée sur l'époque Big Top
      utahUnits: 650,
      dynamicCP: 42,
    },
    phenologyReference: {
      bloomPeriodFr: 'Mi-saison (mi-février, ~7 jours après Nablara)',
      bloomPeriodAr: 'متوسطة (منتصف فيفري، بعد نبلارة بحوالي أسبوع)',
      maturityPeriodFr: 'Fin juin (autour de la 2e passe Big Bang)',
      vigor: 'Moyenne (légèrement érigé, bonne charpente)',
      frostSensitivity: 'forte',
    },
    campaignHistory: [
      {
        year: 2026,
        pruningDate: '2026-01-25',
        bloomStartDate: '2026-02-18', // Constat réel : 24 jours après la taille
        harvestStartDate: '2026-06-25',
        notes: 'Floraison intervenue 7 jours après Nablara, bonne nouaison.',
      },
      {
        year: 2025,
        pruningDate: '2025-01-28',
        bloomStartDate: '2025-02-21',
        harvestStartDate: '2025-06-28',
        notes: 'Campagne 2025 : pleine floraison 3e semaine de février.',
      },
    ],
  },

  // -------------------------------------------------------------
  // 3. POMMIER : GALA ONE® (Mutation Royal Beaut / Johan Nicolaï)
  // -------------------------------------------------------------
  {
    id: 'pom_gala_one',
    cropKey: 'pomme',
    nameFr: 'Pommier Gala One®',
    nameAr: 'تفاح غالا ون (مبكر التلوين)',
    pedigree: 'Mutation Gala Royal Beaut par Zouk bv / Lic. Johan Nicolaï',
    icon: '🍎',
    chillRequirements: {
      weinbergerHours: 750, // Groupe Gala classique (besoin élevé)
      utahUnits: 850,
      dynamicCP: 58,
    },
    phenologyReference: {
      bloomPeriodFr: 'Tardive par rapport aux noyaux (mi-mars à début avril)',
      bloomPeriodAr: 'متأخرة مقارنة باللوزيات (منتصف مارس إلى بداية أفريل)',
      maturityPeriodFr: 'Fin août (coloration rouge intense hâtive)',
      vigor: 'Moyenne (port type Gala)',
      frostSensitivity: 'moyenne', // Échappe souvent aux gelées de février
    },
    campaignHistory: [
      {
        year: 2026,
        pruningDate: '2026-01-30',
        bloomStartDate: '2026-03-25',
        harvestStartDate: '2026-08-25',
        notes: 'Pleine floraison début avril, bonne vigueur sur bouquets.',
      },
      {
        year: 2025,
        pruningDate: '2025-02-05',
        bloomStartDate: '2025-03-28',
        harvestStartDate: '2025-08-28',
        notes: 'Campagne 2025 : floraison homogène fin mars, bonne nouaison.',
      },
    ],
  },

  // -------------------------------------------------------------
  // 4. OLIVIER : CHEMLAL
  // -------------------------------------------------------------
  {
    id: 'oli_chemlal',
    cropKey: 'olive',
    nameFr: 'Olivier Chemlal',
    nameAr: 'زيتون شملال (صنف محلي للزيت)',
    pedigree: 'Variété traditionnelle rustique',
    icon: '🫒',
    chillRequirements: {
      weinbergerHours: 300, // Vernalisation modérée
      utahUnits: 350,
      dynamicCP: 22,
    },
    phenologyReference: {
      bloomPeriodFr: 'Mai (après accumulation thermique printanière)',
      bloomPeriodAr: 'ماي (بعد تراكم درجات الحرارة الربيعية)',
      maturityPeriodFr: 'Novembre / Décembre (récolte pour huile)',
      vigor: 'Forte, bonne rusticité au froid hivernal',
      frostSensitivity: 'faible', // Très résistant au repos hivernal
    },
    campaignHistory: [
      {
        year: 2026,
        pruningDate: '2026-02-10',
        bloomStartDate: '2026-05-05',
        harvestStartDate: '2026-11-15',
        notes: 'Excellente induction florale, grappes denses.',
      },
      {
        year: 2025,
        pruningDate: '2025-02-12',
        bloomStartDate: '2025-05-08',
        harvestStartDate: '2025-11-20',
        notes: 'Campagne 2025 : floraison début mai, récolte mi-novembre.',
      },
      {
        year: 2024,
        pruningDate: '2024-02-15',
        bloomStartDate: '2024-05-10',
        harvestStartDate: '2024-11-25',
        notes: 'Campagne 2024 : bonne charge de fruits, récolte fin novembre.',
      },
    ],
  },
];

// =============================================================
// FONCTIONS UTILITAIRES POUR L'APPLICATION (ZUSTAND / UI)
// =============================================================

/**
 * Calcule l'intervalle en jours entre la date de taille et le début de floraison
 */
export function computePruningToBloomDays(pruningDate?: string, bloomStartDate?: string): number | null {
  if (!pruningDate || !bloomStartDate) return null;
  try {
    const t1 = new Date(pruningDate).getTime();
    const t2 = new Date(bloomStartDate).getTime();
    if (isNaN(t1) || isNaN(t2)) return null;
    const diff = Math.round((t2 - t1) / (1000 * 60 * 60 * 24));
    return diff >= 0 ? diff : null;
  } catch {
    return null;
  }
}

/**
 * Ajoute ou met à jour l'observation d'une année pour une variété
 */
export function recordSeasonPhenology(
  catalog: VarietyProfile[],
  varietyId: string,
  newRecord: PhenologyRecord
): VarietyProfile[] {
  return catalog.map((variety) => {
    if (variety.id !== varietyId) return variety;

    const existingIndex = variety.campaignHistory.findIndex(
      (h) => h.year === newRecord.year
    );

    let updatedHistory = [...variety.campaignHistory];
    if (existingIndex >= 0) {
      updatedHistory[existingIndex] = { ...updatedHistory[existingIndex], ...newRecord };
    } else {
      updatedHistory.push(newRecord);
      updatedHistory.sort((a, b) => b.year - a.year); // Années récentes en premier
    }

    return {
      ...variety,
      campaignHistory: updatedHistory,
    };
  });
}

/**
 * Supprime l'observation d'une année pour une variété
 */
export function deleteSeasonPhenology(
  catalog: VarietyProfile[],
  varietyId: string,
  year: number
): VarietyProfile[] {
  return catalog.map((variety) => {
    if (variety.id !== varietyId) return variety;
    const prevDeleted = Array.isArray(variety.deletedYears) ? variety.deletedYears : [];
    const deletedYears = prevDeleted.includes(year) ? prevDeleted : [...prevDeleted, year];
    return {
      ...variety,
      deletedYears,
      campaignHistory: variety.campaignHistory.filter((h) => h.year !== year),
    };
  });
}

const VARIETIES_STORAGE_KEY = 'doula_varieties_catalog';

/**
 * Retourne le catalogue variétal en fusionnant les observations locales (doula_varieties_catalog)
 * avec les données de référence VARIETIES_CATALOG.
 */
export function getMergedVarietiesCatalog(): VarietyProfile[] {
  if (typeof window === 'undefined') return VARIETIES_CATALOG;
  try {
    const raw = localStorage.getItem(VARIETIES_STORAGE_KEY);
    if (!raw) return VARIETIES_CATALOG;
    const parsed: VarietyProfile[] = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return VARIETIES_CATALOG;
    return VARIETIES_CATALOG.map((v) => {
      const found = parsed.find((p) => p.id === v.id);
      if (!found) return v;
      const deletedSet = new Set<number>(Array.isArray(found.deletedYears) ? found.deletedYears : []);
      const savedHistory: PhenologyRecord[] = Array.isArray(found.campaignHistory) ? found.campaignHistory : [];
      const savedYears = new Set(savedHistory.map((h) => h.year));
      const merged: PhenologyRecord[] = savedHistory
        .filter((ch) => !deletedSet.has(ch.year))
        .map((ch) => {
          const def = v.campaignHistory.find((dh) => dh.year === ch.year);
          return {
            ...def,
            ...ch,
            harvestStartDate: ch.harvestStartDate || def?.harvestStartDate,
          };
        });
      v.campaignHistory.forEach((dh) => {
        if (!savedYears.has(dh.year) && !deletedSet.has(dh.year)) merged.push(dh);
      });
      return {
        ...v,
        ...found,
        deletedYears: Array.from(deletedSet),
        campaignHistory: merged.sort((a, b) => b.year - a.year),
      };
    });
  } catch {
    return VARIETIES_CATALOG;
  }
}

export function saveVarietyCampaignRecord(
  varietyId: string,
  record: PhenologyRecord,
  previousYear?: number
): VarietyProfile[] {
  let catalog = getMergedVarietiesCatalog();
  if (previousYear !== undefined && previousYear !== record.year) {
    catalog = deleteSeasonPhenology(catalog, varietyId, previousYear);
  }
  const updated = recordSeasonPhenology(catalog, varietyId, record).map((v) => {
    if (v.id !== varietyId) return v;
    return {
      ...v,
      deletedYears: (v.deletedYears || []).filter((y) => y !== record.year),
    };
  });
  try {
    localStorage.setItem(VARIETIES_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore storage quota errors
  }
  return updated;
}

export function deleteVarietyCampaignRecord(varietyId: string, year: number): VarietyProfile[] {
  const catalog = getMergedVarietiesCatalog();
  const updated = deleteSeasonPhenology(catalog, varietyId, year);
  try {
    localStorage.setItem(VARIETIES_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore storage quota errors
  }
  return updated;
}

/**
 * Associe automatiquement une parcelle de la ferme à son profil variétal
 * (historique Taille, Floraison & Récolte).
 */
export function getVarietyProfileForParcel(parcel?: {
  id?: string;
  name?: string;
  type?: string;
  info?: { espece?: string };
}): VarietyProfile | null {
  if (!parcel) return null;
  const catalog = getMergedVarietiesCatalog();
  const id = (parcel.id || '').toLowerCase();
  const name = (parcel.name || '').toLowerCase();
  const espece = (parcel.info?.espece || '').toLowerCase();
  const type = (parcel.type || '').toLowerCase();

  if (type === 'olivier' || id.startsWith('p1') || name.includes('olivier')) {
    return catalog.find((v) => v.id === 'oli_chemlal') || null;
  }
  if (type === 'pommier' || id.includes('pommier') || name.includes('pommier') || name.includes('gala')) {
    return catalog.find((v) => v.id === 'pom_gala_one') || null;
  }
  if (type === 'nectarinier' || name.includes('nectar') || name.includes('nablara') || name.includes('redix') || id.includes('nablara') || id.includes('redix')) {
    if (id.includes('redix') || name.includes('redix') || espece.includes('redix')) {
      return catalog.find((v) => v.id === 'nec_redix25') || null;
    }
    return catalog.find((v) => v.id === 'nec_nablara') || null;
  }
  return null;
}

