export const STORE_TYPES = [
  "MERCADO_LIVRE",
  "AMAZON",
  "ALIEXPRESS",
  "KABUM",
  "TIKTOK_SHOP",
] as const;

export type StoreType = (typeof STORE_TYPES)[number];
export type PaymentMode = "cash" | "installment";
export type SortMode = "recent" | "target_first" | "price_asc" | "price_desc";

export interface StoreMeta {
  id: StoreType;
  label: string;
  shortLabel: string;
  autoRefresh: boolean;
  badgeClass: string;
  dotClass: string;
}

export const STORE_META: Record<StoreType, StoreMeta> = {
  MERCADO_LIVRE: {
    id: "MERCADO_LIVRE",
    label: "Mercado Livre",
    shortLabel: "ML",
    autoRefresh: true,
    badgeClass: "bg-yellow-100 text-yellow-900 border-yellow-300",
    dotClass: "bg-yellow-400",
  },
  AMAZON: {
    id: "AMAZON",
    label: "Amazon",
    shortLabel: "Amazon",
    autoRefresh: false,
    badgeClass: "bg-amber-100 text-amber-900 border-amber-300",
    dotClass: "bg-amber-500",
  },
  ALIEXPRESS: {
    id: "ALIEXPRESS",
    label: "AliExpress",
    shortLabel: "AliExpress",
    autoRefresh: false,
    badgeClass: "bg-orange-100 text-orange-900 border-orange-300",
    dotClass: "bg-orange-500",
  },
  KABUM: {
    id: "KABUM",
    label: "KaBuM!",
    shortLabel: "KaBuM",
    autoRefresh: true,
    badgeClass: "bg-sky-100 text-sky-900 border-sky-300",
    dotClass: "bg-sky-500",
  },
  TIKTOK_SHOP: {
    id: "TIKTOK_SHOP",
    label: "TikTok Shop",
    shortLabel: "TikTok",
    autoRefresh: false,
    badgeClass: "bg-zinc-900 text-white border-zinc-700",
    dotClass: "bg-pink-500",
  },
};

