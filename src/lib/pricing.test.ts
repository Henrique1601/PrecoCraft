import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateFinalPrice,
  calculateSavings,
  calculateSingleStoreTotals,
  detectStoreFromUrl,
  findBestOffer,
  formatRelativeAge,
  formatWhatsAppSummary,
  getBestOfferForStore,
  getPriceDelta,
  hasPriceDrop,
  sortProducts,
} from "./pricing.ts";
import { parseCsvProducts } from "./csv.ts";

describe("calculateFinalPrice", () => {
  it("computes base + shipping - discount - cashback", () => {
    const result = calculateFinalPrice({
      basePrice: 1000,
      shippingCost: 35.5,
      discountAmount: 100,
      cashbackAmount: 50,
    });
    assert.equal(result, 885.5);
  });

  it("never returns negative prices", () => {
    const result = calculateFinalPrice({
      basePrice: 50,
      shippingCost: 0,
      discountAmount: 80,
      cashbackAmount: 20,
    });
    assert.equal(result, 0);
  });
});

describe("findBestOffer", () => {
  it("picks the lowest finalPrice among in-stock offers", () => {
    const best = findBestOffer([
      {
        store: "MERCADO_LIVRE",
        basePrice: 500,
        shippingCost: 0,
        discountAmount: 0,
        cashbackAmount: 0,
        inStock: true,
      },
      {
        store: "AMAZON",
        basePrice: 520,
        shippingCost: 0,
        discountAmount: 50,
        cashbackAmount: 0,
        inStock: true,
      },
      {
        store: "KABUM",
        basePrice: 400,
        shippingCost: 0,
        discountAmount: 0,
        cashbackAmount: 0,
        inStock: false,
      },
    ]);
    assert.deepEqual(best, { bestStore: "AMAZON", bestPrice: 470 });
  });

  it("returns null for empty offers", () => {
    assert.equal(findBestOffer([]), null);
  });
});

describe("getBestOfferForStore & getPriceDelta", () => {
  it("picks cheapest seller within the same store", () => {
    const res = getBestOfferForStore(
      [
        { store: "TIKTOK_SHOP", basePrice: 120, inStock: true },
        { store: "TIKTOK_SHOP", basePrice: 95, shippingCost: 10, inStock: true },
      ],
      "TIKTOK_SHOP"
    );
    assert.ok(res);
    assert.equal(res.totalInStore, 2);
    assert.equal(res.best.basePrice, 95);
  });

  it("computes price delta when previousBasePrice differs", () => {
    assert.equal(getPriceDelta(180, 200), -20);
    assert.equal(getPriceDelta(215, 200), 15);
    assert.equal(getPriceDelta(200, 200), null);
    assert.equal(getPriceDelta(200, null), null);
  });
});

describe("detectStoreFromUrl", () => {
  it("detects all 5 supported marketplaces", () => {
    assert.equal(
      detectStoreFromUrl("https://produto.mercadolivre.com.br/MLB-123456"),
      "MERCADO_LIVRE"
    );
    assert.equal(
      detectStoreFromUrl("https://www.amazon.com.br/dp/B09V3KXJPB"),
      "AMAZON"
    );
    assert.equal(
      detectStoreFromUrl("https://pt.aliexpress.com/item/100500123.html"),
      "ALIEXPRESS"
    );
    assert.equal(
      detectStoreFromUrl("https://www.kabum.com.br/produto/12345/ssd"),
      "KABUM"
    );
    assert.equal(
      detectStoreFromUrl("https://www.tiktok.com/@loja/video/123"),
      "TIKTOK_SHOP"
    );
  });

  it("returns null for invalid or unknown URLs", () => {
    assert.equal(detectStoreFromUrl("not-a-url"), null);
    assert.equal(detectStoreFromUrl("https://example.com/item"), null);
  });
});

describe("parseCsvProducts", () => {
  it("parses semicolon-separated Excel CSV with headers", () => {
    const csv = `Produto;Observacao;Preco Alvo;URL;Preco
Mouse Logitech;Preto;350,00;https://www.kabum.com.br/produto/123;399,90
Teclado Mecânico;;200;;`;
    const rows = parseCsvProducts(csv);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].name, "Mouse Logitech");
    assert.equal(rows[0].targetPrice, 350);
    assert.equal(rows[0].store, "KABUM");
    assert.equal(rows[0].basePrice, 399.9);
    assert.equal(rows[1].name, "Teclado Mecânico");
    assert.equal(rows[1].targetPrice, 200);
  });
});

describe("payment mode, single-store totals & sorting", () => {
  it("uses installmentPrice when mode is installment", () => {
    const offer = { basePrice: 900, installmentPrice: 1000, shippingCost: 20 };
    assert.equal(calculateFinalPrice(offer, "cash"), 920);
    assert.equal(calculateFinalPrice(offer, "installment"), 1020);
  });

  it("summarizes single-store coverage and totals", () => {
    const totals = calculateSingleStoreTotals([
      {
        purchased: false,
        offers: [
          { store: "MERCADO_LIVRE", basePrice: 100 },
          { store: "AMAZON", basePrice: 120 },
        ],
      },
      {
        purchased: false,
        offers: [{ store: "MERCADO_LIVRE", basePrice: 200 }],
      },
    ]);
    assert.equal(totals[0].store, "MERCADO_LIVRE");
    assert.equal(totals[0].coveredCount, 2);
    assert.equal(totals[0].totalPrice, 300);
  });

  it("sorts target-hit products first when sortBy is target_first", () => {
    const sorted = sortProducts(
      [
        {
          targetPrice: 100,
          purchased: false,
          offers: [{ store: "AMAZON", basePrice: 150 }],
        },
        {
          targetPrice: 200,
          purchased: false,
          offers: [{ store: "KABUM", basePrice: 180 }],
        },
      ],
      "target_first"
    );
    assert.equal(sorted[0].targetPrice, 200);
  });

  it("calculates savings between cheapest and second cheapest offer", () => {
    const savings = calculateSavings([
      { store: "AMAZON", basePrice: 250, inStock: true },
      { store: "MERCADO_LIVRE", basePrice: 200, inStock: true },
      { store: "KABUM", basePrice: 300, inStock: true },
    ]);
    assert.equal(savings, 50);
    assert.equal(
      calculateSavings([{ store: "AMAZON", basePrice: 250, inStock: true }]),
      null
    );
  });

  it("formats relative age and flags stale prices >= 7 days", () => {
    const now = Date.UTC(2026, 10, 27, 12, 0, 0);
    assert.deepEqual(
      formatRelativeAge(new Date(now - 2 * 3600 * 1000).toISOString(), now),
      { label: "hoje", isStale: false }
    );
    assert.deepEqual(
      formatRelativeAge(new Date(now - 8 * 86400 * 1000).toISOString(), now),
      { label: "há 8d", isStale: true }
    );
  });

  it("detects price drops and builds WhatsApp summary", () => {
    assert.equal(
      hasPriceDrop([{ basePrice: 180, previousBasePrice: 200 }]),
      true
    );
    const summary = formatWhatsAppSummary("Setup PC", [
      {
        name: "Mouse",
        purchased: false,
        offers: [
          {
            store: "KABUM",
            basePrice: 200,
            url: "https://www.kabum.com.br/p/1",
          },
        ],
      },
    ]);
    assert.ok(summary.includes("*Setup PC*"));
    assert.ok(summary.includes("KaBuM!"));
  });
});
