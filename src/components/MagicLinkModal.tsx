"use client";

import { useState } from "react";
import { Check, ClipboardPaste, Search, Sparkles, X } from "lucide-react";
import { formatBRL, STORE_META, type StoreType } from "@/lib/pricing";
import type { SerializedProduct } from "@/lib/serializers";
import type { MarketSuggestion } from "@/lib/connectors/multi-search";
import type { ExtractedUrlInfo } from "@/lib/connectors/extract-url";

interface MagicLinkModalProps {
  listId: string;
  onClose: () => void;
  onCreated: (product: SerializedProduct) => void;
}

export function MagicLinkModal({
  listId,
  onClose,
  onCreated,
}: MagicLinkModalProps) {
  const [urlInput, setUrlInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [basePriceInput, setBasePriceInput] = useState("");
  const [extracted, setExtracted] = useState<ExtractedUrlInfo | null>(null);
  const [suggestions, setSuggestions] = useState<MarketSuggestion[]>([]);
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);
  const [serperEnabled, setSerperEnabled] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!urlInput.trim() && !nameInput.trim()) return;
    setLoading(true);
    setError(null);
    setHasSearched(false);
    try {
      const res = await fetch("/api/magic-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: urlInput.trim() || undefined,
          query: nameInput.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao analisar link.");
        return;
      }

      const ext = data.extracted as ExtractedUrlInfo | null;
      setExtracted(ext);
      if (ext?.title && !nameInput.trim()) {
        setNameInput(ext.cleanQuery || ext.title);
      }
      if (ext?.price !== null && ext?.price !== undefined) {
        setBasePriceInput(String(ext.price));
      }
      const list = (data.suggestions ?? []) as MarketSuggestion[];
      setSuggestions(list);
      // Pre-select the cheapest suggestion per store
      const seenStores = new Set<StoreType>();
      const preselected: number[] = [];
      list.forEach((item, idx) => {
        if (!seenStores.has(item.store)) {
          seenStores.add(item.store);
          preselected.push(idx);
        }
      });
      setSelectedIndexes(preselected);
      setSerperEnabled(Boolean(data.serperEnabled));
      setHasSearched(true);
    } catch {
      setError("Erro de rede ao consultar mercados.");
    } finally {
      setLoading(false);
    }
  }

  function toggleSuggestion(idx: number) {
    setSelectedIndexes((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  }

  async function handleSaveAll() {
    const productName = nameInput.trim() || extracted?.title || "Novo Produto";
    setSaving(true);
    setError(null);
    try {
      const parsedPrice = Number(basePriceInput.replace(",", "."));
      const hasPrimaryOffer = Boolean(extracted?.url && extracted?.store);

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listId,
          name: productName,
          initialOffer: hasPrimaryOffer
            ? {
                store: extracted!.store!,
                url: extracted!.url,
                titleSnapshot: extracted?.title ?? undefined,
                basePrice: Number.isNaN(parsedPrice) ? 0 : parsedPrice,
                sourceMode: extracted?.blocked ? "MANUAL" : "AUTO",
              }
            : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao criar produto.");
        return;
      }

      const createdProduct = data.product as SerializedProduct;
      const extraOffers = [];

      for (const idx of selectedIndexes) {
        const s = suggestions[idx];
        if (!s) continue;
        const offerRes = await fetch("/api/offers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: createdProduct.id,
            store: s.store,
            sellerName: s.sourceLabel,
            url: s.url,
            titleSnapshot: s.title,
            basePrice: s.price,
            sourceMode: "AUTO",
          }),
        });
        if (offerRes.ok) {
          const offerData = await offerRes.json();
          if (offerData.offer) extraOffers.push(offerData.offer);
        }
      }

      onCreated({
        ...createdProduct,
        offers: [...createdProduct.offers, ...extraOffers],
      });
      onClose();
    } catch {
      setError("Falha ao salvar ofertas.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-semibold text-zinc-900">
              Link Mágico — Extrair & Buscar nos Outros Mercados
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-700 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <form onSubmit={handleLookup} className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Cole o link do produto (ou deixe vazio e busque pelo nome)
                </label>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const txt = await navigator.clipboard.readText();
                      if (txt) setUrlInput(txt.trim());
                    } catch {
                      // ignore clipboard permission denied
                    }
                  }}
                  className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <ClipboardPaste className="w-3 h-3" />
                  Colar
                </button>
              </div>
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://www.amazon.com.br/... ou TikTok Shop / ML / KaBuM"
                className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Nome para buscar nos outros mercados (auto ou manual)"
                className="flex-1 px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={loading || (!urlInput.trim() && !nameInput.trim())}
                className="px-4 py-2 text-xs font-medium bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 disabled:opacity-50 flex items-center gap-1.5 shrink-0"
              >
                <Search className="w-3.5 h-3.5" />
                {loading ? "Buscando..." : "Analisar"}
              </button>
            </div>
          </form>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {hasSearched && (
            <div className="space-y-4 pt-2 border-t border-zinc-100">
              {extracted && (
                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-800">
                      Link original:{" "}
                      {extracted.store
                        ? STORE_META[extracted.store].label
                        : "Loja não identificada"}
                    </span>
                    {extracted.blocked && (
                      <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-800 rounded">
                        Loja bloqueou preço automático — digite ou use a Extensão
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-zinc-600">
                      Preço deste link (R$):
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={basePriceInput}
                      onChange={(e) => setBasePriceInput(e.target.value)}
                      placeholder="0.00"
                      className="w-32 px-2.5 py-1 text-xs border border-zinc-300 rounded bg-white tabular-nums"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-zinc-800">
                    Ofertas encontradas em outros mercados ({suggestions.length})
                  </h3>
                  {!serperEnabled && (
                    <span className="text-[10px] text-zinc-500">
                      Dica: adicione SERPER_API_KEY para incluir Amazon/AliExpress
                    </span>
                  )}
                </div>

                {suggestions.length === 0 ? (
                  <p className="text-xs text-zinc-500 p-3 border border-zinc-200 rounded-lg">
                    Nenhuma sugestão automática encontrada para esse termo. Tente
                    simplificar o nome acima e clicar em Analisar.
                  </p>
                ) : (
                  <div className="max-h-60 overflow-y-auto divide-y divide-zinc-100 border border-zinc-200 rounded-lg">
                    {suggestions.map((s, idx) => {
                      const selected = selectedIndexes.includes(idx);
                      return (
                        <button
                          key={`${s.store}-${idx}`}
                          type="button"
                          onClick={() => toggleSuggestion(idx)}
                          className={`w-full text-left p-2.5 flex items-center justify-between gap-3 transition-colors ${
                            selected ? "bg-emerald-50/70" : "hover:bg-zinc-50"
                          }`}
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div
                              className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                selected
                                  ? "bg-emerald-600 border-emerald-600 text-white"
                                  : "border-zinc-300 bg-white"
                              }`}
                            >
                              {selected && <Check className="w-3 h-3" />}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`text-[10px] font-medium px-1.5 py-0.2 rounded border ${
                                    STORE_META[s.store].badgeClass
                                  }`}
                                >
                                  {STORE_META[s.store].shortLabel}
                                </span>
                                <span className="text-[10px] text-zinc-400">
                                  {s.sourceLabel}
                                </span>
                              </div>
                              <p className="text-xs text-zinc-800 line-clamp-1 mt-0.5">
                                {s.title}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-emerald-700 tabular-nums shrink-0">
                            {formatBRL(s.price)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveAll}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  {saving
                    ? "Salvando..."
                    : `Salvar Produto + ${selectedIndexes.length} oferta(s)`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
