import { NextResponse } from "next/server";
import { z } from "zod";
import {
  clearAuthCookie,
  isAuthEnabled,
  isAuthenticated,
  setAuthCookie,
  verifyPassword,
} from "@/lib/auth";

const loginSchema = z.object({
  password: z.string().min(1),
});

export async function GET() {
  return NextResponse.json({
    authEnabled: isAuthEnabled(),
    authenticated: await isAuthenticated(),
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Senha obrigatória." }, { status: 400 });
    }
    if (!verifyPassword(parsed.data.password)) {
      return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
    }
    await setAuthCookie();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }
}

export async function DELETE() {
  await clearAuthCookie();
  return NextResponse.json({ ok: true });
}
