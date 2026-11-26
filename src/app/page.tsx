import { isAuthEnabled, isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeList, type SerializedList } from "@/lib/serializers";
import { LoginGate } from "@/components/LoginGate";
import { PriceBoard } from "@/components/PriceBoard";

export const instant = false;

export default async function HomePage() {
  const authEnabled = isAuthEnabled();
  const authed = await isAuthenticated();

  if (!authed) {
    return <LoginGate />;
  }

  let initialLists: SerializedList[] = [];
  let dbError: string | null = null;

  try {
    const lists = await prisma.list.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        products: {
          orderBy: { createdAt: "asc" },
          include: { offers: true },
        },
      },
    });
    initialLists = lists.map(serializeList);
  } catch (err) {
    dbError =
      err instanceof Error
        ? err.message
        : "Não foi possível conectar ao banco PostgreSQL.";
  }

  if (dbError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
        <div className="max-w-lg w-full bg-white border border-zinc-200 rounded-xl p-6 space-y-3">
          <h1 className="text-base font-bold text-zinc-900">
            PrecoCraft — Configuração do Banco de Dados
          </h1>
          <p className="text-xs text-zinc-600 leading-relaxed">
            O app está pronto, mas ainda não encontrou um banco PostgreSQL
            conectado. Configure a variável <code className="bg-zinc-100 px-1 py-0.5 rounded">DATABASE_URL</code> no arquivo{" "}
            <code className="bg-zinc-100 px-1 py-0.5 rounded">.env</code> (ex: Neon ou Supabase gratuito) e rode:
          </p>
          <pre className="bg-zinc-900 text-zinc-100 text-xs p-3 rounded-lg overflow-x-auto">
            npx prisma db push
          </pre>
          <p className="text-[11px] text-red-600 font-mono break-all">
            {dbError}
          </p>
        </div>
      </div>
    );
  }

  return <PriceBoard initialLists={initialLists} authEnabled={authEnabled} />;
}
