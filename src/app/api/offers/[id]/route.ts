import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeOffer } from "@/lib/serializers";

const patchOfferSchema = z.object({
  sellerName: z.string().trim().max(80).nullable().optional(),
  url: z.string().url().optional(),
  titleSnapshot: z.string().trim().max(240).nullable().optional(),
  basePrice: z.number().nonnegative().optional(),
  installmentPrice: z.number().nonnegative().nullable().optional(),
  shippingCost: z.number().nonnegative().optional(),
  discountAmount: z.number().nonnegative().optional(),
  cashbackAmount: z.number().nonnegative().optional(),
  inStock: z.boolean().optional(),
  sourceMode: z.enum(["AUTO", "BOOKMARKLET", "MANUAL"]).optional(),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const { id } = await context.params;
  const body = await req.json().catch(() => null);
  const parsed = patchOfferSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos para atualizar oferta." },
      { status: 400 }
    );
  }

  const d = parsed.data;
  const existing = await prisma.storeOffer.findUnique({ where: { id } });
  const oldBase = existing ? Number(existing.basePrice) : null;
  const oldLowest =
    existing?.lowestPriceSeen !== null && existing?.lowestPriceSeen !== undefined
      ? Number(existing.lowestPriceSeen)
      : oldBase;
  const nextLowest =
    d.basePrice !== undefined && d.basePrice > 0
      ? oldLowest !== null
        ? Math.min(oldLowest, d.basePrice)
        : d.basePrice
      : null;
  const priceChanged =
    d.basePrice !== undefined &&
    oldBase !== null &&
    Math.abs(oldBase - d.basePrice) >= 0.01;

  const updated = await prisma.storeOffer.update({
    where: { id },
    data: {
      ...(d.sellerName !== undefined ? { sellerName: d.sellerName } : {}),
      ...(d.url !== undefined ? { url: d.url } : {}),
      ...(d.titleSnapshot !== undefined
        ? { titleSnapshot: d.titleSnapshot }
        : {}),
      ...(priceChanged ? { previousBasePrice: oldBase } : {}),
      ...(nextLowest !== null ? { lowestPriceSeen: nextLowest } : {}),
      ...(d.installmentPrice !== undefined
        ? { installmentPrice: d.installmentPrice }
        : {}),
      ...(d.basePrice !== undefined ? { basePrice: d.basePrice } : {}),
      ...(d.shippingCost !== undefined ? { shippingCost: d.shippingCost } : {}),
      ...(d.discountAmount !== undefined
        ? { discountAmount: d.discountAmount }
        : {}),
      ...(d.cashbackAmount !== undefined
        ? { cashbackAmount: d.cashbackAmount }
        : {}),
      ...(d.inStock !== undefined ? { inStock: d.inStock } : {}),
      sourceMode: d.sourceMode ?? "MANUAL",
      lastCheckedAt: new Date(),
    },
  });

  return NextResponse.json({ offer: serializeOffer(updated) });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const { id } = await context.params;
  await prisma.storeOffer.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
