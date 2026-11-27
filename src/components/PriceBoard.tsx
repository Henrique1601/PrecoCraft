"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Bookmark,
  Check,
  Download,
  ExternalLink,
  FolderPlus,
  Link2,
  LogOut,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  Trash2,
  Upload,
} from "lucide-react";
import {
  calculateFinalPrice,
  calculateSingleStoreTotals,
  findBestOffer,
  formatBRL,
  getBestOfferForStore,
  getPriceDelta,
  sortProducts,
  STORE_META,
  STORE_TYPES,
  type PaymentMode,
  type SortMode,
  type StoreType,
} from "@/lib/pricing";
import { exportListToCsv } from "@/lib/csv";
import type {
  SerializedList,
  SerializedOffer,
  SerializedProduct,
} from "@/lib/serializers";
import { AddProductModal } from "./AddProductModal";
import { BookmarkletModal } from "./BookmarkletModal";
import { ImportCsvModal } from "./ImportCsvModal";
import { MagicLinkModal } from "./MagicLinkModal";
import { OfferCellModal } from "./OfferCellModal";

interface PriceBoardProps {
  initialLists: SerializedList[];
  authEnabled: boolean;
}

type FilterMode = "all" | "pending" | "purchased";

export function PriceBoard({ initialLists, authEnabled }: PriceBoardProps) {
  const [lists, setLists] = useState<SerializedList[]>(initialLists);
  const [activeListId, setActiveListId] = useState<string>(
    initialLists[0]?.id ?? ""
  );
  const [creatingList, setCreatingList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("pending");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("cash");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showMagicLink, setShowMagicLink] = useState(false);
  const [showImportCsv, setShowImportCsv] = useState(false);
  const [showBookmarklet, setShowBookmarklet] = useState(false);
  const [refreshingList, setRefreshingList] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const [editingCell, setEditingCell] = useState<{
    product: SerializedProduct;
    store: StoreType;
    offers: SerializedOffer[];
  } | null>(null);

  const activeList = useMemo(
    () => lists.find((l) => l.id === activeListId) ?? lists[0] ?? null,
    [lists, activeListId]
  );

  const filteredProducts = useMemo(() => {
    if (!activeList) return [];
    const q = searchQuery.trim().toLowerCase();
    const byStatus = activeList.products.filter((p) => {
      if (filterMode === "pending" && p.purchased) return false;
      if (filterMode === "purchased" && !p.purchased) return false;
      if (q) {
        const matchName = p.name.toLowerCase().includes(q);
        const matchNotes = p.notes?.toLowerCase().includes(q) ?? false;
        if (!matchName && !matchNotes) return false;
      }
      return true;
    });
    return sortProducts(byStatus, sortMode, paymentMode);
  }, [activeList, filterMode, searchQuery, sortMode, paymentMode]);

  const { pendingTotal, purchasedTotal, singleStoreTotals } = useMemo(() => {
    if (!activeList) {
      return { pendingTotal: 0, purchasedTotal: 0, singleStoreTotals: [] };
    }
    let pending = 0;
    let purchased = 0;
    for (const p of activeList.products) {
      const best = findBestOffer(p.offers, paymentMode);
      const val = best ? best.bestPrice : 0;
      if (p.purchased) purchased += val;
      else pending += val;
    }
    return {
      pendingTotal: pending,
      purchasedTotal: purchased,
      singleStoreTotals: calculateSingleStoreTotals(
        activeList.products,
        paymentMode
      ),
    };
  }, [activeList, paymentMode]);

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

  async function handleRenameList(list: SerializedList) {
    const nextName = prompt("Novo nome da lista:", list.name);
    if (!nextName || !nextName.trim() || nextName.trim() === list.name) return;
    const res = await fetch(`/api/lists/${list.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nextName.trim() }),
    });
    if (res.ok) {
      setLists((prev) =>
        prev.map((l) =>
          l.id === list.id ? { ...l, name: nextName.trim() } : l
        )
      );
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

  async function handleEditProduct(product: SerializedProduct) {
    const nextName = prompt("Nome do produto:", product.name);
    if (!nextName || !nextName.trim()) return;
    const nextNotes = prompt("Observação (opcional):", product.notes ?? "");
    if (nextNotes === null) return;

    const res = await fetch(`/api/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: nextName.trim(),
        notes: nextNotes.trim() || null,
      }),
    });
    if (res.ok) {
      setLists((prev) =>
        prev.map((l) =>
          l.id === product.listId
            ? {
                ...l,
                products: l.products.map((p) =>
                  p.id === product.id
                    ? {
                        ...p,
                        name: nextName.trim(),
                        notes: nextNotes.trim() || null,
                      }
                    : p
                ),
              }
            : l
        )
      );
    }
  }

  async function handleTogglePurchased(product: SerializedProduct) {
    const nextVal = !product.purchased;
    setLists((prev) =>
      prev.map((l) =>
        l.id === product.listId
          ? {
              ...l,
              products: l.products.map((p) =>
                p.id === product.id ? { ...p, purchased: nextVal } : p
              ),
            }
          : l
      )
    );
    await fetch(`/api/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purchased: nextVal }),
    });
  }

  async function handleUpdateTargetPrice(product: SerializedProduct) {
    const raw = prompt(
      `Preço Alvo (Meta) para "${product.name}" (deixe vazio para remover):`,
      product.targetPrice !== null ? String(product.targetPrice) : ""
    );
    if (raw === null) return;
    const parsed = raw.trim() ? Number(raw.replace(",", ".")) : null;
    if (parsed !== null && (Number.isNaN(parsed) || parsed < 0)) return;

    const res = await fetch(`/api/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetPrice: parsed }),
    });
    if (res.ok) {
      setLists((prev) =>
        prev.map((l) =>
          l.id === product.listId
            ? {
                ...l,
                products: l.products.map((p) =>
                  p.id === product.id ? { ...p, targetPrice: parsed } : p
                ),
              }
            : l
        )
      );
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

  function handleCsvImported(products: SerializedProduct[]) {
    if (!activeList || products.length === 0) return;
    setLists((prev) =>
      prev.map((l) =>
        l.id === activeList.id
          ? { ...l, products: [...l.products, ...products] }
          : l
      )
    );
    setStatusMsg(`${products.length} produto(s) importado(s) do CSV!`);
  }

  function handleExportCsv() {
    if (!activeList) return;
    const csv = exportListToCsv(activeList);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeList.name.toLowerCase().replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleOfferSaved(offer: SerializedOffer) {
    setLists((prev) =>
      prev.map((l) => ({
        ...l,
        products: l.products.map((p) => {
          if (p.id !== offer.productId) return p;
          const exists = p.offers.some((o) => o.id === offer.id);
          return {
            ...p,
            offers: exists
              ? p.offers.map((o) => (o.id === offer.id ? offer : o))
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="text-base font-bold tracking-tight text-zinc-900">
              Preco<span className="text-emerald-600">Craft</span>
            </span>
            <span className="hidden lg:inline-block text-xs text-zinc-400">
              Planilha limpa de preços reais
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              href="/quick-add"
              title="Colar link rápido (ideal no celular)"
              className="px-2.5 py-1.5 text-xs font-medium text-zinc-700 border border-zinc-300 bg-white hover:bg-zinc-50 rounded-lg flex items-center gap-1.5"
            >
              <Link2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Colar Link</span>
            </Link>

            <button
              type="button"
              onClick={() => setShowBookmarklet(true)}
              title="Bookmarklet 1-Clique"
              className="px-2.5 py-1.5 text-xs font-medium text-zinc-700 border border-zinc-300 bg-white hover:bg-zinc-50 rounded-lg flex items-center gap-1.5"
            >
              <Bookmark className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden md:inline">Bookmarklet</span>
            </button>

            {activeList && (
              <>
                <button
                  type="button"
                  onClick={handleRefreshList}
                  disabled={refreshingList}
                  title="Atualizar ML e KaBuM!"
                  className="px-2.5 py-1.5 text-xs font-medium text-zinc-700 border border-zinc-300 bg-white hover:bg-zinc-50 rounded-lg flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${
                      refreshingList ? "animate-spin" : ""
                    }`}
                  />
                  <span className="hidden md:inline">Atualizar ML/KaBuM</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowMagicLink(true)}
                  title="Colar link e buscar nos outros mercados"
                  className="px-2.5 py-1.5 text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Link Mágico</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddProduct(true)}
                  className="px-3 py-1.5 text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 rounded-lg flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Novo Produto</span>
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
            const pendingCount = list.products.filter(
              (p) => !p.purchased
            ).length;
            return (
              <button
                key={list.id}
                type="button"
                onClick={() => setActiveListId(list.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 shrink-0 ${
                  isActive
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                {list.name}
                <span
                  className={`text-[10px] px-1.5 rounded-full ${
                    isActive
                      ? "bg-zinc-700 text-zinc-200"
                      : "bg-zinc-200 text-zinc-600"
                  }`}
                >
                  {pendingCount}
                </span>
              </button>
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
            {/* Summary, Search, Sort, Payment Mode & CSV Bar */}
            <div className="bg-white border border-zinc-200 rounded-xl px-4 py-3 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="flex items-center gap-1">
                    <h1 className="text-sm font-semibold text-zinc-900">
                      {activeList.name}
                    </h1>
                    <button
                      type="button"
                      onClick={() => handleRenameList(activeList)}
                      title="Renomear lista"
                      className="p-1 text-zinc-400 hover:text-zinc-800 rounded"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex items-center bg-zinc-100 p-0.5 rounded-lg text-[11px] font-medium">
                    {(
                      [
                        ["pending", "Falta comprar"],
                        ["purchased", "Comprados"],
                        ["all", "Todos"],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFilterMode(key)}
                        className={`px-2.5 py-1 rounded-md transition-colors ${
                          filterMode === key
                            ? "bg-white text-zinc-900 shadow-2xs"
                            : "text-zinc-500 hover:text-zinc-800"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center bg-zinc-100 p-0.5 rounded-lg text-[11px] font-medium">
                    {(
                      [
                        ["cash", "Pix / À vista"],
                        ["installment", "Cartão"],
                      ] as const
                    ).map(([mode, label]) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setPaymentMode(mode)}
                        className={`px-2.5 py-1 rounded-md transition-colors ${
                          paymentMode === mode
                            ? "bg-emerald-600 text-white shadow-2xs"
                            : "text-zinc-500 hover:text-zinc-800"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-zinc-500">Falta comprar: </span>
                    <span className="font-bold text-emerald-700 text-sm tabular-nums">
                      {formatBRL(pendingTotal)}
                    </span>
                  </div>
                  {purchasedTotal > 0 && (
                    <div className="hidden sm:block">
                      <span className="text-zinc-500">Já comprado: </span>
                      <span className="font-semibold text-zinc-700 tabular-nums">
                        {formatBRL(purchasedTotal)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-100">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar item..."
                      className="pl-8 pr-3 py-1 text-xs border border-zinc-200 rounded-lg bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 w-44 sm:w-56"
                    />
                  </div>

                  <select
                    value={sortMode}
                    onChange={(e) => setSortMode(e.target.value as SortMode)}
                    className="px-2.5 py-1 text-xs border border-zinc-200 rounded-lg bg-white text-zinc-700"
                  >
                    <option value="recent">Ordenar: Mais recentes</option>
                    <option value="target_first">Na meta primeiro</option>
                    <option value="price_asc">Menor preço</option>
                    <option value="price_desc">Maior preço</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowImportCsv(true)}
                    className="px-2 py-1 text-[11px] text-zinc-600 hover:text-zinc-900 border border-zinc-200 rounded-md flex items-center gap-1"
                  >
                    <Upload className="w-3 h-3" />
                    Importar CSV
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="px-2 py-1 text-[11px] text-zinc-600 hover:text-zinc-900 border border-zinc-200 rounded-md flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    Exportar CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteList(activeList.id)}
                    className="text-[11px] text-zinc-400 hover:text-red-600 px-1.5"
                  >
                    Excluir lista
                  </button>
                </div>
              </div>

              {singleStoreTotals.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-100 text-[11px] text-zinc-600">
                  <span className="font-medium text-zinc-500">
                    Simulador (tudo em 1 loja):
                  </span>
                  {singleStoreTotals.map((s) => (
                    <span
                      key={s.store}
                      className="px-2 py-0.5 rounded-md bg-zinc-100 border border-zinc-200 tabular-nums"
                    >
                      <strong>{STORE_META[s.store].shortLabel}</strong> (
                      {s.coveredCount}/{s.totalCount}):{" "}
                      <span className="font-semibold text-zinc-900">
                        {formatBRL(s.totalPrice)}
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {filteredProducts.length === 0 ? (
              <div className="bg-white border border-zinc-200 rounded-xl p-10 text-center space-y-3">
                <p className="text-sm font-medium text-zinc-800">
                  {activeList.products.length === 0
                    ? "Lista vazia"
                    : "Nenhum item encontrado"}
                </p>
                <p className="text-xs text-zinc-500">
                  Adicione apenas os itens que você quer monitorar ou importe
                  sua planilha CSV.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddProduct(true)}
                    className="px-4 py-2 text-xs font-medium bg-zinc-900 text-white rounded-lg hover:bg-zinc-800"
                  >
                    + Adicionar Produto
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowImportCsv(true)}
                    className="px-4 py-2 text-xs font-medium border border-zinc-300 text-zinc-700 rounded-lg hover:bg-zinc-50"
                  >
                    Importar CSV
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Desktop Excel-style Table */}
                <div className="hidden md:block bg-white border border-zinc-200 rounded-xl overflow-x-auto shadow-xs">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600">
                        <th className="py-2.5 px-3.5 font-semibold min-w-[230px] border-r border-zinc-200">
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
                        <th className="py-2.5 px-3.5 font-semibold min-w-[140px] bg-emerald-50/60 text-emerald-900">
                          Melhor Preço
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {filteredProducts.map((product) => {
                        const best = findBestOffer(product.offers, paymentMode);
                        const hitTarget =
                          best !== null &&
                          product.targetPrice !== null &&
                          best.bestPrice <= product.targetPrice;

                        return (
                          <tr
                            key={product.id}
                            className={`hover:bg-zinc-50/70 transition-colors ${
                              product.purchased ? "opacity-60 bg-zinc-50/50" : ""
                            }`}
                          >
                            <td className="py-2.5 px-3.5 border-r border-zinc-200 align-top">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-2 min-w-0">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleTogglePurchased(product)
                                    }
                                    title={
                                      product.purchased
                                        ? "Marcar como pendente"
                                        : "Marcar como comprado"
                                    }
                                    className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                      product.purchased
                                        ? "bg-emerald-600 border-emerald-600 text-white"
                                        : "border-zinc-300 hover:border-emerald-500"
                                    }`}
                                  >
                                    {product.purchased && (
                                      <Check className="w-3 h-3" />
                                    )}
                                  </button>

                                  <div className="min-w-0">
                                    <p
                                      className={`font-medium text-zinc-900 leading-snug ${
                                        product.purchased ? "line-through" : ""
                                      }`}
                                    >
                                      {product.name}
                                    </p>
                                    {product.notes && (
                                      <p className="text-[11px] text-zinc-500 mt-0.5">
                                        {product.notes}
                                      </p>
                                    )}
                                    <div className="flex items-center gap-2 mt-1">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleUpdateTargetPrice(product)
                                        }
                                        className="text-[10px] text-zinc-500 hover:text-zinc-900 flex items-center gap-0.5 tabular-nums"
                                      >
                                        <Target className="w-3 h-3" />
                                        {product.targetPrice !== null
                                          ? `Meta: ${formatBRL(
                                              product.targetPrice
                                            )}`
                                          : "Definir meta"}
                                      </button>
                                      {hitTarget && !product.purchased && (
                                        <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded">
                                          Na meta!
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-0.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleEditProduct(product)}
                                    title="Editar produto"
                                    className="p-1 text-zinc-300 hover:text-zinc-700 rounded"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDeleteProduct(product.id)
                                    }
                                    title="Remover produto"
                                    className="p-1 text-zinc-300 hover:text-red-600 rounded"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </td>

                            {STORE_TYPES.map((st) => {
                              const storeOffers = product.offers.filter(
                                (o) => o.store === st
                              );
                              const storeBest = getBestOfferForStore(
                                product.offers,
                                st,
                                paymentMode
                              );
                              const offer = storeBest?.best ?? null;
                              const finalPrice = offer
                                ? calculateFinalPrice(offer, paymentMode)
                                : null;
                              const delta = offer
                                ? getPriceDelta(
                                    offer.basePrice,
                                    offer.previousBasePrice
                                  )
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
                                      offers: storeOffers,
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
                                        <div className="flex items-center gap-1">
                                          {storeOffers.length > 1 && (
                                            <span className="text-[10px] px-1 bg-zinc-200 text-zinc-700 rounded">
                                              +{storeOffers.length - 1}
                                            </span>
                                          )}
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
                                      </div>

                                      {delta !== null && (
                                        <p
                                          className={`text-[10px] font-medium tabular-nums ${
                                            delta < 0
                                              ? "text-emerald-700"
                                              : "text-red-600"
                                          }`}
                                        >
                                          {delta < 0
                                            ? `↓ -${formatBRL(Math.abs(delta))}`
                                            : `↑ +${formatBRL(delta)}`}
                                        </p>
                                      )}

                                      {offer.lowestPriceSeen !== null &&
                                        offer.lowestPriceSeen <
                                          offer.basePrice && (
                                          <p className="text-[10px] text-zinc-400 tabular-nums">
                                            Mín: {formatBRL(offer.lowestPriceSeen)}
                                          </p>
                                        )}

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
                  {filteredProducts.map((product) => {
                    const best = findBestOffer(product.offers, paymentMode);
                    const hitTarget =
                      best !== null &&
                      product.targetPrice !== null &&
                      best.bestPrice <= product.targetPrice;

                    return (
                      <div
                        key={product.id}
                        className={`bg-white border border-zinc-200 rounded-xl p-3.5 space-y-2.5 ${
                          product.purchased ? "opacity-65" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                            <button
                              type="button"
                              onClick={() => handleTogglePurchased(product)}
                              className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                product.purchased
                                  ? "bg-emerald-600 border-emerald-600 text-white"
                                  : "border-zinc-300"
                              }`}
                            >
                              {product.purchased && (
                                <Check className="w-3 h-3" />
                              )}
                            </button>
                            <div>
                              <h3
                                className={`text-sm font-semibold text-zinc-900 ${
                                  product.purchased ? "line-through" : ""
                                }`}
                              >
                                {product.name}
                              </h3>
                              {hitTarget && !product.purchased && (
                                <span className="inline-block mt-0.5 text-[10px] font-semibold px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded">
                                  Na meta ({formatBRL(product.targetPrice!)})
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleEditProduct(product)}
                              className="p-1 text-zinc-400 hover:text-zinc-700"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(product.id)}
                              className="p-1 text-zinc-400 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          {STORE_TYPES.map((st) => {
                            const storeOffers = product.offers.filter(
                              (o) => o.store === st
                            );
                            const storeBest = getBestOfferForStore(
                              product.offers,
                              st,
                              paymentMode
                            );
                            const offer = storeBest?.best ?? null;
                            const finalPrice = offer
                              ? calculateFinalPrice(offer, paymentMode)
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
                                  setEditingCell({
                                    product,
                                    store: st,
                                    offers: storeOffers,
                                  })
                                }
                                className={`text-left p-2 rounded-lg border text-xs ${
                                  isWinner
                                    ? "bg-emerald-50 border-emerald-300"
                                    : "bg-zinc-50 border-zinc-200"
                                }`}
                              >
                                <div className="text-[10px] font-medium text-zinc-500 flex items-center justify-between">
                                  <span>{STORE_META[st].shortLabel}</span>
                                  {storeOffers.length > 1 && (
                                    <span>+{storeOffers.length - 1}</span>
                                  )}
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

      {showMagicLink && activeList && (
        <MagicLinkModal
          listId={activeList.id}
          onClose={() => setShowMagicLink(false)}
          onCreated={handleProductCreated}
        />
      )}

      {showImportCsv && activeList && (
        <ImportCsvModal
          listId={activeList.id}
          onClose={() => setShowImportCsv(false)}
          onImported={handleCsvImported}
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
          offers={editingCell.offers}
          onClose={() => setEditingCell(null)}
          onSaved={handleOfferSaved}
          onDeleted={handleOfferDeleted}
        />
      )}
    </div>
  );
}
