import { isAuthenticated, unauthorized } from "@/lib/auth";
import { insert, logAction } from "@/lib/db";
import { listMaterials } from "@/lib/repo";

export async function GET() {
  if (!(await isAuthenticated())) return unauthorized();
  return Response.json(await listMaterials());
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) return unauthorized();
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
  if (!Number.isFinite(price) || price < 0) {
    return Response.json({ error: "Valor por Kg inválido." }, { status: 400 });
  }

  const id = await insert(
    "INSERT INTO materials (name, color, price_per_kg, stock_g, created_at) VALUES (?,?,?,?,?)",
    [name, (body.color ?? "").trim(), price, Number.isFinite(stock) ? stock : 0, new Date().toISOString()]
  );
  await logAction("create", "material", id, `${name} ${body.color ?? ""}`.trim());

  return Response.json({ id }, { status: 201 });
}
