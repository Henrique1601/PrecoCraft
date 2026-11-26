export interface ConnectorResult {
  ok: boolean;
  basePrice?: number;
  titleSnapshot?: string;
  inStock?: boolean;
  sourceMode?: "AUTO" | "MANUAL";
  error?: string;
}

export interface MlSearchItem {
  id: string;
  title: string;
  price: number;
  permalink: string;
  thumbnail: string;
  freeShipping: boolean;
}

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/**
 * Extracts Mercado Livre item ID (e.g. MLB123456789) from standard product URLs.
 */
export function extractMlItemId(rawUrl: string): string | null {
  try {
    const match = rawUrl.match(/MLB-?(\d{6,14})/i);
    if (!match) return null;
    return `MLB${match[1]}`;
  } catch {
    return null;
  }
}

function parsePriceFromHtml(html: string): {
  price?: number;
  title?: string;
  inStock?: boolean;
} {
  // 1. Try JSON-LD
  const ldMatches = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  for (const m of ldMatches) {
    try {
      const data = JSON.parse(m[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const offers = item?.offers;
        const offer = Array.isArray(offers) ? offers[0] : offers;
        const rawPrice = offer?.price ?? offer?.lowPrice;
        if (rawPrice !== undefined && !Number.isNaN(Number(rawPrice))) {
          const availability = String(offer?.availability ?? "");
          return {
            price: Number(rawPrice),
            title: typeof item?.name === "string" ? item.name : undefined,
            inStock: availability ? !availability.includes("OutOfStock") : true,
          };
        }
      }
    } catch {
      // ignore malformed JSON-LD
    }
  }

  // 2. Try meta tags
  const metaPrice = html.match(
    /<meta[^>]+(?:property|name)=["'](?:product:price:amount|og:price:amount)["'][^>]+content=["']([\d.,]+)["']/i
  );
  const metaTitle = html.match(
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i
  );
  if (metaPrice) {
    const normalized = metaPrice[1].replace(",", ".");
    const num = Number(normalized);
    if (!Number.isNaN(num) && num > 0) {
      return {
        price: num,
        title: metaTitle?.[1],
        inStock: true,
      };
    }
  }

  return {};
}

export async function fetchMercadoLivreOffer(
  url: string
): Promise<ConnectorResult> {
  const itemId = extractMlItemId(url);

  // Try official ML API first when we have an item ID (not /p/ catalog-only)
  if (itemId && !url.includes("/p/MLB")) {
    try {
      const res = await fetch(`https://api.mercadolibre.com/items/${itemId}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as {
          price?: number;
          title?: string;
          status?: string;
          available_quantity?: number;
        };
        if (typeof data.price === "number" && data.price > 0) {
          return {
            ok: true,
            basePrice: data.price,
            titleSnapshot: data.title,
            inStock:
              data.status === "active" && (data.available_quantity ?? 1) > 0,
            sourceMode: "AUTO",
          };
        }
      }
    } catch {
      // fall back to page HTML metadata
    }
  }

  // Fallback: fetch page HTML and read JSON-LD / meta tags
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!res.ok) {
      return {
        ok: false,
        error: `Mercado Livre retornou HTTP ${res.status}`,
      };
    }
    const html = await res.text();
    const parsed = parsePriceFromHtml(html);
    if (parsed.price && parsed.price > 0) {
      return {
        ok: true,
        basePrice: parsed.price,
        titleSnapshot: parsed.title,
        inStock: parsed.inStock ?? true,
        sourceMode: "AUTO",
      };
    }
    return {
      ok: false,
      error: "Não foi possível extrair o preço deste anúncio do Mercado Livre.",
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Falha ao consultar Mercado Livre.",
    };
  }
}

export async function searchMercadoLivre(
  query: string,
  limit = 8
): Promise<{ ok: boolean; items: MlSearchItem[]; error?: string }> {
  const trimmed = query.trim();
  if (!trimmed) return { ok: true, items: [] };

  try {
    const endpoint = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(
      trimmed
    )}&limit=${Math.min(Math.max(limit, 1), 15)}`;

    const res = await fetch(endpoint, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });

    if (!res.ok) {
      return {
        ok: false,
        items: [],
        error: `API do Mercado Livre retornou HTTP ${res.status}`,
      };
    }

    const data = (await res.json()) as {
      results?: Array<{
        id: string;
        title: string;
        price: number;
        permalink: string;
        thumbnail: string;
        shipping?: { free_shipping?: boolean };
      }>;
    };

    const items: MlSearchItem[] = (data.results ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      price: Number(r.price) || 0,
      permalink: r.permalink,
      thumbnail: r.thumbnail,
      freeShipping: Boolean(r.shipping?.free_shipping),
    }));

    return { ok: true, items };
  } catch (err) {
    return {
      ok: false,
      items: [],
      error:
        err instanceof Error ? err.message : "Erro ao buscar no Mercado Livre.",
    };
  }
}
