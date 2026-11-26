import crypto from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "precocraft_session";

function getSecret(): string {
  return process.env.APP_PASSWORD?.trim() ?? "";
}

function signToken(secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update("precocraft-authenticated")
    .digest("hex");
}

export function isAuthEnabled(): boolean {
  return getSecret().length > 0;
}

export function verifyPassword(input: string): boolean {
  const secret = getSecret();
  if (!secret) return true;
  const a = Buffer.from(input);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function isAuthenticated(): Promise<boolean> {
  const secret = getSecret();
  if (!secret) return true;
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const expected = signToken(secret);
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function setAuthCookie(): Promise<void> {
  const secret = getSecret();
  if (!secret) return;
  const jar = await cookies();
  jar.set(COOKIE_NAME, signToken(secret), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function clearAuthCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}
