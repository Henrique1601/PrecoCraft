import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { searchMercadoLivre } from "@/lib/connectors/mercado-livre";

export async function GET(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const result = await searchMercadoLivre(q, 8);
  if (!result.ok) {
    return NextResponse.json({ error: result.error, items: [] }, { status: 502 });
  }
  return NextResponse.json({ items: result.items });
}
