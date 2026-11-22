import { isAuthenticated, unauthorized } from "@/lib/auth";
import { execute, insert, logAction } from "@/lib/db";
import { getSettings, getTiers } from "@/lib/repo";
import type { Settings } from "@/lib/types";

export async function GET() {
  if (!(await isAuthenticated())) return unauthorized();
  const settings = await getSettings();
  const { admin_password_hash, ...safe } = settings;
  return Response.json({ settings: safe, hasPassword: Boolean(admin_password_hash), tiers: await getTiers() });
}

type TierInput = {
  min_qty: number;
  max_qty: number | null;
  discount_percent: number;
  special?: number | boolean;
};

const NUMERIC_FIELDS: (keyof Settings)[] = [
  "kwh_price",
  "printer_value",
  "printer_watts",
  "printer_life_hours",
  "maintenance_per_hour",
  "labor_hourly",
  "labor_percent",
  "profit_percent",
  "profit_fixed",
  "min_margin_percent",
  "quote_valid_days"
];

const TEXT_FIELDS: (keyof Settings)[] = [
  "printer_name",
  "labor_mode",
  "profit_mode",
  "company_name",
  "company_phone",
  "company_email",
  "company_site",
  "admin_email"
];

export async function PUT(request: Request) {
  if (!(await isAuthenticated())) return unauthorized();
  const body = (await request.json().catch(() => ({}))) as {
    settings?: Record<string, unknown>;
    tiers?: TierInput[];
  };

  const current = await getSettings();
  const isPg = /^postgres(ql)?:\/\//i.test(process.env.DATABASE_URL ?? "");

  if (body.settings) {
    const assignments: string[] = [];
    const values: unknown[] = [];

    for (const field of NUMERIC_FIELDS) {
      if (body.settings[field] === undefined) continue;
      const parsed = Number(body.settings[field]);
      if (!Number.isFinite(parsed) || parsed < 0) {
        return Response.json({ error: `Valor inválido para "${String(field)}".` }, { status: 400 });
      }
      assignments.push(`${String(field)} = ?`);
      values.push(parsed);
    }

    for (const field of TEXT_FIELDS) {
      if (body.settings[field] === undefined) continue;
      const raw = String(body.settings[field] ?? "").trim();
      if ((field === "labor_mode" && !["hourly", "percent"].includes(raw)) ||
          (field === "profit_mode" && !["percent", "fixed"].includes(raw))) {
        return Response.json({ error: `Valor inválido para "${String(field)}".` }, { status: 400 });
      }
      assignments.push(`${String(field)} = ?`);
      values.push(raw);
    }

    if (assignments.length) {
      assignments.push("updated_at = ?");
      values.push(new Date().toISOString());
      values.push(current.id);
      await execute(`UPDATE settings SET ${assignments.join(", ")} WHERE id = ?`, values);
      await logAction("update", "settings", current.id, "Configurações administrativas atualizadas");
    }
  }

  if (Array.isArray(body.tiers)) {
    const tiers = body.tiers
      .map((tier) => ({
        min_qty: Math.max(1, Math.floor(Number(tier.min_qty) || 0)),
        max_qty:
          tier.max_qty === null || tier.max_qty === undefined || String(tier.max_qty) === ""
            ? null
            : Math.floor(Number(tier.max_qty)),
        discount_percent: Math.max(0, Math.min(100, Number(tier.discount_percent) || 0)),
        special: tier.special ? 1 : 0
      }))
      .filter((tier) => tier.min_qty > 0)
      .sort((a, b) => a.min_qty - b.min_qty);

    if (!tiers.length) {
      return Response.json({ error: "Informe ao menos uma faixa de lote." }, { status: 400 });
    }

    await execute("DELETE FROM batch_tiers", []);
    let order = 1;
    for (const tier of tiers) {
      await insert(
        "INSERT INTO batch_tiers (min_qty, max_qty, discount_percent, special, sort_order) VALUES (?,?,?,?,?)",
        [tier.min_qty, tier.max_qty, tier.discount_percent, tier.special, order++]
      );
    }
    await logAction("update", "batch_tiers", null, `${tiers.length} faixas salvas (${isPg ? "postgres" : "sqlite"})`);
  }

  return Response.json({ ok: true });
}
