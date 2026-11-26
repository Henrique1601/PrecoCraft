import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STORE_TYPES } from "@/lib/pricing";
import { serializeProduct } from "@/lib/serializers";

const createProductSchema = z.object({
  listId: z.string().min(1),
  name: z.string().trim().min(1).max(160),
  notes: z.string().trim().max(300).optional(),
  targetPrice: z.number().nonnegative().nullable().optional(),
  initialOffer: z
    .object({
      store: z.enum(STORE_TYPES),
      sellerName: z.string().trim().max(80).optional(),
      url: z.string().url(),
      titleSnapshot: z.string().optional(),
      basePrice: z.number().nonnegative(),
      shippingCost: z.number().nonnegative().optional(),
      discountAmount: z.number().nonnegative().optional(),
      cashbackAmount: z.number().nonnegative().optional(),
      sourceMode: z.enum(["AUTO", "BOOKMARKLET", "MANUAL"]).optional(),
    })
    .optional(),
});

export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const parsed = createProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados do produto inválidos." },
      { status: 400 }
    );
  }

  const { listId, name, notes, targetPrice, initialOffer } = parsed.data;
  const product = await prisma.product.create({
    data: {
      listId,
      name,
      notes: notes || null,
      targetPrice: targetPrice ?? null,
      offers: initialOffer
        ? {
            create: {
              store: initialOffer.store,
              sellerName: initialOffer.sellerName || null,
              url: initialOffer.url,
              titleSnapshot: initialOffer.titleSnapshot ?? null,
              basePrice: initialOffer.basePrice,
              shippingCost: initialOffer.shippingCost ?? 0,
              discountAmount: initialOffer.discountAmount ?? 0,
              cashbackAmount: initialOffer.cashbackAmount ?? 0,
              sourceMode: initialOffer.sourceMode ?? "MANUAL",
            },
          }
        : undefined,
    },
    include: { offers: true },
  });

  return NextResponse.json(
    { product: serializeProduct(product) },
    { status: 201 }
  );
}
