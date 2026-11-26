import {
  calculateFinalPrice,
  detectStoreFromUrl,
  STORE_META,
  STORE_TYPES,
  type StoreType,
} from "./pricing.ts";
import type { SerializedList } from "./serializers.ts";

export interface CsvImportRow {
  name: string;
  notes?: string;
  targetPrice?: number;
  store?: StoreType;
  url?: string;
  basePrice?: number;
}

function escapeCsvCell(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n") || value.includes(";")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportListToCsv(list: SerializedList): string {
  const headers = [
    "Produto",
    "Observacao",
    "Preco Alvo",
    "Comprado",
    ...STORE_TYPES.flatMap((st) => [
      `${STORE_META[st].label} (Final)`,
      `${STORE_META[st].label} (URL)`,
    ]),
  ];

  const rows = list.products.map((p) => {
    const storeCells = STORE_TYPES.flatMap((st) => {
      const storeOffers = p.offers.filter((o) => o.store === st);
      if (storeOffers.length === 0) return ["", ""];
      const sorted = [...storeOffers].sort(
        (a, b) => calculateFinalPrice(a) - calculateFinalPrice(b)
      );
      return [
        calculateFinalPrice(sorted[0]).toFixed(2),
        sorted[0].url,
      ];
    });

    return [
      p.name,
      p.notes ?? "",
      p.targetPrice !== null ? p.targetPrice.toFixed(2) : "",
      p.purchased ? "Sim" : "Nao",
      ...storeCells,
    ]
      .map((cell) => escapeCsvCell(String(cell)))
      .join(";");
  });

  return "\uFEFF" + [headers.join(";"), ...rows].join("\n");
}

function parseNumberCell(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const cleaned = raw
    .replace(/R\$/gi, "")
    .replace(/\s+/g, "")
    .replace(/\.(?=\d{3}(?:[,.]|$))/g, "")
    .replace(",", ".");
  const num = Number(cleaned);
  return Number.isFinite(num) && num >= 0 ? num : undefined;
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Parses CSV exported from Excel/Sheets (supports `;` or `,` delimiters).
 * Expected columns: Produto (or Name), Observacao?, Preco Alvo?, URL?, Preco?, Loja?
 */
export function parseCsvProducts(csvText: string): CsvImportRow[] {
  const lines = csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const delimiter = lines[0].includes(";") ? ";" : ",";
  const firstCols = splitCsvLine(lines[0], delimiter).map((c) =>
    c.toLowerCase()
  );

  const hasHeader =
    firstCols.some((c) => c.includes("produto") || c.includes("name") || c.includes("item"));
  const dataLines = hasHeader ? lines.slice(1) : lines;

  const idxName = hasHeader
    ? Math.max(
        0,
        firstCols.findIndex(
          (c) => c.includes("produto") || c.includes("name") || c.includes("item")
        )
      )
    : 0;
  const idxNotes = hasHeader
    ? firstCols.findIndex((c) => c.includes("obs") || c.includes("nota"))
    : -1;
  const idxTarget = hasHeader
    ? firstCols.findIndex((c) => c.includes("alvo") || c.includes("meta") || c.includes("target"))
    : -1;
  const idxUrl = hasHeader
    ? firstCols.findIndex((c) => c.includes("url") || c.includes("link"))
    : 1;
  const idxPrice = hasHeader
    ? firstCols.findIndex(
        (c) =>
          (c.includes("preco") || c.includes("preço") || c.includes("valor")) &&
          !c.includes("alvo") &&
          !c.includes("meta")
      )
    : 2;

  const rows: CsvImportRow[] = [];
  for (const line of dataLines) {
    const cols = splitCsvLine(line, delimiter);
    const name = cols[idxName]?.trim();
    if (!name) continue;

    const url = idxUrl >= 0 ? cols[idxUrl]?.trim() : undefined;
    const validUrl =
      url && (url.startsWith("http://") || url.startsWith("https://"))
        ? url
        : undefined;
    const store = validUrl
      ? (detectStoreFromUrl(validUrl) ?? undefined)
      : undefined;
    const basePrice = idxPrice >= 0 ? parseNumberCell(cols[idxPrice]) : undefined;

    rows.push({
      name,
      notes: idxNotes >= 0 && cols[idxNotes] ? cols[idxNotes] : undefined,
      targetPrice:
        idxTarget >= 0 ? parseNumberCell(cols[idxTarget]) : undefined,
      url: validUrl,
      store,
      basePrice,
    });
  }

  return rows;
}
