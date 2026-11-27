import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthenticated } from "@/lib/auth";
import {
  cleanProductQuery,
  extractInfoFromUrl,
} from "@/lib/connectors/extract-url";
import { searchAllMarkets } from "@/lib/connectors/multi-search";

const lookupSchema = z.object({
  url: z.string().trim().optional(),
  query: z.string().trim().optional(),
});

export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = lookupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const { url, query } = parsed.data;
  if (!url && !query) {
    return NextResponse.json(
      { error: "Informe uma URL ou nome do produto." },
      { status: 400 }
    );
  }

  const extracted = url ? await extractInfoFromUrl(url) : null;
  const searchQuery =
    query && query.length > 0
      ? cleanProductQuery(query)
      : extracted?.cleanQuery ?? "";

  const { suggestions, serperEnabled } = await searchAllMarkets(
    searchQuery,
    extracted?.store
  );

  return NextResponse.json({
    extracted,
    searchQuery,
    suggestions,
    serperEnabled,
  });
}
