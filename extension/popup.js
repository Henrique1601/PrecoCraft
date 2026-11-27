const DEFAULT_URL = "https://precocraft.netlify.app";
const appUrlInput = document.getElementById("appUrl");
const priceInput = document.getElementById("priceInput");
const listSelect = document.getElementById("listSelect");
const productSelect = document.getElementById("productSelect");
const titleInput = document.getElementById("titleInput");
const saveDirectBtn = document.getElementById("saveDirectBtn");
const openTabBtn = document.getElementById("openTabBtn");
const statusEl = document.getElementById("status");

let capturedUrl = "";
let cachedLists = [];

function detectStore(rawUrl) {
  try {
    const h = new URL(rawUrl).hostname.toLowerCase();
    if (h.includes("mercadolivre.") || h.includes("mercadolibre.") || h === "meli.la") return "MERCADO_LIVRE";
    if (h.includes("amazon.") || h === "amzn.to" || h === "a.co") return "AMAZON";
    if (h.includes("aliexpress.")) return "ALIEXPRESS";
    if (h.includes("kabum.com.br")) return "KABUM";
    if (h.includes("tiktok.com")) return "TIKTOK_SHOP";
  } catch {
    // ignore
  }
  return "MERCADO_LIVRE";
}

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
    // ignore
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

function renderProductsForList(listId) {
  const list = cachedLists.find((l) => l.id === listId);
  productSelect.innerHTML = '<option value="__new__">+ Criar novo produto</option>';
  if (list && Array.isArray(list.products)) {
    for (const p of list.products) {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.name;
      productSelect.appendChild(opt);
    }
  }
}

async function init() {
  chrome.storage.sync.get(["precocraftUrl"], async (res) => {
    const baseUrl = (res.precocraftUrl || DEFAULT_URL).replace(/\/+$/, "");
    appUrlInput.value = baseUrl;

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: extractFromDom,
        });
        const info = results?.[0]?.result;
        if (info) {
          capturedUrl = info.url;
          titleInput.value = info.title || "";
          if (info.price) {
            priceInput.value = String(info.price).replace(",", ".");
          }
        }
      } catch {
        statusEl.textContent = "Não foi possível ler esta aba.";
      }
    }

    try {
      const listsRes = await fetch(`${baseUrl}/api/lists`, {
        credentials: "include",
      });
      if (listsRes.ok) {
        const data = await listsRes.json();
        cachedLists = data.lists || [];
        listSelect.innerHTML = "";
        for (const l of cachedLists) {
          const opt = document.createElement("option");
          opt.value = l.id;
          opt.textContent = l.name;
          listSelect.appendChild(opt);
        }
        if (cachedLists[0]) renderProductsForList(cachedLists[0].id);
      } else {
        statusEl.textContent = "Faça login no PrecoCraft ou use 'Abrir tela completa'.";
      }
    } catch {
      statusEl.textContent = "Offline ou URL inacessível.";
    }
  });
}

listSelect.addEventListener("change", () => {
  renderProductsForList(listSelect.value);
});

saveDirectBtn.addEventListener("click", async () => {
  const baseUrl = (appUrlInput.value || DEFAULT_URL).replace(/\/+$/, "");
  chrome.storage.sync.set({ precocraftUrl: baseUrl });

  const listId = listSelect.value;
  if (!listId || !capturedUrl) {
    statusEl.textContent = "Selecione uma lista ou use 'Abrir tela completa'.";
    return;
  }

  saveDirectBtn.disabled = true;
  statusEl.textContent = "Salvando...";
  const parsedPrice = Number(String(priceInput.value).replace(",", ".")) || 0;
  const store = detectStore(capturedUrl);

  try {
    let ok = false;
    if (productSelect.value === "__new__") {
      const r = await fetch(`${baseUrl}/api/products`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listId,
          name: titleInput.value.trim() || "Produto",
          initialOffer: {
            store,
            url: capturedUrl,
            titleSnapshot: titleInput.value.trim(),
            basePrice: parsedPrice,
            sourceMode: "BOOKMARKLET",
          },
        }),
      });
      ok = r.ok;
    } else {
      const r = await fetch(`${baseUrl}/api/offers`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: productSelect.value,
          store,
          url: capturedUrl,
          titleSnapshot: titleInput.value.trim(),
          basePrice: parsedPrice,
          sourceMode: "BOOKMARKLET",
        }),
      });
      ok = r.ok;
    }
    statusEl.textContent = ok
      ? "Salvo no PrecoCraft!"
      : "Erro ao salvar. Use 'Abrir tela completa'.";
  } catch {
    statusEl.textContent = "Erro de rede ao salvar.";
  } finally {
    saveDirectBtn.disabled = false;
  }
});

openTabBtn.addEventListener("click", () => {
  const baseUrl = (appUrlInput.value || DEFAULT_URL).replace(/\/+$/, "");
  chrome.storage.sync.set({ precocraftUrl: baseUrl });
  const target =
    `${baseUrl}/quick-add?url=${encodeURIComponent(capturedUrl)}` +
    `&title=${encodeURIComponent(titleInput.value)}` +
    `&price=${encodeURIComponent(priceInput.value)}`;
  chrome.tabs.create({ url: target });
});

init();
