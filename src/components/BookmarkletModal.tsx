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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80">
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

          <div className="pt-3 border-t border-zinc-200 space-y-1.5">
            <p className="font-semibold text-zinc-800">
              Prefere Extensão no Chrome / Edge?
            </p>
            <p className="text-zinc-600">
              A extensão pronta está na pasta{" "}
              <code className="bg-zinc-100 px-1 py-0.5 rounded">extension/</code>{" "}
              do projeto. Abra{" "}
              <code className="bg-zinc-100 px-1 py-0.5 rounded">
                chrome://extensions
              </code>
              , ative o <strong>Modo do desenvolvedor</strong> e clique em{" "}
              <strong>Carregar sem compactação</strong> selecionando a pasta{" "}
              <code className="bg-zinc-100 px-1 py-0.5 rounded">extension</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
