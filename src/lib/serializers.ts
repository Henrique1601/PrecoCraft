import type { List, Product, StoreOffer } from "@prisma/client";
import type { StoreType } from "./pricing";

export interface SerializedOffer {
  id: string;
  productId: string;
  store: StoreType;
  url: string;
  titleSnapshot: string | null;
  basePrice: number;
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
    url: offer.url,
    titleSnapshot: offer.titleSnapshot,
    basePrice: Number(offer.basePrice),
    shippingCost: Number(offer.shippingCost),
    discountAmount: Number(offer.discountAmount),
    cashbackAmount: Number(offer.cashbackAmount),
    inStock: offer.inStock,
    sourceMode: offer.sourceMode,
    lastCheckedAt: offer.lastCheckedAt.toISOString(),
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
    products: list.products.map((p) => ({
      id: p.id,
      listId: p.listId,
      name: p.name,
      notes: p.notes,
      createdAt: p.createdAt.toISOString(),
      offers: p.offers.map(serializeOffer),
    })),
  };
}
