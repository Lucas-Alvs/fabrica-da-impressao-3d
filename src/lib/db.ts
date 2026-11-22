/**
 * Camada de acesso ao banco de dados.
 *
 * O sistema funciona com dois bancos, escolhidos pela variável DATABASE_URL:
 *  - `sqlite:./data/fabrica.sqlite` → desenvolvimento (SQLite embutido no Node.js 22.5+)
 *  - `postgresql://...`             → produção (Vercel/Neon/Supabase/Railway)
 *
 * As consultas usam o marcador `?`; para o PostgreSQL ele é convertido
 * automaticamente para `$1, $2, ...`.
 */

export type Row = Record<string, unknown>;

type PgResult = { rows: Row[] };
type PgClient = {
  query: (text: string, values?: unknown[]) => Promise<PgResult>;
  release: () => void;
};
type PgPool = {
  query: (text: string, values?: unknown[]) => Promise<PgResult>;
  connect: () => Promise<PgClient>;
};
type SqliteDb = {
  exec: (sql: string) => void;
  prepare: (sql: string) => {
    all: (...params: unknown[]) => Row[];
    get: (...params: unknown[]) => Row | undefined;
    run: (...params: unknown[]) => { changes: number | bigint; lastInsertRowid: number | bigint };
  };
};

let pgPool: PgPool | null = null;
let sqlite: SqliteDb | null = null;
let ready: Promise<void> | null = null;

export function isPostgres(): boolean {
  return /^postgres(ql)?:\/\//i.test(process.env.DATABASE_URL ?? "");
}

async function getPg(): Promise<PgPool> {
  if (!pgPool) {
    const { Pool } = await import("pg");
    const connectionString = process.env.DATABASE_URL as string;
    const needsSsl = !/localhost|127\.0\.0\.1/.test(connectionString);
    pgPool = new Pool({
      connectionString,
      max: 5,
      ssl: needsSsl ? { rejectUnauthorized: false } : undefined
    }) as unknown as PgPool;
  }
  return pgPool;
}

async function getSqlite(): Promise<SqliteDb> {
  if (!sqlite) {
    const { DatabaseSync } = await import("node:sqlite");
    const url = process.env.DATABASE_URL ?? "sqlite:./data/fabrica.sqlite";
    const file = url.replace(/^sqlite:/, "");
    const fs = await import("node:fs");
    const path = await import("node:path");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const db = new DatabaseSync(file);
    db.exec("PRAGMA journal_mode = WAL;");
    sqlite = db as unknown as SqliteDb;
  }
  return sqlite;
}

