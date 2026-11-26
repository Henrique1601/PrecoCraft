import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseCsvProducts } from "@/lib/csv";
import { serializeProduct } from "@/lib/serializers";

const importSchema = z.object({
  csvText: z.string().min(1).max(200000),
});

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const { id: listId } = await context.params;
  const body = await req.json().catch(() => null);
  const parsed = importSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "CSV inválido." }, { status: 400 });
  }

  const rows = parseCsvProducts(parsed.data.csvText);
  if (rows.length === 0) {
    return NextResponse.json(
      { error: "Nenhum produto encontrado no CSV." },
      { status: 400 }
    );
  }

  const createdProducts = [];
  for (const row of rows.slice(0, 100)) {
    const product = await prisma.product.create({
      data: {
        listId,
        name: row.name,
        notes: row.notes ?? null,
        targetPrice: row.targetPrice ?? null,
        offers:
          row.url && row.store
            ? {
                create: {
                  store: row.store,
                  url: row.url,
                  basePrice: row.basePrice ?? 0,
                  sourceMode: "MANUAL",
                },
              }
            : undefined,
      },
      include: { offers: true },
    });
    createdProducts.push(serializeProduct(product));
  }

  return NextResponse.json({
    importedCount: createdProducts.length,
    products: createdProducts,
  });
}
