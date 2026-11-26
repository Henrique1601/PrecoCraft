import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateListSchema = z.object({
  name: z.string().trim().min(1).max(80),
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
  const parsed = updateListSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Nome da lista inválido." },
      { status: 400 }
    );
  }
  const updated = await prisma.list.update({
    where: { id },
    data: { name: parsed.data.name },
  });
  return NextResponse.json({ list: updated });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const { id } = await context.params;
  await prisma.list.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
