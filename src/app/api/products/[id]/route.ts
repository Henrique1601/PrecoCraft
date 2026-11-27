import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeProduct } from "@/lib/serializers";

const updateProductSchema = z.object({
  listId: z.string().min(1).optional(),
  name: z.string().trim().min(1).max(160).optional(),
  notes: z.string().trim().max(300).nullable().optional(),
  targetPrice: z.number().nonnegative().nullable().optional(),
  purchased: z.boolean().optional(),
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
  const parsed = updateProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos para atualizar produto." },
      { status: 400 }
    );
  }
  const updated = await prisma.product.update({
    where: { id },
    data: {
      ...(parsed.data.listId !== undefined ? { listId: parsed.data.listId } : {}),
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
      ...(parsed.data.targetPrice !== undefined
        ? { targetPrice: parsed.data.targetPrice }
        : {}),
      ...(parsed.data.purchased !== undefined
        ? { purchased: parsed.data.purchased }
        : {}),
    },
    include: { offers: true },
  });
  return NextResponse.json({ product: serializeProduct(updated) });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const { id } = await context.params;
  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
