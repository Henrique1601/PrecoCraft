import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateFinalPrice,
  detectStoreFromUrl,
  findBestOffer,
} from "./pricing.ts";

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
