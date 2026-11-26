import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extractMlItemId } from "./mercado-livre.ts";
import { parseKabumHtml } from "./kabum.ts";

describe("extractMlItemId", () => {
  it("extracts MLB id from Mercado Livre product URL", () => {
    assert.equal(
      extractMlItemId(
        "https://produto.mercadolivre.com.br/MLB-3847291045-mouse-logitech-_JM"
      ),
      "MLB3847291045"
    );
  });

  it("returns null when no MLB id is present", () => {
    assert.equal(extractMlItemId("https://www.mercadolivre.com.br/"), null);
  });
});

describe("parseKabumHtml", () => {
  it("extracts price and title from JSON-LD", () => {
    const html = `
      <html><head>
        <script type="application/ld+json">
          {"@type":"Product","name":"SSD NVMe 1TB","offers":{"price":399.9,"availability":"https://schema.org/InStock"}}
        </script>
      </head></html>
    `;
    const res = parseKabumHtml(html);
    assert.equal(res.ok, true);
    assert.equal(res.basePrice, 399.9);
    assert.equal(res.titleSnapshot, "SSD NVMe 1TB");
    assert.equal(res.inStock, true);
  });

  it("extracts price from __NEXT_DATA__ when JSON-LD is absent", () => {
    const html = `
      <html><body>
        <script id="__NEXT_DATA__" type="application/json">
          {"props":{"pageProps":{"product":{"name":"Monitor 27","priceWithDiscount":1299.5,"available":true}}}}
        </script>
      </body></html>
    `;
    const res = parseKabumHtml(html);
    assert.equal(res.ok, true);
    assert.equal(res.basePrice, 1299.5);
    assert.equal(res.titleSnapshot, "Monitor 27");
  });
});
