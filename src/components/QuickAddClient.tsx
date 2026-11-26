"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import {
  detectStoreFromUrl,
  STORE_META,
  STORE_TYPES,
  type StoreType,
} from "@/lib/pricing";
import type { SerializedList } from "@/lib/serializers";

interface QuickAddClientProps {
  lists: SerializedList[];
  initialUrl: string;
  initialTitle: string;
  initialPrice: string;
}

export function QuickAddClient({
  lists,
  initialUrl,
  initialTitle,
  initialPrice,
}: QuickAddClientProps) {
  const detectedStore = detectStoreFromUrl(initialUrl) ?? "MERCADO_LIVRE";
  const [url, setUrl] = useState(initialUrl);
  const [store, setStore] = useState<StoreType>(detectedStore);
  const title = initialTitle;
  const [price, setPrice] = useState(initialPrice);
  const [shippingCost, setShippingCost] = useState("0");
  const [listId, setListId] = useState(lists[0]?.id ?? "");
  const [productId, setProductId] = useState<string>("__new__");
  const [newProductName, setNewProductName] = useState(initialTitle);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedList = useMemo(
    () => lists.find((l) => l.id === listId),
    [lists, listId]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!listId) {
      setError("Crie uma lista primeiro no painel principal.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const parsedPrice = Number(price.replace(",", ".")) || 0;
      const parsedShipping = Number(shippingCost.replace(",", ".")) || 0;

      if (productId === "__new__") {
        const res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            listId,
            name: newProductName.trim() || title.trim() || "Produto sem nome",
            initialOffer: {
              store,
              url: url.trim(),
              titleSnapshot: title.trim() || undefined,
              basePrice: parsedPrice,
              shippingCost: parsedShipping,
              sourceMode: "BOOKMARKLET",
            },
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? "Erro ao salvar produto.");
          return;
        }
      } else {
        const res = await fetch("/api/offers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId,
            store,
            url: url.trim(),
            titleSnapshot: title.trim() || undefined,
            basePrice: parsedPrice,
            shippingCost: parsedShipping,
            sourceMode: "BOOKMARKLET",
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? "Erro ao salvar oferta.");
          return;
        }
      }

      setDone(true);
    } catch {
      setError("Falha de rede ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
        <div className="w-full max-w-sm bg-white border border-zinc-200 rounded-xl p-6 text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
          <h1 className="text-base font-semibold text-zinc-900">
            Salvo no PrecoCraft!
          </h1>
          <p className="text-xs text-zinc-500">
            Você já pode fechar esta janela ou abrir o painel completo.
          </p>
          <div className="flex gap-2 justify-center pt-2">
            <button
              type="button"
              onClick={() => window.close()}
              className="px-3.5 py-2 text-xs font-medium border border-zinc-300 rounded-lg hover:bg-zinc-50"
            >
              Fechar Janela
            </button>
            <Link
              href="/"
              className="px-3.5 py-2 text-xs font-medium bg-zinc-900 text-white rounded-lg hover:bg-zinc-800"
            >
              Abrir Painel
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-4 flex items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white border border-zinc-200 rounded-xl shadow-sm p-5 space-y-3.5"
      >
        <div>
          <h1 className="text-sm font-bold text-zinc-900">
            + Captura Rápida PrecoCraft
          </h1>
          <p className="text-xs text-zinc-500">
            Confira os dados capturados e salve na sua lista
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              Loja
            </label>
            <select
              value={store}
              onChange={(e) => setStore(e.target.value as StoreType)}
              className="w-full px-2.5 py-2 text-xs border border-zinc-300 rounded-lg bg-white"
            >
              {STORE_TYPES.map((st) => (
                <option key={st} value={st}>
                  {STORE_META[st].label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              Preço Base (R$)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-2.5 py-2 text-xs border border-zinc-300 rounded-lg tabular-nums"
            />
          </div>
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
            className="w-full px-2.5 py-2 text-xs border border-zinc-300 rounded-lg tabular-nums"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">
            Lista
          </label>
          <select
            value={listId}
            onChange={(e) => {
              setListId(e.target.value);
              setProductId("__new__");
            }}
            className="w-full px-2.5 py-2 text-xs border border-zinc-300 rounded-lg bg-white"
          >
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">
            Vincular ao Produto
          </label>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="w-full px-2.5 py-2 text-xs border border-zinc-300 rounded-lg bg-white"
          >
            <option value="__new__">+ Criar novo produto nesta lista</option>
            {selectedList?.products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {productId === "__new__" && (
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              Nome do Produto
            </label>
            <input
              type="text"
              required
              value={newProductName}
              onChange={(e) => setNewProductName(e.target.value)}
              className="w-full px-2.5 py-2 text-xs border border-zinc-300 rounded-lg"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">
            URL da Oferta
          </label>
          <input
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full px-2.5 py-2 text-xs border border-zinc-300 rounded-lg text-zinc-600"
          />
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-2.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Salvar Oferta"}
        </button>
      </form>
    </div>
  );
}
