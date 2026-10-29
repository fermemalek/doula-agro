// Data parsed from Excel document: programme_ingenieur_Complet.xlsx
export interface SequentialScheduleEntry {
  parcel: string;
  startHour: string;
  preWetting: string;
  injection: string;
  rinsing: string;
  endHour: string;
  duration: number;
}

export interface SequentialSchedule {
  title: string;
  rule: string;
  period: string;
  days: {
    title: string;
    entries: SequentialScheduleEntry[];
  }[];
}

export interface SupplierSummary {
  name: string;
  totalCost: number;
  percentage: number;
}

export interface SpeciesCostEntry {
  program: string;
  fertigation: number;
  foliar: number;
  phyto: number;
  total: number;
}

export interface SpeciesSummary {
  species: string;
  entries: SpeciesCostEntry[];
  subtotal: {
    fertigation: number;
    foliar: number;
    phyto: number;
    total: number;
  };
}

export const SPRING_SCHEDULE: SequentialSchedule = {
  "title": "PLANNING D'IRRIGATION SÉQUENTIEL (VINCENT) - CYCLE DE PRINTEMPS (MARS - MI-MAI)",
  "rule": "Règle du cycle en vigueur : Total 1h30 par bloc (30m eau + 45m engrais + 15m lavage)",
  "period": "📅 PÉRIODE : MARS À MI-MAI",
  "days": [
    {
      "title": "JOUR 1 : Nectarines & Pommiers (Départ 05h00)",
      "entries": [
        {
          "parcel": "🍑 Nectarines : Nabara",
          "startHour": "05:00:00",
          "preWetting": "05h00 - 05h30 (30 min)",
          "injection": "05h30 - 06h15 (45 min)",
          "rinsing": "06h15 - 06h30 (15 min)",
          "endHour": "06:30:00",
          "duration": 90
        },
        {
          "parcel": "⏳ Pause Technique / Basculement Vannes : 06h30 - 06h40 (10 min)",
          "startHour": "",
          "preWetting": "",
          "injection": "",
          "rinsing": "",
          "endHour": "",
          "duration": 10
        },
        {
          "parcel": "🍑 Nectarines : REDIX® 25",
          "startHour": "06:40:00",
          "preWetting": "06h40 - 07h10 (30 min)",
          "injection": "07h10 - 07h55 (45 min)",
          "rinsing": "07h55 - 08h10 (15 min)",
          "endHour": "08:10:00",
          "duration": 90
        },
        {
          "parcel": "⏳ Pause Technique / Basculement Vannes : 08h10 - 08h20 (10 min)",
          "startHour": "",
          "preWetting": "",
          "injection": "",
          "rinsing": "",
          "endHour": "",
          "duration": 10
        },
        {
          "parcel": "🍏 Pommiers : Parcelles 1 et 2",
          "startHour": "08:20:00",
          "preWetting": "08h20 - 08h50 (30 min)",
          "injection": "08h50 - 09h35 (45 min)",
          "rinsing": "09h35 - 09h50 (15 min)",
          "endHour": "09:50:00",
          "duration": 90
        }
      ]
    },
    {
      "title": "JOUR 2 : Oliviers (Départ 05h00)",
      "entries": [
        {
          "parcel": "🫒 Oliviers : Parcelles 1 et 2",
          "startHour": "05:00:00",
          "preWetting": "05h00 - 05h30 (30 min)",
          "injection": "05h30 - 06h15 (45 min)",
          "rinsing": "06h15 - 06h30 (15 min)",
          "endHour": "06:30:00",
          "duration": 90
        },
        {
          "parcel": "⏳ Pause Technique / Basculement Vannes : 06h30 - 06h40 (10 min)",
          "startHour": "",
          "preWetting": "",
          "injection": "",
          "rinsing": "",
          "endHour": "",
          "duration": 10
        },
        {
          "parcel": "🫒 Oliviers : Parcelles 3 et 4",
          "startHour": "06:40:00",
          "preWetting": "06h40 - 07h10 (30 min)",
          "injection": "07h10 - 07h55 (45 min)",
          "rinsing": "07h55 - 08h10 (15 min)",
          "endHour": "08:10:00",
          "duration": 90
        },
        {
          "parcel": "⏳ Pause Technique / Basculement Vannes : 08h10 - 08h20 (10 min)",
          "startHour": "",
          "preWetting": "",
          "injection": "",
          "rinsing": "",
          "endHour": "",
          "duration": 10
        },
        {
          "parcel": "🫒 Casuarina",
          "startHour": "08:20:00",
          "preWetting": "08h20 - 08h50 (30 min)",
          "injection": "08h50 - 09h35 (45 min)",
          "rinsing": "09h35 - 09h50 (15 min)",
          "endHour": "09:50:00",
          "duration": 90
        }
      ]
    }
  ]
};

