import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STORE_TYPES } from "@/lib/pricing";
import { serializeOffer } from "@/lib/serializers";

const createProductSchema = z.object({
  listId: z.string().min(1),
  name: z.string().trim().min(1).max(160),
  notes: z.string().trim().max(300).optional(),
  initialOffer: z
    .object({
      store: z.enum(STORE_TYPES),
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

  const { listId, name, notes, initialOffer } = parsed.data;
  const product = await prisma.product.create({
    data: {
      listId,
      name,
      notes: notes || null,
      offers: initialOffer
        ? {
            create: {
              store: initialOffer.store,
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
    {
      product: {
        id: product.id,
        listId: product.listId,
        name: product.name,
        notes: product.notes,
        createdAt: product.createdAt.toISOString(),
        offers: product.offers.map(serializeOffer),
      },
    },
    { status: 201 }
  );
}
