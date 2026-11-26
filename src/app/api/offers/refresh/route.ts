import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { refreshOfferFromStore } from "@/lib/connectors";
import { STORE_META, type StoreType } from "@/lib/pricing";
import { serializeOffer } from "@/lib/serializers";

const refreshSchema = z.object({
  offerId: z.string().optional(),
  productId: z.string().optional(),
  listId: z.string().optional(),
});

export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const parsed = refreshSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
  }

  const { offerId, productId, listId } = parsed.data;
  const offers = await prisma.storeOffer.findMany({
    where: offerId
      ? { id: offerId }
      : productId
        ? { productId }
        : listId
          ? { product: { listId } }
          : undefined,
  });

  const results: Array<{
    offerId: string;
    store: StoreType;
    ok: boolean;
    message?: string;
    offer?: ReturnType<typeof serializeOffer>;
  }> = [];

  for (const offer of offers) {
    const store = offer.store as StoreType;
    if (!STORE_META[store].autoRefresh && !offerId) {
      continue;
    }

    const res = await refreshOfferFromStore(store, offer.url);
    if (res.ok && res.basePrice !== undefined) {
      const oldBase = Number(offer.basePrice);
      const oldLowest =
        offer.lowestPriceSeen !== null ? Number(offer.lowestPriceSeen) : oldBase;
      const nextLowest = Math.min(oldLowest, res.basePrice);
      const priceChanged = Math.abs(oldBase - res.basePrice) >= 0.01;
      const updated = await prisma.storeOffer.update({
        where: { id: offer.id },
        data: {
          ...(priceChanged ? { previousBasePrice: oldBase } : {}),
          lowestPriceSeen: nextLowest,
          basePrice: res.basePrice,
          ...(res.titleSnapshot ? { titleSnapshot: res.titleSnapshot } : {}),
          inStock: res.inStock ?? true,
          sourceMode: "AUTO",
          lastCheckedAt: new Date(),
        },
      });
      results.push({
        offerId: offer.id,
        store,
        ok: true,
        offer: serializeOffer(updated),
      });
    } else {
      results.push({
        offerId: offer.id,
        store,
        ok: false,
        message: res.error,
      });
    }
  }

  return NextResponse.json({
    checked: results.length,
    updatedCount: results.filter((r) => r.ok).length,
    results,
  });
}
