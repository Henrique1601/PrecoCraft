import { detectStoreFromUrl, type StoreType } from "../pricing.ts";
import { fetchKabumOffer } from "./kabum.ts";
import { fetchMercadoLivreOffer } from "./mercado-livre.ts";

export interface ExtractedUrlInfo {
  url: string;
  store: StoreType | null;
  title: string | null;
  price: number | null;
  blocked: boolean;
  cleanQuery: string;
}

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const NOISE_WORDS = [
  "mercado livre",
  "mercadolivre",
  "amazon.com.br",
  "amazon",
  "aliexpress",
  "kabum!",
  "kabum",
  "tiktok shop",
  "tiktok",
  "frete gratis",
  "frete grátis",
  "envio imediato",
  "envio 24h",
  "promocao",
  "promoção",
  "oferta",
  "original",
  "barato",
];

/**
 * Strips marketplace suffixes, brackets, and promo noise to produce a clean search query.
 */
export function cleanProductQuery(rawTitle: string): string {
  let text = rawTitle
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[|•—–]/g, " ")
    .replace(/\s+-\s+.*$/, " ");

  for (const noise of NOISE_WORDS) {
    const escaped = noise.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    text = text.replace(new RegExp(`\\b${escaped}\\b`, "gi"), " ");
  }

  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 8)
    .join(" ");
}

/**
 * Fallback: extracts human-readable product slug from URL path (e.g. Amazon/KaBuM URLs).
 */
export function extractSlugFromUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    const segments = u.pathname
      .split("/")
      .filter((s) => s.length > 4 && !/^(dp|gp|produto|item|MLB-?\d+)$/i.test(s));
    if (segments.length === 0) return "";
    // Pick the longest descriptive segment
    const best = segments.sort((a, b) => b.length - a.length)[0];
    return best
      .replace(/\.html?$/i, "")
      .replace(/[-_]+/g, " ")
      .replace(/\b(MLB|B0[A-Z0-9]{8})\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  } catch {
    return "";
  }
}

function parseMetaFromHtml(html: string): {
  title: string | null;
  price: number | null;
} {
  let title: string | null = null;
  let price: number | null = null;

  const ldMatches = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  for (const m of ldMatches) {
    try {
      const data = JSON.parse(m[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (!title && typeof item?.name === "string") title = item.name;
        const offers = item?.offers;
        const offer = Array.isArray(offers) ? offers[0] : offers;
        const rawPrice = offer?.price ?? offer?.lowPrice;
        if (rawPrice !== undefined && !Number.isNaN(Number(rawPrice))) {
          price = Number(rawPrice);
        }
        if (title && price) return { title, price };
      }
    } catch {
      // ignore invalid JSON-LD
    }
  }

  const ogTitle = html.match(
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i
  );
  const htmlTitle = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (!title) {
    title = ogTitle?.[1]?.trim() ?? htmlTitle?.[1]?.trim() ?? null;
  }

  const metaPrice = html.match(
    /<meta[^>]+(?:property|name)=["'](?:product:price:amount|og:price:amount)["'][^>]+content=["']([\d.,]+)["']/i
  );
  if (!price && metaPrice) {
    const num = Number(metaPrice[1].replace(",", "."));
    if (!Number.isNaN(num) && num > 0) price = num;
  }

  return { title, price };
}

export async function extractInfoFromUrl(
  rawUrl: string
): Promise<ExtractedUrlInfo> {
  let resolvedUrl = rawUrl.trim();
  let store = detectStoreFromUrl(resolvedUrl);

  if (store === "MERCADO_LIVRE") {
    const res = await fetchMercadoLivreOffer(resolvedUrl);
    const title = res.titleSnapshot ?? extractSlugFromUrl(resolvedUrl);
    return {
      url: resolvedUrl,
      store,
      title: title || null,
      price: res.ok ? (res.basePrice ?? null) : null,
      blocked: !res.ok,
      cleanQuery: cleanProductQuery(title || ""),
    };
  }

  if (store === "KABUM") {
    const res = await fetchKabumOffer(resolvedUrl);
    const title = res.titleSnapshot ?? extractSlugFromUrl(resolvedUrl);
    return {
      url: resolvedUrl,
      store,
      title: title || null,
      price: res.ok ? (res.basePrice ?? null) : null,
      blocked: !res.ok,
      cleanQuery: cleanProductQuery(title || ""),
    };
  }

  // Amazon, AliExpress, TikTok Shop, or short links
  try {
    const res = await fetch(resolvedUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(7000),
      cache: "no-store",
    });

    if (res.url) {
      resolvedUrl = res.url;
      store = detectStoreFromUrl(resolvedUrl) ?? store;
    }

    if (res.ok) {
      const html = await res.text();
      const parsed = parseMetaFromHtml(html);
      const fallbackSlug = extractSlugFromUrl(resolvedUrl);
      const bestTitle = parsed.title || fallbackSlug || null;
      return {
        url: resolvedUrl,
        store,
        title: bestTitle,
        price: parsed.price,
        blocked: parsed.price === null,
        cleanQuery: cleanProductQuery(bestTitle ?? ""),
      };
    }
  } catch {
    // fall through to URL slug fallback
  }

  const slug = extractSlugFromUrl(resolvedUrl);
  return {
    url: resolvedUrl,
    store,
    title: slug || null,
    price: null,
    blocked: true,
    cleanQuery: cleanProductQuery(slug),
  };
}
