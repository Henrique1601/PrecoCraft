import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeOffer } from "@/lib/serializers";

const patchOfferSchema = z.object({
  url: z.string().url().optional(),
  titleSnapshot: z.string().trim().max(240).nullable().optional(),
  basePrice: z.number().nonnegative().optional(),
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
  const updated = await prisma.storeOffer.update({
    where: { id },
    data: {
      ...(d.url !== undefined ? { url: d.url } : {}),
      ...(d.titleSnapshot !== undefined
        ? { titleSnapshot: d.titleSnapshot }
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