/** Converte `?` em `$1..$n` para o driver do PostgreSQL. */
function toPg(sql: string): string {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

export async function query<T = Row>(sql: string, params: unknown[] = []): Promise<T[]> {
  if (isPostgres()) {
    const pool = await getPg();
    const res = await pool.query(toPg(sql), params as unknown[]);
    return res.rows as T[];
  }
  const db = await getSqlite();
  // O driver do SQLite devolve objetos com protótipo nulo; copiamos para objetos
  // simples, que podem ser enviados do servidor para componentes de cliente.
  return db
    .prepare(sql)
    .all(...params)
    .map((row) => ({ ...row })) as T[];
}

export async function queryOne<T = Row>(sql: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

/** Executa INSERT/UPDATE/DELETE. Retorna o id gerado (quando solicitado). */
export async function execute(sql: string, params: unknown[] = []): Promise<number | null> {
  if (isPostgres()) {
    const pool = await getPg();
    const res = await pool.query(toPg(sql), params);
    return (res.rows[0]?.id as number) ?? null;
  }
  const db = await getSqlite();
  const info = db.prepare(sql).run(...params);
  return Number(info.lastInsertRowid) || null;
}

/** INSERT que devolve o id criado nos dois bancos. */
export async function insert(sql: string, params: unknown[] = []): Promise<number> {
  if (isPostgres()) {
    const id = await execute(`${sql} RETURNING id`, params);
    return Number(id);
  }
  const id = await execute(sql, params);
  return Number(id);
}

const ID_SQLITE = "INTEGER PRIMARY KEY AUTOINCREMENT";
const ID_PG = "SERIAL PRIMARY KEY";

function schema(): string[] {
  const id = isPostgres() ? ID_PG : ID_SQLITE;
  return [
    `CREATE TABLE IF NOT EXISTS settings (
      id ${id},
      kwh_price REAL NOT NULL DEFAULT 0.75,
      printer_name TEXT NOT NULL DEFAULT 'Bambu Lab A1 Mini',
      printer_value REAL NOT NULL DEFAULT 2000,
      printer_watts REAL NOT NULL DEFAULT 95,
      printer_life_hours REAL NOT NULL DEFAULT 10000,
      maintenance_per_hour REAL NOT NULL DEFAULT 0.5,
      labor_mode TEXT NOT NULL DEFAULT 'hourly',
      labor_hourly REAL NOT NULL DEFAULT 25,
      labor_percent REAL NOT NULL DEFAULT 20,
      profit_mode TEXT NOT NULL DEFAULT 'percent',
      profit_percent REAL NOT NULL DEFAULT 40,
      profit_fixed REAL NOT NULL DEFAULT 10,
      min_margin_percent REAL NOT NULL DEFAULT 20,
      company_name TEXT NOT NULL DEFAULT 'Fábrica Da Impressão 3D',
      company_phone TEXT NOT NULL DEFAULT '',
      company_email TEXT NOT NULL DEFAULT '',
      company_site TEXT NOT NULL DEFAULT '',
      quote_valid_days INTEGER NOT NULL DEFAULT 7,
      admin_email TEXT NOT NULL DEFAULT 'admin@fabrica3d.com',
      admin_password_hash TEXT,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS batch_tiers (
      id ${id},
      min_qty INTEGER NOT NULL,
      max_qty INTEGER,
      discount_percent REAL NOT NULL DEFAULT 0,
      special INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS clients (
      id ${id},
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      company TEXT,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS materials (
      id ${id},
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '',
      price_per_kg REAL NOT NULL DEFAULT 0,
      stock_g REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS quotes (
      id ${id},
      client_id INTEGER,
      client_name TEXT NOT NULL DEFAULT '',
      client_phone TEXT NOT NULL DEFAULT '',
      project_name TEXT NOT NULL,
      notes TEXT,
      material_id INTEGER,
      material_label TEXT NOT NULL DEFAULT '',
      weight_g REAL NOT NULL DEFAULT 0,
      hours REAL NOT NULL DEFAULT 0,
      quantity INTEGER NOT NULL DEFAULT 1,
      pieces_per_plate INTEGER NOT NULL DEFAULT 1,
      cycles INTEGER NOT NULL DEFAULT 1,
      material_cost REAL NOT NULL DEFAULT 0,
      energy_cost REAL NOT NULL DEFAULT 0,
      wear_cost REAL NOT NULL DEFAULT 0,
      maintenance_cost REAL NOT NULL DEFAULT 0,
      labor_cost REAL NOT NULL DEFAULT 0,
      unit_cost REAL NOT NULL DEFAULT 0,
      profit_unit REAL NOT NULL DEFAULT 0,
      unit_price REAL NOT NULL DEFAULT 0,
      subtotal REAL NOT NULL DEFAULT 0,
      discount_percent REAL NOT NULL DEFAULT 0,
      discount_value REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      special_batch INTEGER NOT NULL DEFAULT 0,
      energy_kwh REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      pdf_generated_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id ${id},
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id INTEGER,
      details TEXT,
      created_at TEXT NOT NULL
    )`
  ];
}

/** Cria as tabelas e insere os dados padrão (idempotente). */
export async function ensureDb(): Promise<void> {
  if (!ready) {
    ready = createSchemaAndSeed().catch((error) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}

/** Erros esperados quando duas instâncias criam o schema ao mesmo tempo. */
function isAlreadyThere(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /already exists|duplicate key value violates unique constraint/i.test(message);
}

async function createSchemaAndSeed(): Promise<void> {
  if (!isPostgres()) {
    const db = await getSqlite();
    for (const statement of schema()) db.exec(statement);
    await seedDefaults();
    return;
  }

  // Em produção (serverless) várias instâncias podem inicializar juntas.
  // O lock de sessão evita CREATE TABLE/seed duplicados; se o banco não
  // suportar advisory locks, seguimos sem ele.
  const pool = await getPg();
  const client = await pool.connect();
  let locked = false;
  try {
    try {
      await client.query("SELECT pg_advisory_lock(918273645)");
      locked = true;
    } catch {
      locked = false;
    }
    for (const statement of schema()) {
      try {
        await client.query(statement);
      } catch (error) {
        if (!isAlreadyThere(error)) throw error;
      }
    }
    await seedDefaults();
  } finally {
    if (locked) {
      await client.query("SELECT pg_advisory_unlock(918273645)").catch(() => undefined);
    }
    client.release();
  }
}

async function seedDefaults(): Promise<void> {
  const now = new Date().toISOString();

  const settings = await queryOne<{ n: number | string }>("SELECT COUNT(*) AS n FROM settings");
  if (!settings || Number(settings.n) === 0) {
    await insert(
      `INSERT INTO settings (kwh_price, printer_name, printer_value, printer_watts, printer_life_hours,
        maintenance_per_hour, labor_mode, labor_hourly, labor_percent, profit_mode, profit_percent,
        profit_fixed, min_margin_percent, company_name, company_phone, company_email, company_site,
        quote_valid_days, admin_email, admin_password_hash, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        0.75,
        "Bambu Lab A1 Mini",
        2000,
        95,
        10000,
        0.5,
        "hourly",
        25,
        20,
        "percent",
        40,
        10,
        20,
        "Fábrica Da Impressão 3D",
        "",
        "",
        "",
        7,
        process.env.ADMIN_EMAIL ?? "admin@fabrica3d.com",
        null,
        now
      ]
    );
  }

  const tiers = await queryOne<{ n: number | string }>("SELECT COUNT(*) AS n FROM batch_tiers");
  if (!tiers || Number(tiers.n) === 0) {
    const defaults: [number, number | null, number, number, number][] = [
      [1, 49, 0, 0, 1],
      [50, 99, 15, 0, 2],
      [100, 199, 20, 0, 3],
      [200, 499, 25, 0, 4],
      [500, null, 0, 1, 5]
    ];
    for (const [min, max, discount, special, order] of defaults) {
      await insert(
        "INSERT INTO batch_tiers (min_qty, max_qty, discount_percent, special, sort_order) VALUES (?,?,?,?,?)",
        [min, max, discount, special, order]
      );
    }
  }

  const materials = await queryOne<{ n: number | string }>("SELECT COUNT(*) AS n FROM materials");
  if (!materials || Number(materials.n) === 0) {
    const defaults: [string, string, number][] = [
      ["PLA", "Preto", 110],
      ["PETG", "Preto", 135],
      ["ABS", "Preto", 125],
      ["TPU", "Preto", 190],
      ["ASA", "Preto", 165],
      ["Outro", "—", 120]
    ];
    for (const [name, color, price] of defaults) {
      await insert(
        "INSERT INTO materials (name, color, price_per_kg, stock_g, created_at) VALUES (?,?,?,?,?)",
        [name, color, price, 1000, now]
      );
    }
  }
}

/** Registra uma alteração no log de auditoria. */
export async function logAction(
  action: string,
  entity: string,
  entityId: number | null,
  details?: string
): Promise<void> {
  try {
    await insert(
      "INSERT INTO audit_logs (action, entity, entity_id, details, created_at) VALUES (?,?,?,?,?)",
      [action, entity, entityId, details ?? null, new Date().toISOString()]
    );
  } catch {
    // A auditoria nunca deve derrubar a operação principal.
  }
}
