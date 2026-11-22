/**
 * Autenticação do painel administrativo.
 *
 * Sessão via cookie httpOnly assinado com HMAC-SHA256 (AUTH_SECRET).
 * A senha é armazenada como hash scrypt; se ainda não houver hash no banco,
 * usa a senha inicial de ADMIN_PASSWORD (e a grava no primeiro login).
 */

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { ensureDb, queryOne, execute } from "./db";
import type { Settings } from "./types";

export const SESSION_COOKIE = "fabrica_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 horas

function secret(): string {
  return process.env.AUTH_SECRET || "dev-secret-fabrica-3d-troque-em-producao";
}

function sign(value: string): string {
  return crypto.createHmac("sha256", secret()).update(value).digest("hex");
}

export function createToken(): string {
  const expires = Date.now() + SESSION_TTL_MS;
  const payload = `${expires}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const [expires, signature] = token.split(".");
  if (!expires || !signature) return false;
  if (Number(expires) < Date.now()) return false;
  const expected = sign(expires);
  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export function hashPassword(password: string): string {
  const salt = crypto.createHash("sha256").update(secret()).digest("hex").slice(0, 32);
  return crypto.scryptSync(password.normalize("NFKC"), salt, 64).toString("hex");
}

function verifyPassword(password: string, hash: string): boolean {
  const attempt = hashPassword(password);
  if (attempt.length !== hash.length) return false;
  return crypto.timingSafeEqual(Buffer.from(attempt), Buffer.from(hash));
}

/** Verifica as credenciais informadas e devolve o cookie a ser gravado. */
export async function login(
  email: string,
  password: string
): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  await ensureDb();
  const settings = await queryOne<Settings>("SELECT * FROM settings ORDER BY id LIMIT 1");
  if (!settings) return { ok: false, error: "Sistema ainda não configurado." };

  const expectedEmail = (process.env.ADMIN_EMAIL || settings.admin_email || "").trim().toLowerCase();
  if (email.trim().toLowerCase() !== expectedEmail) {
    return { ok: false, error: "E-mail ou senha inválidos." };
  }

  const storedHash = settings.admin_password_hash;
  if (storedHash) {
    if (!verifyPassword(password, storedHash)) {
      return { ok: false, error: "E-mail ou senha inválidos." };
    }
  } else {
    const initial = process.env.ADMIN_PASSWORD || "fabrica123";
    if (password !== initial) return { ok: false, error: "E-mail ou senha inválidos." };
    // Primeiro login: persiste o hash da senha inicial.
    await execute("UPDATE settings SET admin_password_hash = ? WHERE id = ?", [
      hashPassword(initial),
      settings.id
    ]);
  }

  return { ok: true, token: createToken() };
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000
  };
}

/** Sessão válida a partir dos cookies da requisição atual. */
export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return verifyToken(store.get(SESSION_COOKIE)?.value);
}

/** Resposta 401 para rotas de API protegidas. */
export function unauthorized() {
  return Response.json({ error: "Não autorizado" }, { status: 401 });
}

/** Altera a senha do administrador. */
export async function changePassword(currentPassword: string, newPassword: string) {
  await ensureDb();
  const settings = await queryOne<Settings>("SELECT * FROM settings ORDER BY id LIMIT 1");
  if (!settings) return { ok: false as const, error: "Sistema não configurado." };

  const valid = settings.admin_password_hash
    ? verifyPassword(currentPassword, settings.admin_password_hash)
    : currentPassword === (process.env.ADMIN_PASSWORD || "fabrica123");
  if (!valid) return { ok: false as const, error: "Senha atual incorreta." };
  if (newPassword.length < 6) {
    return { ok: false as const, error: "A nova senha precisa ter ao menos 6 caracteres." };
  }

  await execute("UPDATE settings SET admin_password_hash = ?, updated_at = ? WHERE id = ?", [
    hashPassword(newPassword),
    new Date().toISOString(),
    settings.id
  ]);
  return { ok: true as const };
}
