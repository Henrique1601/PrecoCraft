import type { List, Product, StoreOffer } from "@prisma/client";
import type { StoreType } from "./pricing";

export interface SerializedOffer {
  id: string;
  productId: string;
  store: StoreType;
  sellerName: string | null;
  url: string;
  titleSnapshot: string | null;
  basePrice: number;
  previousBasePrice: number | null;
  lowestPriceSeen: number | null;
  installmentPrice: number | null;
  shippingCost: number;
  discountAmount: number;
  cashbackAmount: number;
  inStock: boolean;
  sourceMode: string;
  lastCheckedAt: string;
}

export interface SerializedProduct {
  id: string;
  listId: string;
  name: string;
  notes: string | null;
  targetPrice: number | null;
  purchased: boolean;
  createdAt: string;
  offers: SerializedOffer[];
}

export interface SerializedList {
  id: string;
  name: string;
  createdAt: string;
  products: SerializedProduct[];
}

export function serializeOffer(offer: StoreOffer): SerializedOffer {
  return {
    id: offer.id,
    productId: offer.productId,
    store: offer.store as StoreType,
    sellerName: offer.sellerName,
    url: offer.url,
    titleSnapshot: offer.titleSnapshot,
    basePrice: Number(offer.basePrice),
    previousBasePrice:
      offer.previousBasePrice !== null ? Number(offer.previousBasePrice) : null,
    lowestPriceSeen:
      offer.lowestPriceSeen !== null ? Number(offer.lowestPriceSeen) : null,
    installmentPrice:
      offer.installmentPrice !== null ? Number(offer.installmentPrice) : null,
    shippingCost: Number(offer.shippingCost),
    discountAmount: Number(offer.discountAmount),
    cashbackAmount: Number(offer.cashbackAmount),
    inStock: offer.inStock,
    sourceMode: offer.sourceMode,
    lastCheckedAt: offer.lastCheckedAt.toISOString(),
  };
}

export function serializeProduct(
  p: Product & { offers: StoreOffer[] }
): SerializedProduct {
  return {
    id: p.id,
    listId: p.listId,
    name: p.name,
    notes: p.notes,
    targetPrice: p.targetPrice !== null ? Number(p.targetPrice) : null,
    purchased: p.purchased,
    createdAt: p.createdAt.toISOString(),
    offers: p.offers.map(serializeOffer),
  };
}

export function serializeList(
  list: List & {
    products: Array<Product & { offers: StoreOffer[] }>;
  }
): SerializedList {
  return {
    id: list.id,
    name: list.name,
    createdAt: list.createdAt.toISOString(),
    products: list.products.map(serializeProduct),
  };
}
