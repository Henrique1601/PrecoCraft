const DEFAULT_URL = "https://precocraft.netlify.app";
const appUrlInput = document.getElementById("appUrl");
const captureBtn = document.getElementById("captureBtn");
const statusEl = document.getElementById("status");

chrome.storage.sync.get(["precocraftUrl"], (res) => {
  appUrlInput.value = res.precocraftUrl || DEFAULT_URL;
});

function extractFromDom() {
  const url = location.href;
  const title = document.title;
  let price = "";

  try {
    const lds = document.querySelectorAll('script[type="application/ld+json"]');
    for (const ld of lds) {
      const data = JSON.parse(ld.textContent || "{}");
      const arr = Array.isArray(data) ? data : [data];
      for (const item of arr) {
        const offers = item && item.offers;
        if (offers) {
          const first = Array.isArray(offers) ? offers[0] : offers;
          if (first && (first.price || first.lowPrice)) {
            price = String(first.price || first.lowPrice);
            break;
          }
        }
      }
      if (price) break;
    }
  } catch {
    // ignore invalid JSON-LD
  }

  if (!price) {
    const meta = document.querySelector(
      'meta[property="product:price:amount"], meta[property="og:price:amount"]'
    );
    if (meta) price = meta.getAttribute("content") || "";
  }

  if (!price) {
    const selectors = [
      "#corePrice_feature_div .a-offscreen",
      ".a-price .a-offscreen",
      ".andes-money-amount__fraction",
      '[data-testid="price-value"]',
      "h4.finalPrice",
      '[class*="price"]',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent) {
        const txt = el.textContent.replace(/[^0-9.,]/g, "").trim();
        if (txt) {
          price = txt;
          break;
        }
      }
    }
  }

  return { url, title, price };
}

captureBtn.addEventListener("click", async () => {
  const baseUrl = (appUrlInput.value || DEFAULT_URL).replace(/\/+$/, "");
  chrome.storage.sync.set({ precocraftUrl: baseUrl });
  statusEl.textContent = "Lendo página...";

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) {
    statusEl.textContent = "Nenhuma aba ativa encontrada.";
    return;
  }

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: extractFromDom,
  });

  const info = results?.[0]?.result;
  if (!info) {
    statusEl.textContent = "Não foi possível ler esta página.";
    return;
  }

  const target =
    `${baseUrl}/quick-add?url=${encodeURIComponent(info.url)}` +
    `&title=${encodeURIComponent(info.title)}` +
    `&price=${encodeURIComponent(info.price)}`;
  chrome.tabs.create({ url: target });
});
