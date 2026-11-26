export const STORE_TYPES = [
  "MERCADO_LIVRE",
  "AMAZON",
  "ALIEXPRESS",
  "KABUM",
  "TIKTOK_SHOP",
] as const;

export type StoreType = (typeof STORE_TYPES)[number];

export interface StoreMeta {
  id: StoreType;
  label: string;
  shortLabel: string;
  autoRefresh: boolean;
  badgeClass: string;
}

export const STORE_META: Record<StoreType, StoreMeta> = {
  MERCADO_LIVRE: {
    id: "MERCADO_LIVRE",
    label: "Mercado Livre",
    shortLabel: "ML",
    autoRefresh: true,
    badgeClass: "bg-yellow-100 text-yellow-900 border-yellow-300",
  },
  AMAZON: {
    id: "AMAZON",
    label: "Amazon",
    shortLabel: "Amazon",
    autoRefresh: false,
    badgeClass: "bg-amber-100 text-amber-900 border-amber-300",
  },
  ALIEXPRESS: {
    id: "ALIEXPRESS",
    label: "AliExpress",
    shortLabel: "AliExpress",
    autoRefresh: false,
    badgeClass: "bg-orange-100 text-orange-900 border-orange-300",
  },
  KABUM: {
    id: "KABUM",
    label: "KaBuM!",
    shortLabel: "KaBuM",
    autoRefresh: true,
    badgeClass: "bg-sky-100 text-sky-900 border-sky-300",
  },
  TIKTOK_SHOP: {
    id: "TIKTOK_SHOP",
    label: "TikTok Shop",
    shortLabel: "TikTok",
    autoRefresh: false,
    badgeClass: "bg-zinc-900 text-white border-zinc-700",
  },
};

export interface PriceComponents {
  basePrice: number;
  shippingCost?: number;
  discountAmount?: number;
  cashbackAmount?: number;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function calculateFinalPrice(input: PriceComponents): number {
  const base = Number(input.basePrice) || 0;
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
  offers: T[]
): { bestStore: StoreType; bestPrice: number } | null {
  if (offers.length === 0) return null;

  const inStockOffers = offers.filter((o) => o.inStock !== false);
  const candidates = inStockOffers.length > 0 ? inStockOffers : offers;

  let best = candidates[0];
  let bestPrice = calculateFinalPrice(best);

  for (let i = 1; i < candidates.length; i++) {
    const candidate = candidates[i];
    const price = calculateFinalPrice(candidate);
    if (price < bestPrice) {
      best = candidate;
      bestPrice = price;
    }
  }

  return { bestStore: best.store, bestPrice };
}

export function getBestOfferForStore<T extends OfferForComparison>(
  offers: T[],
  store: StoreType
): { best: T; totalInStore: number } | null {
  const storeOffers = offers.filter((o) => o.store === store);
  if (storeOffers.length === 0) return null;

  const inStock = storeOffers.filter((o) => o.inStock !== false);
  const candidates = inStock.length > 0 ? inStock : storeOffers;

  let best = candidates[0];
  let bestPrice = calculateFinalPrice(best);
  for (let i = 1; i < candidates.length; i++) {
    const p = calculateFinalPrice(candidates[i]);
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
