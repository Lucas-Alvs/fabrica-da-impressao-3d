import { isAuthenticated, unauthorized } from "@/lib/auth";
import { execute, logAction, queryOne } from "@/lib/db";
import type { Client } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  if (!(await isAuthenticated())) return unauthorized();
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    phone?: string;
    email?: string;
    company?: string;
  };

  const name = (body.name ?? "").trim();
  const phone = (body.phone ?? "").trim();
  if (!name || !phone) {
    return Response.json({ error: "Nome e telefone são obrigatórios." }, { status: 400 });
  }

  await execute("UPDATE clients SET name = ?, phone = ?, email = ?, company = ? WHERE id = ?", [
    name,
    phone,
    (body.email ?? "").trim() || null,
    (body.company ?? "").trim() || null,
    Number(id)
  ]);
  // Mantém o nome/telefone atualizados nos orçamentos do cliente.
  await execute("UPDATE quotes SET client_name = ?, client_phone = ? WHERE client_id = ?", [
    name,
    phone,
    Number(id)
  ]);
  await logAction("update", "client", Number(id), name);

  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Params) {
  if (!(await isAuthenticated())) return unauthorized();
  const { id } = await params;
  const client = await queryOne<Client>("SELECT * FROM clients WHERE id = ?", [Number(id)]);
  if (!client) return Response.json({ error: "Cliente não encontrado." }, { status: 404 });

  // Os orçamentos permanecem como histórico, apenas deixam de estar vinculados.
  await execute("UPDATE quotes SET client_id = NULL WHERE client_id = ?", [Number(id)]);
  await execute("DELETE FROM clients WHERE id = ?", [Number(id)]);
  await logAction("delete", "client", Number(id), client.name);

  return Response.json({ ok: true });
}
