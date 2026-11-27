import { detectStoreFromUrl, type StoreType } from "../pricing.ts";
import { searchMercadoLivre } from "./mercado-livre.ts";

export interface MarketSuggestion {
  store: StoreType;
  title: string;
  price: number;
  url: string;
  sourceLabel: string;
}

function mapSourceNameToStore(
  source: string | undefined,
  link: string | undefined
): StoreType | null {
  if (link) {
    const byUrl = detectStoreFromUrl(link);
    if (byUrl) return byUrl;
  }
  const s = (source ?? "").toLowerCase();
  if (s.includes("mercado livre") || s.includes("mercadolivre")) {
    return "MERCADO_LIVRE";
  }
  if (s.includes("amazon")) return "AMAZON";
  if (s.includes("aliexpress")) return "ALIEXPRESS";
  if (s.includes("kabum")) return "KABUM";
  if (s.includes("tiktok")) return "TIKTOK_SHOP";
  return null;
}

function parseSerperPrice(raw: string | number | undefined): number | null {
  if (typeof raw === "number") return raw > 0 ? raw : null;
  if (!raw) return null;
  const cleaned = raw
    .replace(/R\$/gi, "")
    .replace(/\s+/g, "")
    .replace(/\.(?=\d{3}(?:[,.]|$))/g, "")
    .replace(",", ".");
  const match = cleaned.match(/\d+(?:\.\d+)?/);
  if (!match) return null;
  const num = Number(match[0]);
  return Number.isFinite(num) && num > 0 ? num : null;
}

async function searchSerperShopping(
  query: string
): Promise<MarketSuggestion[]> {
  const apiKey = process.env.SERPER_API_KEY?.trim();
  if (!apiKey || !query.trim()) return [];

  try {
    const res = await fetch("https://google.serper.dev/shopping", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: query.trim(),
        gl: "br",
        hl: "pt-br",
        num: 20,
      }),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });

    if (!res.ok) return [];
    const data = (await res.json()) as {
      shopping?: Array<{
        title?: string;
        source?: string;
        link?: string;
        price?: string | number;
      }>;
    };

    const suggestions: MarketSuggestion[] = [];
    for (const item of data.shopping ?? []) {
      const store = mapSourceNameToStore(item.source, item.link);
      const price = parseSerperPrice(item.price);
      if (!store || !price || !item.link || !item.title) continue;
      suggestions.push({
        store,
        title: item.title,
        price,
        url: item.link,
        sourceLabel: item.source ?? store,
      });
    }
    return suggestions;
  } catch {
    return [];
  }
}

export async function searchAllMarkets(
  query: string,
  excludeStore?: StoreType | null
): Promise<{
  suggestions: MarketSuggestion[];
  serperEnabled: boolean;
}> {
  const trimmed = query.trim();
  const serperEnabled = Boolean(process.env.SERPER_API_KEY?.trim());
  if (!trimmed) return { suggestions: [], serperEnabled };

  const [mlRes, serperItems] = await Promise.all([
    excludeStore === "MERCADO_LIVRE"
      ? Promise.resolve({ ok: true, items: [] })
      : searchMercadoLivre(trimmed, 4),
    searchSerperShopping(trimmed),
  ]);

  const combined: MarketSuggestion[] = [];

  for (const ml of mlRes.items ?? []) {
    if (ml.price > 0) {
      combined.push({
        store: "MERCADO_LIVRE",
        title: ml.title,
        price: ml.price,
        url: ml.permalink,
        sourceLabel: "Mercado Livre API",
      });
    }
  }

  for (const s of serperItems) {
    if (excludeStore && s.store === excludeStore) continue;
    combined.push(s);
  }

  // Keep up to 3 cheapest suggestions per store
  const byStoreCount = new Map<StoreType, number>();
  const sorted = combined.sort((a, b) => a.price - b.price);
  const filtered: MarketSuggestion[] = [];
  for (const item of sorted) {
    const count = byStoreCount.get(item.store) ?? 0;
    if (count < 3) {
      filtered.push(item);
      byStoreCount.set(item.store, count + 1);
    }
  }

  return { suggestions: filtered, serperEnabled };
}
