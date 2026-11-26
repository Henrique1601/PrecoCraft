"use client";

import { useState } from "react";
import { Plus, Search, X } from "lucide-react";
import {
  detectStoreFromUrl,
  formatBRL,
  STORE_META,
  STORE_TYPES,
  type StoreType,
} from "@/lib/pricing";
import type { SerializedProduct } from "@/lib/serializers";
import type { MlSearchItem } from "@/lib/connectors/mercado-livre";

interface AddProductModalProps {
  listId: string;
  onClose: () => void;
  onCreated: (product: SerializedProduct) => void;
}

export function AddProductModal({
  listId,
  onClose,
  onCreated,
}: AddProductModalProps) {
  const [tab, setTab] = useState<"manual" | "ml">("manual");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [offerUrl, setOfferUrl] = useState("");
  const [offerStore, setOfferStore] = useState<StoreType>("MERCADO_LIVRE");
  const [offerPrice, setOfferPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mercado Livre Search state
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [mlResults, setMlResults] = useState<MlSearchItem[]>([]);

  function handleUrlChange(val: string) {
    setOfferUrl(val);
    const detected = detectStoreFromUrl(val);
    if (detected) setOfferStore(detected);
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const hasOffer = offerUrl.trim().length > 0;
      const parsedPrice = Number(offerPrice.replace(",", "."));
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listId,
          name: name.trim(),
          notes: notes.trim() || undefined,
          initialOffer: hasOffer
            ? {
                store: offerStore,
                url: offerUrl.trim(),
                basePrice: Number.isNaN(parsedPrice) ? 0 : parsedPrice,
                sourceMode: "MANUAL",
              }
            : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao criar produto.");
        return;
      }
      onCreated(data.product);
      onClose();
    } catch {
      setError("Erro de rede ao salvar produto.");
    } finally {
      setSaving(false);
    }
  }

  async function handleMlSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/search/ml?q=${encodeURIComponent(query.trim())}`
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao buscar no Mercado Livre.");
        return;
      }
      setMlResults(data.items ?? []);
    } catch {
      setError("Falha ao consultar API do Mercado Livre.");
    } finally {
      setSearching(false);
    }
  }

  async function pinMlItem(item: MlSearchItem) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listId,
          name: item.title,
          initialOffer: {
            store: "MERCADO_LIVRE",
            url: item.permalink,
            titleSnapshot: item.title,
            basePrice: item.price,
            shippingCost: 0,
            sourceMode: "AUTO",
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao fixar produto.");
        return;
      }
      onCreated(data.product);
      onClose();
    } catch {
      setError("Erro de rede ao fixar produto.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg bg-white rounded-xl border border-zinc-200 shadow-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-200 bg-zinc-50">
          <h2 className="text-sm font-semibold text-zinc-900">
            Adicionar Produto à Lista
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-700 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex border-b border-zinc-200 px-5 gap-4 bg-white">
          <button
            type="button"
            onClick={() => setTab("manual")}
            className={`py-2.5 text-xs font-medium border-b-2 transition-colors ${
              tab === "manual"
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            Manual / Colar Link
          </button>
          <button
            type="button"
            onClick={() => setTab("ml")}
            className={`py-2.5 text-xs font-medium border-b-2 transition-colors ${
              tab === "ml"
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            Buscar no Mercado Livre
          </button>
        </div>

        <div className="p-5">
          {tab === "manual" ? (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Nome do produto *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Mouse Logitech G Pro X Superlight"
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Observação (opcional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Cor preta, versão 2"
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 border-t border-zinc-100 space-y-3">
                <p className="text-xs font-medium text-zinc-600">
                  Primeira oferta (opcional — você pode adicionar depois na
                  tabela)
                </p>
                <input
                  type="url"
                  value={offerUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="Cole o link da loja aqui (opcional)"
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {offerUrl.trim() && (
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={offerStore}
                      onChange={(e) =>
                        setOfferStore(e.target.value as StoreType)
                      }
                      className="px-3 py-2 text-sm border border-zinc-300 rounded-lg bg-white"
                    >
                      {STORE_TYPES.map((st) => (
                        <option key={st} value={st}>
                          {STORE_META[st].label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={offerPrice}
                      onChange={(e) => setOfferPrice(e.target.value)}
                      placeholder="Preço (R$)"
                      className="px-3 py-2 text-sm border border-zinc-300 rounded-lg tabular-nums"
                    />
                  </div>
                )}
              </div>

              {error && <p className="text-xs text-red-600">{error}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-medium bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 disabled:opacity-50"
                >
                  {saving ? "Salvando..." : "Criar Produto"}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <form onSubmit={handleMlSearch} className="flex gap-2">
                <input
                  type="text"
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar item no Mercado Livre..."
                  className="flex-1 px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  disabled={searching}
                  className="px-3.5 py-2 text-xs font-medium bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 flex items-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" />
                  {searching ? "Buscando..." : "Buscar"}
                </button>
              </form>

              {error && <p className="text-xs text-red-600">{error}</p>}

              <div className="max-h-72 overflow-y-auto divide-y divide-zinc-100 border border-zinc-200 rounded-lg">
                {mlResults.length === 0 ? (
                  <p className="p-4 text-xs text-zinc-500 text-center">
                    Digite o nome do produto para buscar direto na API do
                    Mercado Livre.
                  </p>
                ) : (
                  mlResults.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 flex items-center justify-between gap-3 hover:bg-zinc-50"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-zinc-900 line-clamp-2">
                          {item.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-bold text-emerald-700 tabular-nums">
                            {formatBRL(item.price)}
                          </span>
                          {item.freeShipping && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded">
                              Frete grátis
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => pinMlItem(item)}
                        className="shrink-0 px-2.5 py-1.5 text-xs font-medium bg-zinc-900 text-white rounded-md hover:bg-zinc-800 flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Fixar
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
