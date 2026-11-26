import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { refreshOfferFromStore } from "@/lib/connectors";
import {
  calculateFinalPrice,
  formatBRL,
  STORE_META,
  type StoreType,
} from "@/lib/pricing";

function isAuthorizedCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET || process.env.APP_PASSWORD;
  if (!secret) return true;
  const authHeader = req.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;
  const { searchParams } = new URL(req.url);
  return searchParams.get("secret") === secret;
}

async function sendTelegramAlert(message: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "HTML",
        }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const products = await prisma.product.findMany({
    where: { purchased: false },
    include: { offers: true },
  });

  let checked = 0;
  let updated = 0;
  const targetHits: string[] = [];

  for (const product of products) {
    for (const offer of product.offers) {
      const store = offer.store as StoreType;
      if (!STORE_META[store].autoRefresh) continue;
      checked++;

      const res = await refreshOfferFromStore(store, offer.url);
      if (res.ok && res.basePrice !== undefined) {
        const oldBase = Number(offer.basePrice);
        const oldLowest =
          offer.lowestPriceSeen !== null ? Number(offer.lowestPriceSeen) : oldBase;
        const nextLowest = Math.min(oldLowest, res.basePrice);
        const priceChanged = Math.abs(oldBase - res.basePrice) >= 0.01;
        await prisma.storeOffer.update({
          where: { id: offer.id },
          data: {
            ...(priceChanged ? { previousBasePrice: oldBase } : {}),
            lowestPriceSeen: nextLowest,
            basePrice: res.basePrice,
            inStock: res.inStock ?? true,
            sourceMode: "AUTO",
            lastCheckedAt: new Date(),
          },
        });
        updated++;

        const finalPrice = calculateFinalPrice({
          basePrice: res.basePrice,
          shippingCost: Number(offer.shippingCost),
          discountAmount: Number(offer.discountAmount),
          cashbackAmount: Number(offer.cashbackAmount),
        });
        const target =
          product.targetPrice !== null ? Number(product.targetPrice) : null;
        if (target !== null && finalPrice <= target && (res.inStock ?? true)) {
          targetHits.push(
            `• <b>${product.name}</b> (${STORE_META[store].label}): ${formatBRL(
              finalPrice
            )} (meta: ${formatBRL(target)})`
          );
        }
      }
    }
  }

  let telegramSent = false;
  if (targetHits.length > 0) {
    telegramSent = await sendTelegramAlert(
      `🎯 <b>PrecoCraft — Meta de Preço Atingida!</b>\n\n${targetHits.join(
        "\n"
      )}`
    );
  }

  return NextResponse.json({
    ok: true,
    checked,
    updated,
    targetHitsCount: targetHits.length,
    telegramSent,
  });
}
