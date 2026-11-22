import { isAuthenticated, unauthorized } from "@/lib/auth";
import { insert, logAction } from "@/lib/db";
import { listClients } from "@/lib/repo";

export async function GET(request: Request) {
  if (!(await isAuthenticated())) return unauthorized();
  const search = new URL(request.url).searchParams.get("q") ?? "";
  return Response.json(await listClients(search));
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) return unauthorized();
  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    phone?: string;
    email?: string;
    company?: string;
  };

  const name = (body.name ?? "").trim();
  const phone = (body.phone ?? "").trim();

  if (!name) return Response.json({ error: "Informe o nome do cliente." }, { status: 400 });
  if (!phone) return Response.json({ error: "Informe o celular / WhatsApp." }, { status: 400 });

  const id = await insert(
    "INSERT INTO clients (name, phone, email, company, created_at) VALUES (?,?,?,?,?)",
    [name, phone, (body.email ?? "").trim() || null, (body.company ?? "").trim() || null, new Date().toISOString()]
  );
  await logAction("create", "client", id, name);

  return Response.json({ id }, { status: 201 });
}
