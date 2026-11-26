# 🧠 PrecoCraft — Segundo Cérebro (`INDEX.md`)

> Índice central da base de conhecimento do projeto **PrecoCraft**.

---

## 🗺️ Navegação Principal

- [[../PRD.md|PRD — Product Requirements Document]] *(documento de requisitos e escopo do produto)*
- [[DECISIONS.md|DECISIONS — Registro de Decisões Arquiteturais (ADRs)]]
- [[GOTCHAS.md|GOTCHAS — Riscos, Armadilhas e Limitações Conhecidas]]

---

## 📌 Resumo do Projeto

O **PrecoCraft** é uma aplicação web focada em comparação limpa e objetiva de preços reais entre múltiplas lojas (ex: Mercado Livre, KaBuM, Amazon BR, AliExpress, TikTok Shop), evitando poluição visual e calculando o **preço final real** (`preço + frete - cupom/cashback`).

### Decisões Ativas
- **ADR-001:** Web App em Next.js (App Router) + Postgres gratuito (Neon/Supabase) — ver [[DECISIONS.md#adr-001-stack-tecnológica|ADR-001]].
- **ADR-002:** Estratégia híbrida de coleta (API/JSON + extração por link + Bookmarklet/Extensão 1-clique) — ver [[DECISIONS.md#adr-002-estratégia-híbrida-de-coleta|ADR-002]].
- **ADR-003:** UX anti-poluição estilo planilha/Excel com destaque em verde no menor preço final — ver [[DECISIONS.md#adr-003-ux-anti-poluição-e-cálculo-de-preço-real|ADR-003]].

---

## ⚠️ Pontos de Atenção Imediata
- Bloqueios agressivos anti-bot (CAPTCHA/login wall) em **TikTok Shop** e **Amazon BR** — ver [[GOTCHAS.md]].
- Diferença crítica entre preço anunciado e preço final real — ver [[GOTCHAS.md]].
