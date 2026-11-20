import type { SupplierPurchase } from "@/lib/suppliers-store";

/**
 * Relevé officiel des achats d'engrais et produits phytosanitaires — Fournisseur Agrimax (Keep Green, Sebain - Tiaret)
 * Client : Mouaas Abdlmalik
 *
 * Récapitulatif financier du relevé :
 * - Facture 01 (21/02/2026) :    75 000 DA
 * - Facture 02 (21/02/2026) :    10 800 DA
 * - Facture 03 (09/03/2026) :    72 650 DA
 * - Facture 04 (28/03/2026) :    39 300 DA
 * - Facture 05 (28/03/2026) :     4 500 DA
 * - Facture 08 (28/04/2026) :   747 000 DA
 * - Facture 09 (06/05/2026) :   175 000 DA
 * - Facture 10 (16/05/2026) :   208 300 DA
 * -----------------------------------------
 * Total factures            : 1 332 550 DA
 * Versements (100k + 300k)  :   400 000 DA
 * Retour (04/08/2026)       :   372 400 DA
 * Total versé + retour      :   772 400 DA
 * Reste à payer             :   560 150 DA
 */
export const AGRIMAX_PURCHASES: SupplierPurchase[] = [
  // ========================
  // FACTURE 01 — 21.02.2026 (75 000 DA — payée)
  // ========================
  {
    id: "agrimax-f01-bouillie-bordelaise",
    orderNumber: "AGRIMAX-F01",
    supplierName: "Agrimax",
    productName: "Bouillie Bordelaise WG 10kg",
    purchaseDate: "2026-02-21",
    quantity: 50,
    unit: "kg",
    pricePerUnit: 1500,
    totalCost: 75000,
    paidAmount: 75000,
    consumed: 0,
  },

  // ========================
  // FACTURE 02 — 21.02.2026 (10 800 DA — payée)
  // ========================
  {
    id: "agrimax-f02-foliboost-bz",
    orderNumber: "AGRIMAX-F02",
    supplierName: "Agrimax",
    productName: "Foliboost BZ 1kg",
    purchaseDate: "2026-02-21",
    quantity: 6,
    unit: "kg",
    pricePerUnit: 1800,
    totalCost: 10800,
    paidAmount: 10800,
    consumed: 0,
  },

  // ========================
  // FACTURE 03 — 09.03.2026 (72 650 DA — payée)
  // ========================
  {
    id: "agrimax-f03-uree-46",
    orderNumber: "AGRIMAX-F03",
    supplierName: "Agrimax",
    productName: "Urée 46%",
    purchaseDate: "2026-03-09",
    quantity: 50, // 0.5 Qx = 50 kg
    unit: "kg",
    pricePerUnit: 65, // 6 500 DA / Qx
    totalCost: 3250,
    paidAmount: 3250,
    consumed: 0,
  },
  {
    id: "agrimax-f03-nitrate-magnesium",
    orderNumber: "AGRIMAX-F03",
    supplierName: "Agrimax",
    productName: "Nitrate de magnésium",
    purchaseDate: "2026-03-09",
    quantity: 50,
    unit: "kg",
    pricePerUnit: 140,
    totalCost: 7000,
    paidAmount: 7000,
    consumed: 0,
  },
  {
    id: "agrimax-f03-sulfate-potassium",
    orderNumber: "AGRIMAX-F03",
    supplierName: "Agrimax",
    productName: "Sulfate de potassium (0-0-50)",
    purchaseDate: "2026-03-09",
    quantity: 25,
    unit: "kg",
    pricePerUnit: 200,
    totalCost: 5000,
    paidAmount: 5000,
    consumed: 0,
  },
  {
    id: "agrimax-f03-nitrate-calcium",
    orderNumber: "AGRIMAX-F03",
    supplierName: "Agrimax",
    productName: "Nitrate de calcium",
    purchaseDate: "2026-03-09",
    quantity: 25,
    unit: "kg",
    pricePerUnit: 240,
    totalCost: 6000,
    paidAmount: 6000,
    consumed: 0,
  },
  {
    id: "agrimax-f03-npk-13-0-46",
    orderNumber: "AGRIMAX-F03",
    supplierName: "Agrimax",
    productName: "NPK 13-0-46",
    purchaseDate: "2026-03-09",
    quantity: 25,
    unit: "kg",
    pricePerUnit: 220,
    totalCost: 5500,
    paidAmount: 5500,
    consumed: 0,
  },
  {
    id: "agrimax-f03-calcibore",
    orderNumber: "AGRIMAX-F03",
    supplierName: "Agrimax",
    productName: "Calcibore 10L",
    purchaseDate: "2026-03-09",
    quantity: 10, // 1 bidon de 10 L
    unit: "litres",
    pricePerUnit: 1100, // 11 000 DA / bidon 10L
    totalCost: 11000,
    paidAmount: 11000,
    consumed: 0,
  },
  {
    id: "agrimax-f03-fertimix-plus",
    orderNumber: "AGRIMAX-F03",
    supplierName: "Agrimax",
    productName: "Fertimix Plus",
    purchaseDate: "2026-03-09",
    quantity: 2,
    unit: "kg",
    pricePerUnit: 3450,
    totalCost: 6900,
    paidAmount: 6900,
    consumed: 0,
  },
  {
    id: "agrimax-f03-acide-phosphorique",
    orderNumber: "AGRIMAX-F03",
    supplierName: "Agrimax",
    productName: "Acide phosphorique 85% 20L",
    purchaseDate: "2026-03-09",
    quantity: 20, // 1 bidon de 20 L
    unit: "litres",
    pricePerUnit: 500, // 10 000 DA / bidon 20L
    totalCost: 10000,
    paidAmount: 10000,
    consumed: 0,
  },
  {
    id: "agrimax-f03-acide-nitrique",
    orderNumber: "AGRIMAX-F03",
    supplierName: "Agrimax",
    productName: "Acide Nitrique",
    purchaseDate: "2026-03-09",
    quantity: 20, // 1 bidon de 20 L
    unit: "litres",
    pricePerUnit: 225, // 4 500 DA / bidon 20L
    totalCost: 4500,
    paidAmount: 4500,
    consumed: 0,
  },
  {
    id: "agrimax-f03-sulfate-ammonium",
    orderNumber: "AGRIMAX-F03",
    supplierName: "Agrimax",
    productName: "Sulfate d'ammonium 21%",
    purchaseDate: "2026-03-09",
    quantity: 100, // 1 Qx = 100 kg
    unit: "kg",
    pricePerUnit: 135, // 13 500 DA / Qx
    totalCost: 13500,
    paidAmount: 13500,
    consumed: 0,
  },

  // ========================
  // FACTURE 04 — 28.03.2026 (39 300 DA — payée)
  // ========================
  {
    id: "agrimax-f04-algua-live",
    orderNumber: "AGRIMAX-F04",
    supplierName: "Agrimax",
    productName: "Algua live 1L",
    purchaseDate: "2026-03-28",
    quantity: 2,
    unit: "litres",
    pricePerUnit: 3700,
    totalCost: 7400,
    paidAmount: 7400,
    consumed: 0,
  },
  {
    id: "agrimax-f04-azostar",
    orderNumber: "AGRIMAX-F04",
    supplierName: "Agrimax",
    productName: "Azostar 1L",
    purchaseDate: "2026-03-28",
    quantity: 1,
    unit: "litres",
    pricePerUnit: 8500,
    totalCost: 8500,
    paidAmount: 8500,
    consumed: 0,
  },
  {
    id: "agrimax-f04-ferland",
    orderNumber: "AGRIMAX-F04",
    supplierName: "Agrimax",
    productName: "Ferland",
    purchaseDate: "2026-03-28",
    quantity: 1,
    unit: "kg",
    pricePerUnit: 3400,
    totalCost: 3400,
    paidAmount: 3400,
    consumed: 0,
  },
  {
    id: "agrimax-f04-acide-phosphorique",
    orderNumber: "AGRIMAX-F04",
    supplierName: "Agrimax",
    productName: "Acide phosphorique 85% 20L",
    purchaseDate: "2026-03-28",
    quantity: 40, // 2 bidons de 20 L
    unit: "litres",
    pricePerUnit: 500, // 10 000 DA / bidon
    totalCost: 20000,
    paidAmount: 20000,
    consumed: 0,
  },

  // ========================
  // FACTURE 05 — 28.03.2026 (4 500 DA — payée)
  // ========================
  {
    id: "agrimax-f05-sulfate-magnesium",
    orderNumber: "AGRIMAX-F05",
    supplierName: "Agrimax",
    productName: "Sulfate de magnésium",
    purchaseDate: "2026-03-28",
    quantity: 25,
    unit: "kg",
    pricePerUnit: 140,
    totalCost: 3500,
    paidAmount: 3500,
    consumed: 0,
  },
  {
    id: "agrimax-f05-lamdoc-50ec",
    orderNumber: "AGRIMAX-F05",
    supplierName: "Agrimax",
    productName: "Lamdoc 50 EC",
    purchaseDate: "2026-03-28",
    quantity: 1,
    unit: "litres",
    pricePerUnit: 1000,
    totalCost: 1000,
    paidAmount: 1000,
    consumed: 0,
  },

  // ========================
  // FACTURE 08 — 28.04.2026 (747 000 DA — payée 570 150 DA / reste 176 850 DA)
  // ========================
  {
    id: "agrimax-f08-npk-13-0-46",
    orderNumber: "AGRIMAX-F08",
    supplierName: "Agrimax",
    productName: "NPK 13-0-46",
    purchaseDate: "2026-04-28",
    quantity: 300, // 3 Qx = 300 kg
    unit: "kg",
    pricePerUnit: 220, // 22 000 DA / Qx
    totalCost: 66000,
    paidAmount: 66000,
    consumed: 0,
  },
  {
    id: "agrimax-f08-acide-nitrique",
    orderNumber: "AGRIMAX-F08",
    supplierName: "Agrimax",
    productName: "Acide Nitrique",
    purchaseDate: "2026-04-28",
    quantity: 380, // 19 bidons × 20 L
    unit: "litres",
    pricePerUnit: 450, // 9 000 DA / bidon 20L
    totalCost: 171000,
    paidAmount: 171000,
    consumed: 0,
  },
  {
    id: "agrimax-f08-nitrate-calcium",
    orderNumber: "AGRIMAX-F08",
    supplierName: "Agrimax",
    productName: "Nitrate de calcium",
    purchaseDate: "2026-04-28",
    quantity: 400, // 4 Qx = 400 kg
    unit: "kg",
    pricePerUnit: 240, // 24 000 DA / Qx
    totalCost: 96000,
    paidAmount: 96000,
    consumed: 0,
  },
  {
    id: "agrimax-f08-uree-46",
    orderNumber: "AGRIMAX-F08",
    supplierName: "Agrimax",
    productName: "Urée 46%",
    purchaseDate: "2026-04-28",
    quantity: 300, // 3 Qx = 300 kg
    unit: "kg",
    pricePerUnit: 65, // 6 500 DA / Qx
    totalCost: 19500,
    paidAmount: 19500,
    consumed: 0,
  },
  {
    id: "agrimax-f08-fertimix-plus",
    orderNumber: "AGRIMAX-F08",
    supplierName: "Agrimax",
    productName: "Fertimix Plus",
    purchaseDate: "2026-04-28",
    quantity: 30,
    unit: "kg",
    pricePerUnit: 3400,
    totalCost: 102000,
    paidAmount: 102000,
    consumed: 0,
  },
  {
    id: "agrimax-f08-sulfate-magnesium",
    orderNumber: "AGRIMAX-F08",
    supplierName: "Agrimax",
    productName: "Sulfate de magnésium",
    purchaseDate: "2026-04-28",
    quantity: 125, // 1.25 Qx = 125 kg
    unit: "kg",
    pricePerUnit: 240, // 24 000 DA / Qx
    totalCost: 30000,
    paidAmount: 30000,
    consumed: 0,
  },
  {
    id: "agrimax-f08-acide-phosphorique",
    orderNumber: "AGRIMAX-F08",
    supplierName: "Agrimax",
    productName: "Acide phosphorique 85% 20L",
    purchaseDate: "2026-04-28",
    quantity: 300, // 15 bidons × 20 L
    unit: "litres",
    pricePerUnit: 875, // 17 500 DA / bidon 20L
    totalCost: 262500,
    paidAmount: 85650, // Solde versé/retour imputé sur F08 -> total payé Agrimax = 772 400 DA, reste = 560 150 DA
    consumed: 0,
  },

  // ========================
  // FACTURE 09 — 06.05.2026 (175 000 DA — à régler)
  // ========================
  {
    id: "agrimax-f09-calcibore",
    orderNumber: "AGRIMAX-F09",
    supplierName: "Agrimax",
    productName: "Calcibore 10L",
    purchaseDate: "2026-05-06",
    quantity: 30, // 3 bidons de 10 L
    unit: "litres",
    pricePerUnit: 1100, // 11 000 DA / bidon 10L
    totalCost: 33000,
    paidAmount: 0,
    consumed: 0,
  },
  {
    id: "agrimax-f09-ferland-648",
    orderNumber: "AGRIMAX-F09",
    supplierName: "Agrimax",
    productName: "Ferland 648",
    purchaseDate: "2026-05-06",
    quantity: 30,
    unit: "kg",
    pricePerUnit: 3400,
    totalCost: 102000,
    paidAmount: 0,
    consumed: 0,
  },
  {
    id: "agrimax-f09-sulfate-potassium",
    orderNumber: "AGRIMAX-F09",
    supplierName: "Agrimax",
    productName: "Sulfate de potassium (0-0-50)",
    purchaseDate: "2026-05-06",
    quantity: 200, // 2 Qx = 200 kg
    unit: "kg",
    pricePerUnit: 200, // 20 000 DA / Qx
    totalCost: 40000,
    paidAmount: 0,
    consumed: 0,
  },

  // ========================
  // FACTURE 10 — 16.05.2026 (208 300 DA — à régler)
  // ========================
  {
    id: "agrimax-f10-zoro",
    orderNumber: "AGRIMAX-F10",
    supplierName: "Agrimax",
    productName: "Zoro",
    purchaseDate: "2026-05-16",
    quantity: 2,
    unit: "litres",
    pricePerUnit: 8100,
    totalCost: 16200,
    paidAmount: 0,
    consumed: 0,
  },
  {
    id: "agrimax-f10-decis-expert",
    orderNumber: "AGRIMAX-F10",
    supplierName: "Agrimax",
    productName: "Decis Expert 100 EC",
    purchaseDate: "2026-05-16",
    quantity: 4, // 4 flacons
    unit: "litres",
    pricePerUnit: 6500,
    totalCost: 26000,
    paidAmount: 0,
    consumed: 0,
  },
  {
    id: "agrimax-f10-acetaplan",
    orderNumber: "AGRIMAX-F10",
    supplierName: "Agrimax",
    productName: "Acetaplan 200 SL 1.1L",
    purchaseDate: "2026-05-16",
    quantity: 2.2, // 2 flacons de 1.1 L
    unit: "litres",
    pricePerUnit: 6181.82, // 6 800 DA / flacon 1.1L
    totalCost: 13600,
    paidAmount: 0,
    consumed: 0,
  },
  {
    id: "agrimax-f10-uree-46",
    orderNumber: "AGRIMAX-F10",
    supplierName: "Agrimax",
    productName: "Urée 46%",
    purchaseDate: "2026-05-16",
    quantity: 300, // 3 Qx = 300 kg
    unit: "kg",
    pricePerUnit: 65, // 6 500 DA / Qx
    totalCost: 19500,
    paidAmount: 0,
    consumed: 0,
  },
  {
    id: "agrimax-f10-algreen",
    orderNumber: "AGRIMAX-F10",
    supplierName: "Agrimax",
    productName: "Algreen 1L",
    purchaseDate: "2026-05-16",
    quantity: 36,
    unit: "litres",
    pricePerUnit: 3000,
    totalCost: 108000,
    paidAmount: 0,
    consumed: 0,
  },
  {
    id: "agrimax-f10-humi-plus",
    orderNumber: "AGRIMAX-F10",
    supplierName: "Agrimax",
    productName: "Humi plus 20L",
    purchaseDate: "2026-05-16",
    quantity: 40, // 2 bidons de 20 L
    unit: "litres",
    pricePerUnit: 625, // 12 500 DA / bidon 20L
    totalCost: 25000,
    paidAmount: 0,
    consumed: 0,
  },
];
