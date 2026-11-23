import { matchProductName, parsePhytoProductQuantity } from "@/lib/stock-alerts";
import type { SupplierPurchase } from "@/lib/suppliers-store";
import type { FertilizerProduct } from "@/data/fertilizers";

function parseNum(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = parseFloat(String(v ?? "").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Résout le prix unitaire d'un produit depuis le stock Agrimax / Fournisseurs,
 * puis depuis la Base Produits centrale (`products`).
 */
export function resolveProductUnitPrice(
  productName: string | undefined,
  suppliers: SupplierPurchase[],
  products: FertilizerProduct[],
): number {
  const name = (productName || "").trim();
  if (!name) return 0;

  // 1. Prix moyen pondéré ou dernier prix connu dans le stock fournisseurs (Agrimax)
  let totalQty = 0;
  let totalCost = 0;
  let latestPrice = 0;
  for (const s of suppliers) {
    if (!s.productName || !(s.pricePerUnit > 0)) continue;
    if (matchProductName(name, s.productName)) {
      latestPrice = s.pricePerUnit;
      if (s.quantity > 0) {
        totalQty += s.quantity;
        totalCost += s.quantity * s.pricePerUnit;
      }
    }
  }
  if (totalQty > 0 && totalCost > 0) {
    return Number((totalCost / totalQty).toFixed(2));
  }
  if (latestPrice > 0) return latestPrice;

  // 2. Fallback sur la Base Produits
  for (const p of products) {
    if (!p.name || !(p.price > 0)) continue;
    if (matchProductName(name, p.name)) {
      return p.price;
    }
  }

  return 0;
}

/**
 * Calcule le coût réel d'une pulvérisation foliaire.
 * Si `record.total` est à 0, valorise automatiquement via les prix stock/base produits.
 */
export function computePulverisationRecordTotal(
  record: any,
  suppliers: SupplierPurchase[],
  products: FertilizerProduct[],
): { total: number; estimatedFromStock: boolean } {
  const savedTotal = parseNum(record?.total);
  if (savedTotal > 0) return { total: savedTotal, estimatedFromStock: false };

  const items = Array.isArray(record?.items) ? record.items : [];
  let sum = 0;
  let usedStock = false;
  for (const it of items) {
    const qty = parseNum(it?.qty);
    if (qty <= 0) continue;
    const linePrice = parseNum(it?.price);
    if (linePrice > 0) {
      sum += qty * linePrice;
    } else {
      const stockPu = resolveProductUnitPrice(it?.name, suppliers, products);
      if (stockPu > 0) {
        sum += qty * stockPu;
        usedStock = true;
      }
    }
  }
  return { total: Number(sum.toFixed(2)), estimatedFromStock: usedStock };
}

/**
 * Calcule le coût réel d'un traitement phytosanitaire.
 * Si `record.total` est à 0, valorise automatiquement via les prix stock/base produits.
 */
export function computePhytosanitaireRecordTotal(
  record: any,
  suppliers: SupplierPurchase[],
  products: FertilizerProduct[],
): { total: number; estimatedFromStock: boolean } {
  const savedTotal = parseNum(record?.total);
  if (savedTotal > 0) return { total: savedTotal, estimatedFromStock: false };

  const prods = Array.isArray(record?.products) ? record.products : [];
  let sum = 0;
  let usedStock = false;
  for (const p of prods) {
    const linePrice = parseNum(p?.price);
    if (linePrice > 0) {
      sum += linePrice;
      continue;
    }
    const stockPu = resolveProductUnitPrice(p?.product, suppliers, products);
    if (stockPu > 0) {
      const vol = parseNum(p?.volume) || 1000;
      const qtyObj = parsePhytoProductQuantity(String(p?.dosage || ""), String(vol), 1);
      const qty = qtyObj && qtyObj.needed > 0 ? qtyObj.needed : 1;
      sum += qty * stockPu;
      usedStock = true;
    }
  }
  return { total: Number(sum.toFixed(2)), estimatedFromStock: usedStock };
}

/**
 * Calcule le coût réel d'un programme de fertigation (Bacs A, B, C, D).
 * Si `record.total` est à 0, calcule `dose/ha × surface × prix stock × fréquence`.
 */
export function computeFertilisationRecordTotal(
  record: any,
  suppliers: SupplierPurchase[],
  products: FertilizerProduct[],
): { total: number; estimatedFromStock: boolean } {
  const savedTotal = parseNum(record?.total);
  if (savedTotal > 0) return { total: savedTotal, estimatedFromStock: false };

  const entries = Array.isArray(record?.entries) ? record.entries : [];
  const ha = parseNum(record?.hectares) || 1;
  const freq = parseNum(record?.frequency) || 1;
  let perPassage = 0;
  let usedStock = false;

  for (const entry of entries) {
    const items = Array.isArray(entry?.items) ? entry.items : [];
    for (const it of items) {
      const doseHa = parseNum(it?.qty);
      if (doseHa <= 0) continue;
      const linePrice = parseNum(it?.price);
      if (linePrice > 0) {
        perPassage += doseHa * ha * linePrice;
      } else {
        const stockPu = resolveProductUnitPrice(it?.name, suppliers, products);
        if (stockPu > 0) {
          perPassage += doseHa * ha * stockPu;
          usedStock = true;
        }
      }
    }
  }

  return { total: Number((perPassage * freq).toFixed(2)), estimatedFromStock: usedStock };
}
