import { isAuthenticated, unauthorized } from "@/lib/auth";
import { logAction } from "@/lib/db";
import { createQuote, listQuotes } from "@/lib/repo";
import { normalizeQuotePayload } from "@/lib/quote-input";

export async function GET(request: Request) {
  if (!(await isAuthenticated())) return unauthorized();
  const params = new URL(request.url).searchParams;
  const clientId = params.get("client_id");
  return Response.json(
    await listQuotes({
      search: params.get("q") ?? "",
      clientId: clientId ? Number(clientId) : undefined
    })
  );
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) return unauthorized();
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const parsed = normalizeQuotePayload(body);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });

  const { id, calc } = await createQuote(parsed.payload);
  await logAction("create", "quote", id, `${parsed.payload.project_name} — ${calc.total.toFixed(2)}`);

  return Response.json({ id, total: calc.total }, { status: 201 });
}
