/**
 * Repositório: leitura e escrita de dados no banco.
 * Usado pelas páginas do servidor e pelas rotas de API.
 */

import { ensureDb, insert, query, queryOne, execute } from "./db";
import { computeQuote, resolveTier } from "./calc";
import type {
  AuditLog,
  BatchTier,
  Client,
  Material,
  Quote,
  QuoteComputation,
  Settings
} from "./types";

function toNumber<T extends Record<string, unknown>>(row: T): T {
  const copy: Record<string, unknown> = { ...row };
  for (const [key, value] of Object.entries(copy)) {
    if (typeof value === "string" && value !== "" && !Number.isNaN(Number(value))) {
      // Somente colunas numéricas (evita converter telefones ou nomes).
      if (
        /(price|cost|value|percent|hours|weight|stock|qty|cycles|watts|kwh|profit|total|discount|subtotal|unit|margin|special|sort|life)/.test(
          key
        )
      ) {
        copy[key] = Number(value);
      }
    }
  }
  return copy as T;
}

export async function getSettings(): Promise<Settings> {
  await ensureDb();
  const row = await queryOne<Settings>("SELECT * FROM settings ORDER BY id LIMIT 1");
  if (!row) throw new Error("Configurações não encontradas");
  return toNumber(row as unknown as Record<string, unknown>) as unknown as Settings;
}

export async function getTiers(): Promise<BatchTier[]> {
  await ensureDb();
  const rows = await query<BatchTier>(
    "SELECT * FROM batch_tiers ORDER BY min_qty ASC, sort_order ASC"
  );
  return rows.map((row) => toNumber(row as unknown as Record<string, unknown>) as unknown as BatchTier);
}

export async function listClients(search = ""): Promise<Client[]> {
  await ensureDb();
  const term = `%${search.trim().toLowerCase()}%`;
  return query<Client>(
    `SELECT * FROM clients
     WHERE ? = '%%' OR LOWER(name) LIKE ? OR LOWER(COALESCE(phone,'')) LIKE ?
       OR LOWER(COALESCE(email,'')) LIKE ? OR LOWER(COALESCE(company,'')) LIKE ?
     ORDER BY LOWER(name) ASC`,
    [term, term, term, term, term]
  );
}

export async function getClient(id: number): Promise<Client | null> {
  await ensureDb();
  return queryOne<Client>("SELECT * FROM clients WHERE id = ?", [id]);
}

export async function listMaterials(): Promise<Material[]> {
  await ensureDb();
  // LOWER() funciona nos dois bancos (COLLATE NOCASE é exclusivo do SQLite).
  return query<Material>("SELECT * FROM materials ORDER BY LOWER(name) ASC, LOWER(color) ASC");
}

