# ⚠️ PrecoCraft — Riscos, Armadilhas & Gotchas (`GOTCHAS.md`)

> Lições preventivas e armadilhas mapeadas para evitar retrabalho e promessas irreais.
> Voltar para [[INDEX.md]] | Ver [[DECISIONS.md]].

---

## 1. Bloqueio Anti-Bot Agressivo (TikTok Shop, Amazon BR e similares)

- **Problema:** Marketplaces como **TikTok Shop** e **Amazon BR** aplicam proteções agressivas contra scraping server-side (CAPTCHA, TLS fingerprinting, bloqueio de IP de datacenter e *login wall*).
- **Regra de Ouro:** **Nunca prometer 100% de scraping automático server-side** para essas plataformas.
- **Mitigação:** Garantir sempre o fallback de captura via **Bookmarklet / Extensão de navegador de 1 clique** (conforme [[DECISIONS.md#adr-002-estratégia-híbrida-de-coleta|ADR-002]]) e edição manual rápida na tabela.

---

## 2. Preço Anunciado ≠ Preço Final Real

- **Problema:** O preço exibido na vitrine ou capturado automaticamente raramente reflete o custo real de aquisição. Frete, cupons específicos da loja/plataforma, moedas (ex: AliExpress/Shopee) e cashback alteram frequentemente qual loja oferece o menor valor efetivo.
- **Regra de Ouro:** O vencedor da comparação (destaque verde na tabela) deve ser calculado **exclusivamente pelo Preço Final Real** (`preço + frete - cupom/cashback`), nunca apenas pelo preço base anunciado (conforme [[DECISIONS.md#adr-003-ux-anti-poluição-e-cálculo-de-preço-real|ADR-003]]).
- **Mitigação:** Manter os componentes do cálculo (preço base, frete, cupom, cashback) visíveis e editáveis de forma granular por linha/oferta.
