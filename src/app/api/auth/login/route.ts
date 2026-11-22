import { cookies } from "next/headers";
import { login, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth";
import { logAction } from "@/lib/db";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
  };

  if (!body.email || !body.password) {
    return Response.json({ error: "Informe e-mail e senha." }, { status: 400 });
  }

  const result = await login(body.email, body.password);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 401 });
  }

  (await cookies()).set(SESSION_COOKIE, result.token, sessionCookieOptions());
  await logAction("login", "session", null, `Acesso ao painel: ${body.email}`);
  return Response.json({ ok: true });
}
