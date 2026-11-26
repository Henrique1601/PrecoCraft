import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeList } from "@/lib/serializers";

const createListSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const lists = await prisma.list.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      products: {
        orderBy: { createdAt: "asc" },
        include: { offers: true },
      },
    },
  });
  return NextResponse.json({ lists: lists.map(serializeList) });
}

export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const parsed = createListSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Nome da lista inválido." },
      { status: 400 }
    );
  }
  const created = await prisma.list.create({
    data: { name: parsed.data.name },
    include: { products: { include: { offers: true } } },
  });
  return NextResponse.json({ list: serializeList(created) }, { status: 201 });
}
