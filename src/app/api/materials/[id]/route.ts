import { isAuthenticated, unauthorized } from "@/lib/auth";
import { execute, logAction, queryOne } from "@/lib/db";
import type { Material } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  if (!(await isAuthenticated())) return unauthorized();
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    color?: string;
    price_per_kg?: number | string;
    stock_g?: number | string;
  };

  const name = (body.name ?? "").trim();
  if (!name) return Response.json({ error: "Informe o nome do material." }, { status: 400 });

  const price = Number(body.price_per_kg ?? 0);
  const stock = Number(body.stock_g ?? 0);

  await execute("UPDATE materials SET name = ?, color = ?, price_per_kg = ?, stock_g = ? WHERE id = ?", [
    name,
    (body.color ?? "").trim(),
    Number.isFinite(price) ? price : 0,
    Number.isFinite(stock) ? stock : 0,
    Number(id)
  ]);
  await logAction("update", "material", Number(id), name);

  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Params) {
  if (!(await isAuthenticated())) return unauthorized();
  const { id } = await params;
  const material = await queryOne<Material>("SELECT * FROM materials WHERE id = ?", [Number(id)]);
  if (!material) return Response.json({ error: "Material não encontrado." }, { status: 404 });

  await execute("UPDATE quotes SET material_id = NULL WHERE material_id = ?", [Number(id)]);
  await execute("DELETE FROM materials WHERE id = ?", [Number(id)]);
  await logAction("delete", "material", Number(id), material.name);

  return Response.json({ ok: true });
}
