"use client";

import { useState } from "react";
import { ExternalLink, Plus, RefreshCw, Trash2, X } from "lucide-react";
import {
  calculateFinalPrice,
  formatBRL,
  STORE_META,
  type StoreType,
} from "@/lib/pricing";
import type { SerializedOffer } from "@/lib/serializers";

interface OfferCellModalProps {
  productId: string;
  productName: string;
  store: StoreType;
  offers: SerializedOffer[];
  onClose: () => void;
  onSaved: (offer: SerializedOffer) => void;
  onDeleted: (offerId: string) => void;
}

export function OfferCellModal({
  productId,
  productName,
  store,
  offers,
  onClose,
  onSaved,
  onDeleted,
}: OfferCellModalProps) {
  const meta = STORE_META[store];
  const [selectedId, setSelectedId] = useState<string>(
    offers[0]?.id ?? "__new__"
  );
  const activeOffer = offers.find((o) => o.id === selectedId) ?? null;

  const [sellerName, setSellerName] = useState(activeOffer?.sellerName ?? "");
  const [url, setUrl] = useState(activeOffer?.url ?? "");
  const [basePrice, setBasePrice] = useState(
    activeOffer ? String(activeOffer.basePrice) : ""
  );
  const [shippingCost, setShippingCost] = useState(
    activeOffer ? String(activeOffer.shippingCost) : "0"
  );
  const [discountAmount, setDiscountAmount] = useState(
    activeOffer ? String(activeOffer.discountAmount) : "0"
  );
  const [cashbackAmount, setCashbackAmount] = useState(
    activeOffer ? String(activeOffer.cashbackAmount) : "0"
  );
  const [inStock, setInStock] = useState(activeOffer?.inStock ?? true);
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function selectOffer(id: string) {
    setSelectedId(id);
    const next = offers.find((o) => o.id === id) ?? null;
    setSellerName(next?.sellerName ?? "");
    setUrl(next?.url ?? "");
    setBasePrice(next ? String(next.basePrice) : "");
    setShippingCost(next ? String(next.shippingCost) : "0");
    setDiscountAmount(next ? String(next.discountAmount) : "0");
    setCashbackAmount(next ? String(next.cashbackAmount) : "0");
    setInStock(next?.inStock ?? true);
    setMessage(null);
  }

  const previewFinal = calculateFinalPrice({
    basePrice: Number(basePrice.replace(",", ".")) || 0,
    shippingCost: Number(shippingCost.replace(",", ".")) || 0,
    discountAmount: Number(discountAmount.replace(",", ".")) || 0,
    cashbackAmount: Number(cashbackAmount.replace(",", ".")) || 0,
  });

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const parsedBase = Number(basePrice.replace(",", "."));
      const res = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activeOffer?.id,
          productId,
          store,
          sellerName: sellerName.trim() || null,
          url: url.trim(),
          basePrice: Number.isNaN(parsedBase) ? undefined : parsedBase,
          shippingCost: Number(shippingCost.replace(",", ".")) || 0,
          discountAmount: Number(discountAmount.replace(",", ".")) || 0,
          cashbackAmount: Number(cashbackAmount.replace(",", ".")) || 0,
          inStock,
          sourceMode: "MANUAL",
          autoFetch: !basePrice.trim() && meta.autoRefresh,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Erro ao salvar oferta.");
        return;
      }
      onSaved(data.offer);
      onClose();
    } catch {
      setMessage("Falha de rede ao salvar oferta.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAutoFetch() {
    if (!activeOffer?.id) return;
    setFetching(true);
    setMessage(null);
    try {
      const res = await fetch("/api/offers/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerId: activeOffer.id }),
      });
      const data = await res.json();
      const first = data.results?.[0];
      if (first?.ok && first.offer) {
        setBasePrice(String(first.offer.basePrice));
        setInStock(first.offer.inStock);
        onSaved(first.offer);
        setMessage("Preço atualizado automaticamente!");
      } else {
        setMessage(first?.message ?? "Não foi possível buscar automaticamente.");
      }
    } catch {
      setMessage("Erro ao consultar loja.");
    } finally {
      setFetching(false);
    }
  }

  async function handleDelete() {
    if (!activeOffer?.id) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/offers/${activeOffer.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onDeleted(activeOffer.id);
        onClose();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md bg-white rounded-xl border border-zinc-200 shadow-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-200 bg-zinc-50">
          <div>
            <span
              className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded border ${meta.badgeClass}`}
            >
              {meta.label}
            </span>
            <h2 className="text-sm font-semibold text-zinc-900 mt-1 line-clamp-1">
              {productName}
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

        {/* Multi-seller switcher */}
        {offers.length > 0 && (
          <div className="px-5 pt-3 flex items-center gap-1.5 overflow-x-auto">
            {offers.map((o, idx) => (
              <button
                key={o.id}
                type="button"
                onClick={() => selectOffer(o.id)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-md border shrink-0 ${
                  selectedId === o.id
                    ? "bg-zinc-900 text-white border-zinc-900"
                    : "bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100"
                }`}
              >
                {o.sellerName || `Oferta ${idx + 1}`} (
                {formatBRL(calculateFinalPrice(o))})
              </button>
            ))}
            <button
              type="button"
              onClick={() => selectOffer("__new__")}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md border shrink-0 flex items-center gap-1 ${
                selectedId === "__new__"
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50"
              }`}
            >
              <Plus className="w-3 h-3" />
              Outro vendedor
            </button>
          </div>
        )}

        <form onSubmit={handleSave} className="p-5 space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              Vendedor / Loja (opcional)
            </label>
            <input
              type="text"
              value={sellerName}
              onChange={(e) => setSellerName(e.target.value)}
              placeholder="Ex: Loja Oficial, Vendedor SP..."
              className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              Link do anúncio
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="flex-1 px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {url && (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Abrir na loja"
                  className="px-2.5 py-2 border border-zinc-300 rounded-lg text-zinc-600 hover:bg-zinc-50 flex items-center"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Preço Base (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required={!meta.autoRefresh}
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                placeholder={meta.autoRefresh ? "Auto ou digite" : "0.00"}
                className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Frete (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={shippingCost}
                onChange={(e) => setShippingCost(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Cupom / Desconto (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Cashback (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={cashbackAmount}
                onChange={(e) => setCashbackAmount(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-3.5 py-2.5">
            <span className="text-xs font-medium text-emerald-900">
              Preço Final Real
            </span>
            <span className="text-base font-bold text-emerald-700 tabular-nums">
              {formatBRL(previewFinal)}
            </span>
          </div>

          <label className="flex items-center gap-2 text-xs text-zinc-700 cursor-pointer">
            <input
              type="checkbox"
              checked={inStock}
              onChange={(e) => setInStock(e.target.checked)}
              className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
            />
            Produto em estoque
          </label>

          {message && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              {message}
            </p>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
            <div className="flex items-center gap-2">
              {activeOffer && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className="px-2.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remover
                </button>
              )}
              {activeOffer && meta.autoRefresh && (
                <button
                  type="button"
                  onClick={handleAutoFetch}
                  disabled={fetching}
                  className="px-2.5 py-2 text-xs font-medium text-zinc-700 border border-zinc-300 hover:bg-zinc-50 rounded-lg flex items-center gap-1"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${fetching ? "animate-spin" : ""}`}
                  />
                  Atualizar
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
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
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
