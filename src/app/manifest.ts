import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PrecoCraft — Comparador Pessoal de Preços",
    short_name: "PrecoCraft",
    description:
      "Compare preços reais entre Mercado Livre, Amazon, AliExpress, KaBuM! e TikTok Shop sem poluição.",
    start_url: "/",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#059669",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
