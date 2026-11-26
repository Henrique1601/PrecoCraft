import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeList, type SerializedList } from "@/lib/serializers";
import { LoginGate } from "@/components/LoginGate";
import { QuickAddClient } from "@/components/QuickAddClient";

export const instant = false;

export default async function QuickAddPage({
  searchParams,
}: {
  searchParams: Promise<{
    url?: string;
    text?: string;
    title?: string;
    price?: string;
  }>;
}) {
  if (!(await isAuthenticated())) {
    return <LoginGate />;
  }

  const params = await searchParams;
  let resolvedUrl = params.url ?? "";
  if (!resolvedUrl && params.text) {
    const match = params.text.match(/https?:\/\/\S+/i);
    if (match) resolvedUrl = match[0];
  }
  const resolvedTitle =
    params.title ||
    (params.text && resolvedUrl
      ? params.text.replace(resolvedUrl, "").trim()
      : "");
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
      initialUrl={resolvedUrl}
      initialTitle={resolvedTitle}
      initialPrice={params.price ?? ""}
    />
  );
}
