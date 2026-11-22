import { isAuthenticated } from "@/lib/auth";
import { execute } from "@/lib/db";
import { buildQuotePdf } from "@/lib/pdf";
import { getQuote, getSettings } from "@/lib/repo";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  if (!(await isAuthenticated())) {
    return new Response("Não autorizado", { status: 401 });
  }

  const { id } = await params;
  const quote = await getQuote(Number(id));
  if (!quote) return new Response("Orçamento não encontrado", { status: 404 });

  const settings = await getSettings();
  const bytes = await buildQuotePdf(quote, settings);

  if (!quote.pdf_generated_at) {
    await execute("UPDATE quotes SET pdf_generated_at = ? WHERE id = ?", [
      new Date().toISOString(),
      quote.id
    ]);
  }

  const download = new URL(request.url).searchParams.get("download") === "1";
  const fileName = `orcamento-${String(quote.id).padStart(4, "0")}.pdf`;

  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${fileName}"`,
      "Cache-Control": "no-store"
    }
  });
}
