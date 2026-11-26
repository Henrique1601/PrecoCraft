import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeList, type SerializedList } from "@/lib/serializers";
import { LoginGate } from "@/components/LoginGate";
import { QuickAddClient } from "@/components/QuickAddClient";

export const instant = false;

export default async function QuickAddPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string; title?: string; price?: string }>;
}) {
  if (!(await isAuthenticated())) {
    return <LoginGate />;
  }

  const params = await searchParams;
  let lists: SerializedList[] = [];
  try {
    const rows = await prisma.list.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        products: {
          orderBy: { createdAt: "asc" },
          include: { offers: true },
        },
      },
    });
    lists = rows.map(serializeList);
  } catch {
    lists = [];
  }

  return (
    <QuickAddClient
      lists={lists}
      initialUrl={params.url ?? ""}
      initialTitle={params.title ?? ""}
      initialPrice={params.price ?? ""}
    />
  );
}
