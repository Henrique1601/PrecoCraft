"use client";

import { useState } from "react";
import { FileSpreadsheet, Upload, X } from "lucide-react";
import type { SerializedProduct } from "@/lib/serializers";

interface ImportCsvModalProps {
  listId: string;
  onClose: () => void;
  onImported: (products: SerializedProduct[]) => void;
}

export function ImportCsvModal({
  listId,
  onClose,
  onImported,
}: ImportCsvModalProps) {
  const [csvText, setCsvText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setCsvText(reader.result);
      }
    };
    reader.readAsText(file, "UTF-8");
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!csvText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/lists/${listId}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao importar CSV.");
        return;
      }
      onImported(data.products ?? []);
      onClose();
    } catch {
      setError("Erro de rede ao importar CSV.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-semibold text-zinc-900">
              Importar do Excel (CSV)
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

        <form onSubmit={handleImport} className="p-5 space-y-4">
          <p className="text-xs text-zinc-600 leading-relaxed">
            Suba um arquivo <strong>.csv</strong> salvo no Excel ou cole as
            linhas abaixo. Colunas aceitas:{" "}
            <code className="bg-zinc-100 px-1 py-0.5 rounded">
              Produto;Observacao;Preco Alvo;URL;Preco
            </code>
          </p>

          <label className="flex items-center justify-center gap-2 border border-dashed border-zinc-300 rounded-lg p-3 text-xs text-zinc-600 hover:bg-zinc-50 cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>Escolher arquivo .csv</span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFile}
              className="hidden"
            />
          </label>

          <textarea
            rows={6}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={`Produto;Observacao;Preco Alvo;URL;Preco\nMouse Logitech;Preto;350,00;https://www.kabum.com.br/...;399,90`}
            className="w-full px-3 py-2 text-xs font-mono border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !csvText.trim()}
              className="px-4 py-2 text-xs font-medium bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 disabled:opacity-50"
            >
              {loading ? "Importando..." : "Importar Produtos"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
