import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STORE_TYPES } from "@/lib/pricing";
import { serializeOffer } from "@/lib/serializers";
import { refreshOfferFromStore } from "@/lib/connectors";

const upsertOfferSchema = z.object({
  id: z.string().optional(),
  productId: z.string().min(1),
  store: z.enum(STORE_TYPES),
  sellerName: z.string().trim().max(80).nullable().optional(),
  url: z.string().url(),
  titleSnapshot: z.string().trim().max(240).nullable().optional(),
  basePrice: z.number().nonnegative().optional(),
  shippingCost: z.number().nonnegative().optional(),
  discountAmount: z.number().nonnegative().optional(),
  cashbackAmount: z.number().nonnegative().optional(),
  inStock: z.boolean().optional(),
  sourceMode: z.enum(["AUTO", "BOOKMARKLET", "MANUAL"]).optional(),
  autoFetch: z.boolean().optional(),
});

export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const parsed = upsertOfferSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados da oferta inválidos." },
      { status: 400 }
    );
  }

  const data = parsed.data;
  let basePrice = data.basePrice ?? 0;
  let titleSnapshot = data.titleSnapshot ?? null;
  let inStock = data.inStock ?? true;
  let sourceMode = data.sourceMode ?? "MANUAL";
  let autoMessage: string | undefined;

  if (data.autoFetch || data.basePrice === undefined) {
    const fetched = await refreshOfferFromStore(data.store, data.url);
    if (fetched.ok && fetched.basePrice !== undefined) {
      basePrice = fetched.basePrice;
      titleSnapshot = fetched.titleSnapshot ?? titleSnapshot;
      inStock = fetched.inStock ?? inStock;
      sourceMode = "AUTO";
    } else if (data.basePrice === undefined) {
      autoMessage = fetched.error;
    }
  }

  if (data.id) {
    const existing = await prisma.storeOffer.findUnique({
      where: { id: data.id },
    });
    const oldBase = existing ? Number(existing.basePrice) : null;
    const priceChanged = oldBase !== null && Math.abs(oldBase - basePrice) >= 0.01;

    const updated = await prisma.storeOffer.update({
      where: { id: data.id },
      data: {
        store: data.store,
        sellerName: data.sellerName ?? null,
        url: data.url,
        ...(titleSnapshot !== null ? { titleSnapshot } : {}),
        ...(priceChanged ? { previousBasePrice: oldBase } : {}),
        basePrice,
        ...(data.shippingCost !== undefined
          ? { shippingCost: data.shippingCost }
          : {}),
        ...(data.discountAmount !== undefined
          ? { discountAmount: data.discountAmount }
          : {}),
        ...(data.cashbackAmount !== undefined
          ? { cashbackAmount: data.cashbackAmount }
          : {}),
        inStock,
        sourceMode,
        lastCheckedAt: new Date(),
      },
    });
    return NextResponse.json({
      offer: serializeOffer(updated),
      warning: autoMessage,
    });
  }

  const created = await prisma.storeOffer.create({
    data: {
      productId: data.productId,
      store: data.store,
      sellerName: data.sellerName ?? null,
      url: data.url,
      titleSnapshot,
      basePrice,
      shippingCost: data.shippingCost ?? 0,
      discountAmount: data.discountAmount ?? 0,
      cashbackAmount: data.cashbackAmount ?? 0,
      inStock,
      sourceMode,
      lastCheckedAt: new Date(),
    },
  });

  return NextResponse.json({
    offer: serializeOffer(created),
    warning: autoMessage,
  });
}