export async function listQuotes(options?: {
  search?: string;
  clientId?: number;
  limit?: number;
}): Promise<Quote[]> {
  await ensureDb();
  const search = (options?.search ?? "").trim().toLowerCase();
  const params: unknown[] = [];
  let sql = `SELECT * FROM quotes WHERE 1 = 1`;

  if (options?.clientId) {
    sql += " AND client_id = ?";
    params.push(options.clientId);
  }

  if (search) {
    sql += ` AND (LOWER(project_name) LIKE ? OR LOWER(client_name) LIKE ?
             OR LOWER(COALESCE(client_phone,'')) LIKE ? OR LOWER(created_at) LIKE ?)`;
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  sql += " ORDER BY created_at DESC, id DESC";
  if (options?.limit) {
    sql += " LIMIT ?";
    params.push(options.limit);
  }

  return query<Quote>(sql, params);
}

export async function getQuote(id: number): Promise<Quote | null> {
  await ensureDb();
  const quote = await queryOne<Quote>("SELECT * FROM quotes WHERE id = ?", [id]);
  if (!quote) return null;
  // Normaliza campos numéricos vindos do PostgreSQL.
  return toNumber(quote as unknown as Record<string, unknown>) as unknown as Quote;
}

export type QuotePayload = {
  client_id: number | null;
  client_name: string;
  client_phone: string;
  project_name: string;
  notes?: string;
  material_id: number | null;
  material_label: string;
  weight_g: number;
  hours: number;
  quantity: number;
  pieces_per_plate: number;
  material_price_per_kg: number;
};

/**
 * Recalcula o orçamento no servidor (nunca confia em totais do cliente),
 * salva e devolve o registro criado.
 */
export async function createQuote(payload: QuotePayload) {
  const settings = await getSettings();
  const tiers = await getTiers();
  const calc = computeQuote(
    {
      weight_g: payload.weight_g,
      hours: payload.hours,
      quantity: payload.quantity,
      pieces_per_plate: payload.pieces_per_plate,
      material_price_per_kg: payload.material_price_per_kg
    },
    settings,
    tiers
  );

  const id = await insert(
    `INSERT INTO quotes (client_id, client_name, client_phone, project_name, notes, material_id,
      material_label, weight_g, hours, quantity, pieces_per_plate, cycles, material_cost, energy_cost,
      wear_cost, maintenance_cost, labor_cost, unit_cost, profit_unit, unit_price, subtotal,
      discount_percent, discount_value, total, special_batch, energy_kwh, created_at, pdf_generated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      payload.client_id,
      payload.client_name,
      payload.client_phone,
      payload.project_name,
      payload.notes ?? null,
      payload.material_id,
      payload.material_label,
      payload.weight_g,
      payload.hours,
      payload.quantity,
      payload.pieces_per_plate,
      calc.cycles,
      calc.materialCost,
      calc.energyCost,
      calc.wearCost,
      calc.maintenanceCost,
      calc.laborCost,
      calc.unitCost,
      calc.profitUnit,
      calc.unitPrice,
      calc.subtotal,
      calc.discountPercent,
      calc.discountValue,
      calc.total,
      calc.specialBatch ? 1 : 0,
      calc.energyKwh,
      new Date().toISOString(),
      null
    ]
  );

  return { id, calc };
}

export async function updateQuote(id: number, payload: QuotePayload) {
  const settings = await getSettings();
  const tiers = await getTiers();
  const calc = computeQuote(
    {
      weight_g: payload.weight_g,
      hours: payload.hours,
      quantity: payload.quantity,
      pieces_per_plate: payload.pieces_per_plate,
      material_price_per_kg: payload.material_price_per_kg
    },
    settings,
    tiers
  );

  await execute(
    `UPDATE quotes SET client_id = ?, client_name = ?, client_phone = ?, project_name = ?, notes = ?,
      material_id = ?, material_label = ?, weight_g = ?, hours = ?, quantity = ?, pieces_per_plate = ?,
      cycles = ?, material_cost = ?, energy_cost = ?, wear_cost = ?, maintenance_cost = ?, labor_cost = ?,
      unit_cost = ?, profit_unit = ?, unit_price = ?, subtotal = ?, discount_percent = ?,
      discount_value = ?, total = ?, special_batch = ?, energy_kwh = ?
     WHERE id = ?`,
    [
      payload.client_id,
      payload.client_name,
      payload.client_phone,
      payload.project_name,
      payload.notes ?? null,
      payload.material_id,
      payload.material_label,
      payload.weight_g,
      payload.hours,
      payload.quantity,
      payload.pieces_per_plate,
      calc.cycles,
      calc.materialCost,
      calc.energyCost,
      calc.wearCost,
      calc.maintenanceCost,
      calc.laborCost,
      calc.unitCost,
      calc.profitUnit,
      calc.unitPrice,
      calc.subtotal,
      calc.discountPercent,
      calc.discountValue,
      calc.total,
      calc.specialBatch ? 1 : 0,
      calc.energyKwh,
      id
    ]
  );

  return { id, calc };
}

export type DashboardData = {
  quotesCount: number;
  revenue: number;
  profit: number;
  hours: number;
  energyKwh: number;
  clientsCount: number;
  materialsCount: number;
  avgTicket: number;
  topMaterial: { label: string; count: number } | null;
  recentQuotes: Quote[];
  batchesCount: number;
};

export async function getDashboard(): Promise<DashboardData> {
  await ensureDb();
  const [settings, quotes, clients, materials] = await Promise.all([
    getSettings(),
    listQuotes(),
    listClients(),
    listMaterials()
  ]);

  const normalized = quotes.map(
    (quote) => toNumber(quote as unknown as Record<string, unknown>) as unknown as Quote
  );

  let revenue = 0;
  let profit = 0;
  let hours = 0;
  let energyKwh = 0;
  let batchesCount = 0;
  const materialUsage = new Map<string, number>();

  for (const quote of normalized) {
    revenue += quote.total || 0;
    profit += (quote.profit_unit || 0) * (quote.quantity || 0) - (quote.discount_value || 0);
    const cycles = quote.cycles || 1;
    hours += cycles * (quote.hours || 0);
    energyKwh += (cycles * (quote.hours || 0) * settings.printer_watts) / 1000;
    if (quote.discount_percent > 0 || quote.special_batch) batchesCount += 1;
    const label = quote.material_label || "—";
    materialUsage.set(label, (materialUsage.get(label) ?? 0) + 1);
  }

  let topMaterial: DashboardData["topMaterial"] = null;
  for (const [label, count] of materialUsage) {
    if (!topMaterial || count > topMaterial.count) topMaterial = { label, count };
  }

  return {
    quotesCount: normalized.length,
    revenue,
    profit,
    hours,
    energyKwh,
    clientsCount: clients.length,
    materialsCount: materials.length,
    avgTicket: normalized.length ? revenue / normalized.length : 0,
    topMaterial,
    recentQuotes: normalized.slice(0, 6),
    batchesCount
  };
}

/** Snapshot do banco para backup em JSON. */
export async function exportBackup() {
  await ensureDb();
  const [settings, tiers, clients, materials, quotes, logs] = await Promise.all([
    getSettings(),
    getTiers(),
    listClients(),
    listMaterials(),
    listQuotes(),
    query("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 5000")
  ]);

  return {
    app: "Fábrica Da Impressão 3D",
    version: 1,
    generated_at: new Date().toISOString(),
    settings: { ...settings, admin_password_hash: undefined },
    tiers,
    clients,
    materials,
    quotes,
    logs
  };
}

/** Nome legível do banco em uso (exibido nas configurações). */
export function dbMode(): string {
  return /^postgres(ql)?:\/\//i.test(process.env.DATABASE_URL ?? "")
    ? "PostgreSQL (produção)"
    : "SQLite (local)";
}

/** Últimas ações registradas no log de auditoria. */
export async function recentLogs(limit = 20): Promise<AuditLog[]> {
  await ensureDb();
  return query<AuditLog>("SELECT * FROM audit_logs ORDER BY created_at DESC, id DESC LIMIT ?", [limit]);
}

export { resolveTier };
export type { QuoteComputation };
