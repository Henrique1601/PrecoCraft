import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeProduct } from "@/lib/serializers";

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const { id } = await context.params;
  const source = await prisma.product.findUnique({
    where: { id },
    include: { offers: true },
  });
  if (!source) {
    return NextResponse.json(
      { error: "Produto não encontrado." },
      { status: 404 }
    );
  }

  const copy = await prisma.product.create({
    data: {
      listId: source.listId,
      name: `${source.name} (cópia)`,
      notes: source.notes,
      targetPrice: source.targetPrice,
      purchased: false,
      offers: {
        create: source.offers.map((o) => ({
          store: o.store,
          sellerName: o.sellerName,
          url: o.url,
          titleSnapshot: o.titleSnapshot,
          basePrice: o.basePrice,
          previousBasePrice: o.previousBasePrice,
          lowestPriceSeen: o.lowestPriceSeen,
          installmentPrice: o.installmentPrice,
          shippingCost: o.shippingCost,
          discountAmount: o.discountAmount,
          cashbackAmount: o.cashbackAmount,
          inStock: o.inStock,
          sourceMode: o.sourceMode,
        })),
      },
    },
    include: { offers: true },
  });

  return NextResponse.json(
    { product: serializeProduct(copy) },
    { status: 201 }
  );
}
