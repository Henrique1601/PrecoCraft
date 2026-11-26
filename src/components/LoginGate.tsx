"use client";

import { useState } from "react";
import { Lock } from "lucide-react";

export function LoginGate() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Senha incorreta.");
        return;
      }
      window.location.reload();
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white border border-zinc-200 rounded-xl shadow-sm p-6 space-y-4"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-zinc-900">
              PrecoCraft
            </h1>
            <p className="text-xs text-zinc-500">
              Digite sua senha pessoal para acessar
            </p>
          </div>
        </div>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha de acesso"
          autoFocus
          required
          className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />

        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 text-sm font-medium bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 disabled:opacity-50 transition-colors"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
