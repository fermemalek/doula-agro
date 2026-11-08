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
        notes: 'Réveil très précoce. Débourrement homogène après cumul hivernal régulier.',
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
        notes: 'Floraison intervenue 7 jours après Nablara, bonne nouaison.',
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
        notes: 'Pleine floraison début avril, bonne vigueur sur bouquets.',
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
        notes: 'Excellente induction florale, grappes denses.',
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
