"use client";

import { useMemo, useState } from "react";
import {
  Bookmark,
  ExternalLink,
  FolderPlus,
  LogOut,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  calculateFinalPrice,
  findBestOffer,
  formatBRL,
  STORE_META,
  STORE_TYPES,
  type StoreType,
} from "@/lib/pricing";
import type {
  SerializedList,
  SerializedOffer,
  SerializedProduct,
} from "@/lib/serializers";
import { AddProductModal } from "./AddProductModal";
import { BookmarkletModal } from "./BookmarkletModal";
import { OfferCellModal } from "./OfferCellModal";

interface PriceBoardProps {
  initialLists: SerializedList[];
  authEnabled: boolean;
}

export function PriceBoard({ initialLists, authEnabled }: PriceBoardProps) {
  const [lists, setLists] = useState<SerializedList[]>(initialLists);
  const [activeListId, setActiveListId] = useState<string>(
    initialLists[0]?.id ?? ""
  );
  const [creatingList, setCreatingList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showBookmarklet, setShowBookmarklet] = useState(false);
  const [refreshingList, setRefreshingList] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const [editingCell, setEditingCell] = useState<{
    product: SerializedProduct;
    store: StoreType;
    offer: SerializedOffer | null;
  } | null>(null);

  const activeList = useMemo(
    () => lists.find((l) => l.id === activeListId) ?? lists[0] ?? null,
    [lists, activeListId]
  );

  const optimizedListTotal = useMemo(() => {
    if (!activeList) return 0;
    return activeList.products.reduce((sum, p) => {
      const best = findBestOffer(p.offers);
      return sum + (best ? best.bestPrice : 0);
    }, 0);
  }, [activeList]);

  async function handleCreateList(e: React.FormEvent) {
    e.preventDefault();
    if (!newListName.trim()) return;
    const res = await fetch("/api/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newListName.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      setLists((prev) => [...prev, data.list]);
      setActiveListId(data.list.id);
      setNewListName("");
      setCreatingList(false);
    }
  }

  async function handleDeleteList(listId: string) {
    if (!confirm("Excluir esta lista e todos os seus produtos?")) return;
    const res = await fetch(`/api/lists/${listId}`, { method: "DELETE" });
    if (res.ok) {
      const next = lists.filter((l) => l.id !== listId);
      setLists(next);
      if (activeListId === listId) {
        setActiveListId(next[0]?.id ?? "");
      }
    }
  }

  async function handleDeleteProduct(productId: string) {
    if (!activeList) return;
    const res = await fetch(`/api/products/${productId}`, { method: "DELETE" });
    if (res.ok) {
      setLists((prev) =>
        prev.map((l) =>
          l.id === activeList.id
            ? { ...l, products: l.products.filter((p) => p.id !== productId) }
            : l
        )
      );
    }
  }

  function handleProductCreated(product: SerializedProduct) {
    setLists((prev) =>
      prev.map((l) =>
        l.id === product.listId
          ? { ...l, products: [...l.products, product] }
          : l
      )
    );
  }

  function handleOfferSaved(offer: SerializedOffer) {
    setLists((prev) =>
      prev.map((l) => ({
        ...l,
        products: l.products.map((p) => {
          if (p.id !== offer.productId) return p;
          const exists = p.offers.some((o) => o.store === offer.store);
          return {
            ...p,
            offers: exists
              ? p.offers.map((o) => (o.store === offer.store ? offer : o))
              : [...p.offers, offer],
          };
        }),
      }))
    );
  }

  function handleOfferDeleted(offerId: string) {
    setLists((prev) =>
      prev.map((l) => ({
        ...l,
        products: l.products.map((p) => ({
          ...p,
          offers: p.offers.filter((o) => o.id !== offerId),
        })),
      }))
    );
  }

  async function handleRefreshList() {
    if (!activeList) return;
    setRefreshingList(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/offers/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listId: activeList.id }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.results)) {
        for (const r of data.results) {
          if (r.ok && r.offer) {
            handleOfferSaved(r.offer);
          }
        }
        setStatusMsg(
          `Atualizado: ${data.updatedCount} de ${data.checked} oferta(s) (ML e KaBuM!).`
        );
      }
    } finally {
      setRefreshingList(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    window.location.reload();
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      {/* Top Header */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-base font-bold tracking-tight text-zinc-900">
              Preco<span className="text-emerald-600">Craft</span>
            </span>
            <span className="hidden sm:inline-block text-xs text-zinc-400">
              Planilha limpa de preços reais
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowBookmarklet(true)}
              className="px-2.5 py-1.5 text-xs font-medium text-zinc-700 border border-zinc-300 bg-white hover:bg-zinc-50 rounded-lg flex items-center gap-1.5"
            >
              <Bookmark className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Bookmarklet 1-Clique</span>
            </button>

            {activeList && (
              <>
                <button
                  type="button"
                  onClick={handleRefreshList}
                  disabled={refreshingList}
                  className="px-2.5 py-1.5 text-xs font-medium text-zinc-700 border border-zinc-300 bg-white hover:bg-zinc-50 rounded-lg flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${
                      refreshingList ? "animate-spin" : ""
                    }`}
                  />
                  <span className="hidden sm:inline">Atualizar ML/KaBuM</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddProduct(true)}
                  className="px-3 py-1.5 text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 rounded-lg flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Novo Produto
                </button>
              </>
            )}

            {authEnabled && (
              <button
                type="button"
                onClick={handleLogout}
                title="Sair"
                className="p-1.5 text-zinc-500 hover:text-zinc-900 rounded-lg hover:bg-zinc-100"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* List Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1.5 overflow-x-auto pb-2.5 pt-1">
          {lists.map((list) => {
            const isActive = activeList?.id === list.id;
            return (
              <div key={list.id} className="flex items-center shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveListId(list.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                    isActive
                      ? "bg-zinc-900 text-white"
                      : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                  }`}
                >
                  {list.name}
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isActive
                        ? "bg-zinc-700 text-zinc-200"
                        : "bg-zinc-200 text-zinc-600"
                    }`}
                  >
                    {list.products.length}
                  </span>
                </button>
              </div>
            );
          })}

          {creatingList ? (
            <form onSubmit={handleCreateList} className="flex items-center gap-1">
              <input
                type="text"
                autoFocus
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="Nome da lista..."
                className="px-2.5 py-1 text-xs border border-zinc-300 rounded-lg bg-white w-36 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                className="px-2.5 py-1 text-xs font-medium bg-emerald-600 text-white rounded-lg"
              >
                Criar
              </button>
              <button
                type="button"
                onClick={() => setCreatingList(false)}
                className="px-2 py-1 text-xs text-zinc-500 hover:text-zinc-800"
              >
                Cancelar
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setCreatingList(true)}
              className="px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg flex items-center gap-1 shrink-0"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              Nova Lista
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5 space-y-4">
        {statusMsg && (
          <div className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2 rounded-lg flex items-center justify-between">
            <span>{statusMsg}</span>
            <button
              type="button"
              onClick={() => setStatusMsg(null)}
              className="text-emerald-700 hover:underline"
            >
              Fechar
            </button>
          </div>
        )}

        {!activeList ? (
          <div className="bg-white border border-zinc-200 rounded-xl p-10 text-center space-y-3">
            <p className="text-sm font-medium text-zinc-800">
              Nenhuma lista criada ainda.
            </p>
            <p className="text-xs text-zinc-500">
              Crie sua primeira lista (ex: Setup PC, Casa, Compras do Mês) para
              começar a comparar preços.
            </p>
            <button
              type="button"
              onClick={() => setCreatingList(true)}
              className="px-4 py-2 text-xs font-medium bg-zinc-900 text-white rounded-lg hover:bg-zinc-800"
            >
              + Criar Primeira Lista
            </button>
          </div>
        ) : (
          <>
            {/* Summary Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-zinc-200 rounded-xl px-4 py-3">
              <div className="flex items-center gap-3">
                <h1 className="text-sm font-semibold text-zinc-900">
                  {activeList.name}
                </h1>
                <button
                  type="button"
                  onClick={() => handleDeleteList(activeList.id)}
                  className="text-[11px] text-zinc-400 hover:text-red-600"
                >
                  Excluir lista
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-zinc-500">
                  Total otimizado (menor preço de cada item):
                </span>
                <span className="font-bold text-emerald-700 text-sm tabular-nums">
                  {formatBRL(optimizedListTotal)}
                </span>
              </div>
            </div>

            {activeList.products.length === 0 ? (
              <div className="bg-white border border-zinc-200 rounded-xl p-10 text-center space-y-3">
                <p className="text-sm font-medium text-zinc-800">
                  Lista vazia
                </p>
                <p className="text-xs text-zinc-500">
                  Adicione apenas os itens que você quer monitorar para manter
                  tudo limpo.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddProduct(true)}
                  className="px-4 py-2 text-xs font-medium bg-zinc-900 text-white rounded-lg hover:bg-zinc-800"
                >
                  + Adicionar Produto
                </button>
              </div>
            ) : (
              <>
                {/* Desktop Excel-style Table */}
                <div className="hidden md:block bg-white border border-zinc-200 rounded-xl overflow-x-auto shadow-xs">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600">
                        <th className="py-2.5 px-3.5 font-semibold min-w-[210px] border-r border-zinc-200">
                          Produto
                        </th>
                        {STORE_TYPES.map((st) => (
                          <th
                            key={st}
                            className="py-2.5 px-3 font-semibold min-w-[140px] border-r border-zinc-200"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span>{STORE_META[st].label}</span>
                              {STORE_META[st].autoRefresh && (
                                <span
                                  title="Suporta atualização automática"
                                  className="text-[10px] font-normal text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded"
                                >
                                  Auto
                                </span>
                              )}
                            </div>
                          </th>
                        ))}
                        <th className="py-2.5 px-3.5 font-semibold min-w-[130px] bg-emerald-50/60 text-emerald-900">
                          Melhor Preço
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {activeList.products.map((product) => {
                        const best = findBestOffer(product.offers);
                        return (
                          <tr
                            key={product.id}
                            className="hover:bg-zinc-50/70 transition-colors"
                          >
                            <td className="py-2.5 px-3.5 border-r border-zinc-200 align-top">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="font-medium text-zinc-900 leading-snug">
                                    {product.name}
                                  </p>
                                  {product.notes && (
                                    <p className="text-[11px] text-zinc-500 mt-0.5">
                                      {product.notes}
                                    </p>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteProduct(product.id)}
                                  title="Remover produto"
                                  className="p-1 text-zinc-300 hover:text-red-600 rounded shrink-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>

                            {STORE_TYPES.map((st) => {
                              const offer =
                                product.offers.find((o) => o.store === st) ??
                                null;
                              const finalPrice = offer
                                ? calculateFinalPrice(offer)
                                : null;
                              const isWinner =
                                best !== null &&
                                offer !== null &&
                                best.bestStore === st &&
                                offer.inStock;

                              return (
                                <td
                                  key={st}
                                  onClick={() =>
                                    setEditingCell({
                                      product,
                                      store: st,
                                      offer,
                                    })
                                  }
                                  className={`py-2 px-3 border-r border-zinc-200 align-top cursor-pointer transition-colors group ${
                                    isWinner
                                      ? "bg-emerald-50 hover:bg-emerald-100/70"
                                      : "hover:bg-zinc-100/70"
                                  }`}
                                >
                                  {offer && finalPrice !== null ? (
                                    <div className="space-y-0.5">
                                      <div className="flex items-center justify-between gap-1">
                                        <span
                                          className={`font-bold tabular-nums ${
                                            !offer.inStock
                                              ? "line-through text-zinc-400"
                                              : isWinner
                                                ? "text-emerald-700"
                                                : "text-zinc-900"
                                          }`}
                                        >
                                          {formatBRL(finalPrice)}
                                        </span>
                                        <a
                                          href={offer.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          title="Abrir na loja"
                                          className="text-zinc-400 hover:text-zinc-700"
                                        >
                                          <ExternalLink className="w-3 h-3" />
                                        </a>
                                      </div>

                                      {(offer.shippingCost > 0 ||
                                        offer.discountAmount > 0 ||
                                        offer.cashbackAmount > 0) && (
                                        <p className="text-[10px] text-zinc-500 tabular-nums">
                                          Base {formatBRL(offer.basePrice)}
                                          {offer.shippingCost > 0 &&
                                            ` +${offer.shippingCost}`}
                                          {offer.discountAmount > 0 &&
                                            ` -${offer.discountAmount}`}
                                          {offer.cashbackAmount > 0 &&
                                            ` (CB ${offer.cashbackAmount})`}
                                        </p>
                                      )}

                                      {!offer.inStock && (
                                        <span className="inline-block text-[10px] text-red-600 font-medium">
                                          Sem estoque
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="h-8 flex items-center text-[11px] text-zinc-300 group-hover:text-zinc-600">
                                      + Adicionar
                                    </div>
                                  )}
                                </td>
                              );
                            })}

                            <td className="py-2.5 px-3.5 align-top bg-emerald-50/30">
                              {best ? (
                                <div>
                                  <p className="font-bold text-emerald-700 tabular-nums">
                                    {formatBRL(best.bestPrice)}
                                  </p>
                                  <p className="text-[11px] text-emerald-800/80">
                                    {STORE_META[best.bestStore].label}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-zinc-400">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Compact Cards */}
                <div className="md:hidden space-y-3">
                  {activeList.products.map((product) => {
                    const best = findBestOffer(product.offers);
                    return (
                      <div
                        key={product.id}
                        className="bg-white border border-zinc-200 rounded-xl p-3.5 space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-sm font-semibold text-zinc-900">
                              {product.name}
                            </h3>
                            {product.notes && (
                              <p className="text-xs text-zinc-500">
                                {product.notes}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(product.id)}
                            className="p-1 text-zinc-400 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          {STORE_TYPES.map((st) => {
                            const offer =
                              product.offers.find((o) => o.store === st) ??
                              null;
                            const finalPrice = offer
                              ? calculateFinalPrice(offer)
                              : null;
                            const isWinner =
                              best !== null &&
                              offer !== null &&
                              best.bestStore === st &&
                              offer.inStock;

                            return (
                              <button
                                key={st}
                                type="button"
                                onClick={() =>
                                  setEditingCell({ product, store: st, offer })
                                }
                                className={`text-left p-2 rounded-lg border text-xs ${
                                  isWinner
                                    ? "bg-emerald-50 border-emerald-300"
                                    : "bg-zinc-50 border-zinc-200"
                                }`}
                              >
                                <div className="text-[10px] font-medium text-zinc-500">
                                  {STORE_META[st].shortLabel}
                                </div>
                                {offer && finalPrice !== null ? (
                                  <div
                                    className={`font-bold tabular-nums mt-0.5 ${
                                      isWinner
                                        ? "text-emerald-700"
                                        : "text-zinc-900"
                                    }`}
                                  >
                                    {formatBRL(finalPrice)}
                                  </div>
                                ) : (
                                  <div className="text-[11px] text-zinc-400 mt-0.5">
                                    + Adicionar
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </main>

      {showAddProduct && activeList && (
        <AddProductModal
          listId={activeList.id}
          onClose={() => setShowAddProduct(false)}
          onCreated={handleProductCreated}
        />
      )}

      {showBookmarklet && (
        <BookmarkletModal onClose={() => setShowBookmarklet(false)} />
      )}

      {editingCell && (
        <OfferCellModal
          productId={editingCell.product.id}
          productName={editingCell.product.name}
          store={editingCell.store}
          offer={editingCell.offer}
          onClose={() => setEditingCell(null)}
          onSaved={handleOfferSaved}
          onDeleted={handleOfferDeleted}
        />
      )}
    </div>
  );
}
