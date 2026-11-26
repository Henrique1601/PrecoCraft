import type { StoreType } from "@/lib/pricing";
import { fetchKabumOffer } from "./kabum";
import {
  fetchMercadoLivreOffer,
  type ConnectorResult,
} from "./mercado-livre";

export type { ConnectorResult } from "./mercado-livre";

export async function refreshOfferFromStore(
  store: StoreType,
  url: string
): Promise<ConnectorResult> {
  if (!url) {
    return { ok: false, error: "URL da oferta não informada." };
  }

  switch (store) {
    case "MERCADO_LIVRE":
      return fetchMercadoLivreOffer(url);
    case "KABUM":
      return fetchKabumOffer(url);
    case "AMAZON":
    case "ALIEXPRESS":
    case "TIKTOK_SHOP":
      return {
        ok: false,
        error:
          "Esta loja bloqueia coleta automática no servidor. Use o Bookmarklet de 1 clique na aba do produto ou edite inline.",
      };
  }
}