export const SUMMER_SCHEDULE: SequentialSchedule = {
  "title": "PLANNING D'IRRIGATION SÉQUENTIEL (VINCENT) - CYCLE D'ÉTÉ (À PARTIR DU 28 MAI & JUIN)",
  "rule": "Règle du cycle en vigueur : Total 2h30 par bloc (1h30 eau + 45m engrais + 15m lavage)",
  "period": "📅 PÉRIODE : À PARTIR DU 28 MAI & JUIN",
  "days": [
    {
      "title": "JOUR 1 : Nectarines & Pommiers (Départ 03h00)",
      "entries": [
        {
          "parcel": "🍑 Nectarines : Nabara",
          "startHour": "03:00:00",
          "preWetting": "03h00 - 04h30 (1h30)",
          "injection": "04h30 - 05h15 (45 min)",
          "rinsing": "05h15 - 05h30 (15 min)",
          "endHour": "05:30:00",
          "duration": 150
        },
        {
          "parcel": "⏳ Pause Technique / Basculement Vannes : 05h30 - 05h40 (10 min)",
          "startHour": "",
          "preWetting": "",
          "injection": "",
          "rinsing": "",
          "endHour": "",
          "duration": 10
        },
        {
          "parcel": "🍑 Nectarines : REDIX® 25",
          "startHour": "05:40:00",
          "preWetting": "05h40 - 07h10 (1h30)",
          "injection": "07h10 - 07h55 (45 min)",
          "rinsing": "07h55 - 08h10 (15 min)",
          "endHour": "08:10:00",
          "duration": 150
        },
        {
          "parcel": "⏳ Pause Technique / Basculement Vannes : 08h10 - 08h20 (10 min)",
          "startHour": "",
          "preWetting": "",
          "injection": "",
          "rinsing": "",
          "endHour": "",
          "duration": 10
        },
        {
          "parcel": "🍏 Pommiers : Parcelles 1 et 2",
          "startHour": "08:20:00",
          "preWetting": "08h20 - 09h50 (1h30)",
          "injection": "09h50 - 10h35 (45 min)",
          "rinsing": "10h35 - 10h50 (15 min)",
          "endHour": "10:50:00",
          "duration": 150
        }
      ]
    },
    {
      "title": "JOUR 2 : Oliviers (Départ 03h00)",
      "entries": [
        {
          "parcel": "🫒 Oliviers : Parcelles 1 et 2",
          "startHour": "03:00:00",
          "preWetting": "03h00 - 04h30 (1h30)",
          "injection": "04h30 - 05h15 (45 min)",
          "rinsing": "05h15 - 05h30 (15 min)",
          "endHour": "05:30:00",
          "duration": 150
        },
        {
          "parcel": "⏳ Pause Technique / Basculement Vannes : 05h30 - 05h40 (10 min)",
          "startHour": "",
          "preWetting": "",
          "injection": "",
          "rinsing": "",
          "endHour": "",
          "duration": 10
        },
        {
          "parcel": "🫒 Oliviers : Parcelles 3 et 4",
          "startHour": "05:40:00",
          "preWetting": "05h40 - 07h10 (1h30)",
          "injection": "07h10 - 07h55 (45 min)",
          "rinsing": "07h55 - 08h10 (15 min)",
          "endHour": "08:10:00",
          "duration": 150
        },
        {
          "parcel": "⏳ Pause Technique / Basculement Vannes : 08h10 - 08h20 (10 min)",
          "startHour": "",
          "preWetting": "",
          "injection": "",
          "rinsing": "",
          "endHour": "",
          "duration": 10
        },
        {
          "parcel": "🫒 Casuarina",
          "startHour": "08:20:00",
          "preWetting": "08h20 - 09h50 (1h30)",
          "injection": "09h50 - 10h35 (45 min)",
          "rinsing": "10h35 - 10h50 (15 min)",
          "endHour": "10:50:00",
          "duration": 150
        }
      ]
    }
  ]
};

export const SUPPLIER_SUMMARIES: SupplierSummary[] = [
  {
    "name": "Agrimax",
    "totalCost": 1170660.0,
    "percentage": 0.6209899405899678
  },
  {
    "name": "BLIDA",
    "totalCost": 225000.0,
    "percentage": 0.1193538146282804
  },
  {
    "name": "HYGINDUST",
    "totalCost": 206116.31,
    "percentage": 0.1093367460249119
  },
  {
    "name": "Agro Rafik",
    "totalCost": 195375.0,
    "percentage": 0.1036388957022235
  },
  {
    "name": "Agro Bahbah",
    "totalCost": 48000.0,
    "percentage": 0.02546214712069982
  },
  {
    "name": "NSDA",
    "totalCost": 22000.0,
    "percentage": 0.01167015076365409
  },
  {
    "name": "Agro Kamel",
    "totalCost": 18000.0,
    "percentage": 0.009548305170262433
  }
];

export const SPECIES_SUMMARIES: SpeciesSummary[] = [];
