# 📐 PrecoCraft — Decisões Arquiteturais (`DECISIONS.md`)

> Registro de Architecture Decision Records (ADRs) alinhados desde a concepção do projeto.
> Voltar para [[INDEX.md]].

---

## ADR-001: Stack Tecnológica

- **Status:** Aprovado
- **Contexto:** O usuário precisa acessar o comparador tanto no PC quanto no celular, com sincronização persistente na nuvem e custo inicial zero.
- **Decisão:** Construir um **Web App na nuvem** utilizando **Next.js (App Router)** conectado a um banco **PostgreSQL gratuito** (ex: Neon ou Supabase) gerenciado via **Prisma** ou **Drizzle ORM**.
- **Consequências:**
  - Acesso multi-dispositivo imediato via navegador (responsivo para desktop e mobile).
  - Deploy simples (ex: Vercel) com suporte nativo a Server Actions / Route Handlers para coleta server-side quando aplicável.
  - Necessidade de respeitar limites de tier gratuito (conexões serverless, pooling e tamanho de armazenamento).

---

## ADR-002: Estratégia Híbrida de Coleta

- **Status:** Aprovado
- **Contexto:** Lojas de e-commerce têm níveis muito distintos de abertura técnica e proteção anti-bot. Depender de um único método (apenas scraping server-side) falharia em plataformas fechadas.
- **Decisão:** Adotar uma abordagem híbrida em 3 camadas:
  1. **(a) Busca / Atualização Automática (API/JSON):** Priorizar integrações onde há API oficial ou endpoints JSON acessíveis (ex: Mercado Livre API, KaBuM).
  2. **(b) Colagem de Link Específico (Extração Server-Side):** Permitir que o usuário cole a URL direta de um produto para extração automática no servidor quando a loja não bloquear a requisição.
  3. **(c) Bookmarklet / Extensão de Navegador (1-clique):** Ferramenta client-side para capturar título, preço e URL diretamente da aba já aberta e autenticada pelo usuário, contornando lojas com anti-bot pesado (ex: TikTok Shop, Amazon, AliExpress).
- **Consequências:**
  - Alta resiliência operacional sem prometer automação impossível.
  - Experiência fluida mesmo nos marketplaces mais restritivos.

---

## ADR-003: UX Anti-Poluição e Cálculo de Preço Real

- **Status:** Aprovado
- **Contexto:** Comparadores tradicionais costumam ser poluídos por anúncios, banners, cards gigantes e preços enganosos que ignoram frete e descontos.
- **Decisão:**
  - Foco em **tabela comparativa limpa estilo Excel**, priorizando escaneabilidade e densidade de informação útil.
  - **Menor preço final destacado em verde** para identificação visual instantânea do vencedor.
  - Cálculo explícito de **preço final real**:
    $$\text{Preço Final} = \text{Preço Base} + \text{Frete} - (\text{Cupom} + \text{Cashback})$$
  - Organização dos itens comparados por **listas / categorias**.
- **Consequências:**
  - Interface rápida, objetiva e orientada à decisão de compra.
  - Suporte obrigatório a campos editáveis/ajustáveis de frete, cupom e cashback por oferta.
