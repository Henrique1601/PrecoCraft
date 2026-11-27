# Changelog

Todas as mudanças notáveis do **PrecoCraft** serão documentadas neste arquivo.

## [0.1.0] - 2026-11-26

### Added
- Tabela comparativa estilo Excel com cálculo de preço final real (`base + frete - cupom - cashback`) e destaque verde no menor preço.
- Gestão de listas, produtos, múltiplas ofertas/vendedores por loja e status de comprado.
- Conectores automáticos para Mercado Livre (API + busca) e KaBuM! (JSON-LD / `__NEXT_DATA__`).
- Bookmarklet de 1 clique e página `/quick-add` com suporte a PWA Web Share Target.
- Preço alvo ("Na meta!"), seta de variação (`↓`/`↑`), mínimo histórico (`lowestPriceSeen`), modo Pix vs. Cartão e simulador de loja única.
- Importação/exportação CSV e endpoint `/api/cron/refresh` com alerta opcional no Telegram.