export interface PriceComponents {
  basePrice: number;
  installmentPrice?: number | null;
  shippingCost?: number;
  discountAmount?: number;
  cashbackAmount?: number;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function calculateFinalPrice(
  input: PriceComponents,
  mode: PaymentMode = "cash"
): number {
  const base =
    mode === "installment" &&
    input.installmentPrice !== null &&
    input.installmentPrice !== undefined
      ? Number(input.installmentPrice)
      : Number(input.basePrice) || 0;
  const shipping = Number(input.shippingCost) || 0;
  const discount = Number(input.discountAmount) || 0;
  const cashback = Number(input.cashbackAmount) || 0;
  return Math.max(0, round2(base + shipping - discount - cashback));
}

export interface OfferForComparison extends PriceComponents {
  store: StoreType;
  inStock?: boolean;
}

export function findBestOffer<T extends OfferForComparison>(
  offers: T[],
  mode: PaymentMode = "cash"
): { bestStore: StoreType; bestPrice: number } | null {
  if (offers.length === 0) return null;

  const inStockOffers = offers.filter((o) => o.inStock !== false);
  const candidates = inStockOffers.length > 0 ? inStockOffers : offers;

  let best = candidates[0];
  let bestPrice = calculateFinalPrice(best, mode);

  for (let i = 1; i < candidates.length; i++) {
    const candidate = candidates[i];
    const price = calculateFinalPrice(candidate, mode);
    if (price < bestPrice) {
      best = candidate;
      bestPrice = price;
    }
  }

  return { bestStore: best.store, bestPrice };
}

export function calculateSavings<T extends OfferForComparison>(
  offers: T[],
  mode: PaymentMode = "cash"
): number | null {
  const inStock = offers.filter((o) => o.inStock !== false);
  if (inStock.length < 2) return null;
  const prices = inStock
    .map((o) => calculateFinalPrice(o, mode))
    .sort((a, b) => a - b);
  const diff = round2(prices[1] - prices[0]);
  return diff > 0.01 ? diff : null;
}

export function getBestOfferForStore<T extends OfferForComparison>(
  offers: T[],
  store: StoreType,
  mode: PaymentMode = "cash"
): { best: T; totalInStore: number } | null {
  const storeOffers = offers.filter((o) => o.store === store);
  if (storeOffers.length === 0) return null;

  const inStock = storeOffers.filter((o) => o.inStock !== false);
  const candidates = inStock.length > 0 ? inStock : storeOffers;

  let best = candidates[0];
  let bestPrice = calculateFinalPrice(best, mode);
  for (let i = 1; i < candidates.length; i++) {
    const p = calculateFinalPrice(candidates[i], mode);
    if (p < bestPrice) {
      best = candidates[i];
      bestPrice = p;
    }
  }
  return { best, totalInStore: storeOffers.length };
}

export function getPriceDelta(
  currentBase: number,
  previousBase: number | null
): number | null {
  if (previousBase === null || previousBase === undefined) return null;
  const diff = round2(currentBase - previousBase);
  if (Math.abs(diff) < 0.01) return null;
  return diff;
}

export interface SingleStoreSummary {
  store: StoreType;
  coveredCount: number;
  totalCount: number;
  totalPrice: number;
}

export function calculateSingleStoreTotals<
  T extends { purchased?: boolean; offers: OfferForComparison[] },
>(products: T[], mode: PaymentMode = "cash"): SingleStoreSummary[] {
  const pending = products.filter((p) => !p.purchased);
  if (pending.length === 0) return [];

  return STORE_TYPES.map((store) => {
    let coveredCount = 0;
    let totalPrice = 0;
    for (const p of pending) {
      const storeBest = getBestOfferForStore(p.offers, store, mode);
      if (storeBest) {
        coveredCount++;
        totalPrice = round2(
          totalPrice + calculateFinalPrice(storeBest.best, mode)
        );
      }
    }
    return {
      store,
      coveredCount,
      totalCount: pending.length,
      totalPrice,
    };
  })
    .filter((s) => s.coveredCount > 0)
    .sort((a, b) => {
      if (b.coveredCount !== a.coveredCount) {
        return b.coveredCount - a.coveredCount;
      }
      return a.totalPrice - b.totalPrice;
    });
}

export function sortProducts<
  T extends {
    targetPrice: number | null;
    purchased: boolean;
    offers: OfferForComparison[];
  },
>(products: T[], sortBy: SortMode, mode: PaymentMode = "cash"): T[] {
  if (sortBy === "recent") return products;
  const copy = [...products];
  copy.sort((a, b) => {
    const bestA = findBestOffer(a.offers, mode);
    const bestB = findBestOffer(b.offers, mode);
    const priceA = bestA ? bestA.bestPrice : Number.POSITIVE_INFINITY;
    const priceB = bestB ? bestB.bestPrice : Number.POSITIVE_INFINITY;

    if (sortBy === "price_asc") return priceA - priceB;
    if (sortBy === "price_desc") {
      const valA = bestA ? bestA.bestPrice : -1;
      const valB = bestB ? bestB.bestPrice : -1;
      return valB - valA;
    }
    // target_first
    const hitA =
      !a.purchased &&
      bestA !== null &&
      a.targetPrice !== null &&
      bestA.bestPrice <= a.targetPrice
        ? 1
        : 0;
    const hitB =
      !b.purchased &&
      bestB !== null &&
      b.targetPrice !== null &&
      bestB.bestPrice <= b.targetPrice
        ? 1
        : 0;
    if (hitB !== hitA) return hitB - hitA;
    return priceA - priceB;
  });
  return copy;
}

export function detectStoreFromUrl(rawUrl: string): StoreType | null {
  try {
    const host = new URL(rawUrl).hostname.toLowerCase();
    if (
      host.includes("mercadolivre.") ||
      host.includes("mercadolibre.") ||
      host === "meli.la"
    ) {
      return "MERCADO_LIVRE";
    }
    if (host.includes("amazon.") || host === "amzn.to" || host === "a.co") {
      return "AMAZON";
    }
    if (host.includes("aliexpress.") || host === "s.click.aliexpress.com") {
      return "ALIEXPRESS";
    }
    if (host.includes("kabum.com.br")) {
      return "KABUM";
    }
    if (host.includes("tiktok.com")) {
      return "TIKTOK_SHOP";
    }
    return null;
  } catch {
    return null;
  }
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}
