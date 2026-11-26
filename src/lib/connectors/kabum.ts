import type { ConnectorResult } from "./mercado-livre";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/**
 * Parses KaBuM! product HTML from JSON-LD or Next.js __NEXT_DATA__.
 */
export function parseKabumHtml(html: string): ConnectorResult {
  // 1. Try JSON-LD
  const ldMatches = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  for (const m of ldMatches) {
    try {
      const data = JSON.parse(m[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item?.["@type"] === "Product" || item?.offers) {
          const offers = item.offers;
          const offer = Array.isArray(offers) ? offers[0] : offers;
          const rawPrice = offer?.price ?? offer?.lowPrice;
          if (rawPrice !== undefined && !Number.isNaN(Number(rawPrice))) {
            const availability = String(offer?.availability ?? "");
            return {
              ok: true,
              basePrice: Number(rawPrice),
              titleSnapshot:
                typeof item.name === "string" ? item.name : undefined,
              inStock: availability
                ? !availability.includes("OutOfStock")
                : true,
              sourceMode: "AUTO",
            };
          }
        }
      }
    } catch {
      // ignore invalid JSON-LD
    }
  }

  // 2. Try __NEXT_DATA__
  const nextDataMatch = html.match(
    /<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i
  );
  if (nextDataMatch) {
    try {
      const json = JSON.parse(nextDataMatch[1]);
      const product =
        json?.props?.pageProps?.product ??
        json?.props?.pageProps?.initialState?.product?.productInfo;
      const price =
        product?.priceWithDiscount ??
        product?.price ??
        product?.offer?.priceWithDiscount;
      if (typeof price === "number" && price > 0) {
        return {
          ok: true,
          basePrice: price,
          titleSnapshot:
            typeof product?.name === "string" ? product.name : undefined,
          inStock: product?.available !== false,
          sourceMode: "AUTO",
        };
      }
    } catch {
      // ignore invalid __NEXT_DATA__
    }
  }

  return {
    ok: false,
    error: "Não foi possível extrair preço da página da KaBuM!.",
  };
}

export async function fetchKabumOffer(url: string): Promise<ConnectorResult> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });

    if (!res.ok) {
      return {
        ok: false,
        error: `KaBuM! retornou HTTP ${res.status} (pode estar com proteção anti-bot). Use o Bookmarklet se persistir.`,
      };
    }

    const html = await res.text();
    return parseKabumHtml(html);
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Falha ao consultar a KaBuM!.",
    };
  }
}
