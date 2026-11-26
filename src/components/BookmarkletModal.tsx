"use client";

import { useState } from "react";
import { Bookmark, Check, Copy, X } from "lucide-react";
import { buildBookmarkletCode } from "@/lib/bookmarklet";

interface BookmarkletModalProps {
  onClose: () => void;
}

export function BookmarkletModal({ onClose }: BookmarkletModalProps) {
  const [copied, setCopied] = useState(false);
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://precocraft.vercel.app";
  const code = buildBookmarkletCode(origin);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md bg-white rounded-xl border border-zinc-200 shadow-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-200 bg-zinc-50">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-semibold text-zinc-900">
              Captura em 1 Clique (Bookmarklet)
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

        <div className="p-5 space-y-4 text-xs text-zinc-700 leading-relaxed">
          <p>
            Ideal para <strong>TikTok Shop, Amazon e AliExpress</strong> (que
            bloqueiam robôs). Você captura o preço direto da página que já está
            vendo no navegador:
          </p>

          <ol className="list-decimal pl-4 space-y-1.5">
            <li>
              Arraste o botão verde abaixo para a{" "}
              <strong>Barra de Favoritos</strong> do seu navegador (ou copie o
              código e salve como URL de um favorito).
            </li>
            <li>
              Quando estiver vendo um produto na loja, clique em{" "}
              <strong>+ PrecoCraft</strong> nos favoritos.
            </li>
            <li>
              Uma janela compacta abre com loja, título e preço já preenchidos
              para salvar na sua lista.
            </li>
          </ol>

          <div className="flex items-center justify-between gap-3 p-3 bg-zinc-50 border border-zinc-200 rounded-lg">
            <a
              href={code}
              onClick={(e) => e.preventDefault()}
              draggable
              className="px-3.5 py-2 bg-emerald-600 text-white font-semibold rounded-lg shadow-sm cursor-grab active:cursor-grabbing select-none"
              title="Arraste para a barra de favoritos"
            >
              + PrecoCraft
            </a>

            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-2 border border-zinc-300 bg-white hover:bg-zinc-50 rounded-lg font-medium flex items-center gap-1.5 text-zinc-700"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copiar código
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
