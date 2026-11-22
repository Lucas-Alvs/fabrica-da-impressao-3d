import Link from "next/link";
import ClientsManager from "@/components/ClientsManager";
import { SectionCard } from "@/components/ui";
import { listClients, listQuotes } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function ClientesPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const [clients, quotes] = await Promise.all([listClients(q), listQuotes()]);

  const stats: Record<number, { count: number; total: number; last: string | null }> = {};
  for (const quote of quotes) {
    if (!quote.client_id) continue;
    const current = stats[quote.client_id] ?? { count: 0, total: 0, last: null };
    current.count += 1;
    current.total += quote.total;
    if (!current.last || quote.created_at > current.last) current.last = quote.created_at;
    stats[quote.client_id] = current;
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-dark">Cadastro</p>
        <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">Clientes</h1>
        <p className="mt-1 text-sm font-medium text-ink/65">
          {clients.length} cliente(s) cadastrado(s) com histórico de orçamentos.
        </p>
      </header>

      <SectionCard>
        <form className="mb-4 flex flex-col gap-2 sm:flex-row" action="/clientes">
          <input
            name="q"
            defaultValue={q}
            placeholder="Pesquisar por nome, telefone, e-mail ou empresa..."
            className="input flex-1"
          />
          <div className="flex gap-2">
            <button type="submit" className="btn-dark flex-1 sm:flex-none">
              Pesquisar
            </button>
            {q ? (
              <Link href="/clientes" className="btn-ghost">
                Limpar
              </Link>
            ) : null}
          </div>
        </form>

        <ClientsManager clients={clients} quoteCounts={stats} searching={Boolean(q)} />
      </SectionCard>
    </div>
  );
}
