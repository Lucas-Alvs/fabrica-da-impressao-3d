import { isAuthenticated, unauthorized } from "@/lib/auth";
import { execute, insert, logAction } from "@/lib/db";
import { getQuote, updateQuote } from "@/lib/repo";
import { normalizeQuotePayload } from "@/lib/quote-input";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  if (!(await isAuthenticated())) return unauthorized();
  const { id } = await params;
  const quote = await getQuote(Number(id));
  if (!quote) return Response.json({ error: "Orçamento não encontrado." }, { status: 404 });
  return Response.json(quote);
}

export async function PUT(request: Request, { params }: Params) {
  if (!(await isAuthenticated())) return unauthorized();
  const { id } = await params;
  const existing = await getQuote(Number(id));
  if (!existing) return Response.json({ error: "Orçamento não encontrado." }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const parsed = normalizeQuotePayload(body);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });

  const result = await updateQuote(Number(id), parsed.payload);
  await logAction("update", "quote", Number(id), parsed.payload.project_name);

  return Response.json({ ok: true, total: result.calc.total });
}

export async function DELETE(_request: Request, { params }: Params) {
  if (!(await isAuthenticated())) return unauthorized();
  const { id } = await params;
  const existing = await getQuote(Number(id));
  if (!existing) return Response.json({ error: "Orçamento não encontrado." }, { status: 404 });

  await execute("DELETE FROM quotes WHERE id = ?", [Number(id)]);
  await logAction("delete", "quote", Number(id), existing.project_name);

  return Response.json({ ok: true });
}

/** Duplica o orçamento mantendo todos os dados (novo registro, data de hoje). */
export async function POST(_request: Request, { params }: Params) {
  if (!(await isAuthenticated())) return unauthorized();
  const { id } = await params;
  const existing = await getQuote(Number(id));
  if (!existing) return Response.json({ error: "Orçamento não encontrado." }, { status: 404 });

  const newId = await insert(
    `INSERT INTO quotes (client_id, client_name, client_phone, project_name, notes, material_id,
      material_label, weight_g, hours, quantity, pieces_per_plate, cycles, material_cost, energy_cost,
      wear_cost, maintenance_cost, labor_cost, unit_cost, profit_unit, unit_price, subtotal,
      discount_percent, discount_value, total, special_batch, energy_kwh, created_at, pdf_generated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NULL)`,
    [
      existing.client_id,
      existing.client_name,
      existing.client_phone,
      existing.project_name,
      existing.notes,
      existing.material_id,
      existing.material_label,
      existing.weight_g,
      existing.hours,
      existing.quantity,
      existing.pieces_per_plate,
      existing.cycles,
      existing.material_cost,
      existing.energy_cost,
      existing.wear_cost,
      existing.maintenance_cost,
      existing.labor_cost,
      existing.unit_cost,
      existing.profit_unit,
      existing.unit_price,
      existing.subtotal,
      existing.discount_percent,
      existing.discount_value,
      existing.total,
      existing.special_batch,
      existing.energy_kwh,
      new Date().toISOString()
    ]
  );
  await logAction("duplicate", "quote", newId, `Cópia de #${existing.id}`);

  return Response.json({ id: newId }, { status: 201 });
}
