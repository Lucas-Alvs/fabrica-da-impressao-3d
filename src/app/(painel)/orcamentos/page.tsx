import Link from "next/link";
import QuoteActions from "@/components/QuoteActions";
import { EmptyState, LinkButton, SectionCard } from "@/components/ui";
import { brl, dateBR, hoursLabel, num } from "@/lib/format";
import { getSettings, listQuotes } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function OrcamentosPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const [quotes, settings] = await Promise.all([listQuotes({ search: q }), getSettings()]);

  const totalValue = quotes.reduce((sum, quote) => sum + quote.total, 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand">Histórico</p>
          <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">Orçamentos</h1>
          <p className="mt-1 text-sm font-medium text-ink/50">
            {quotes.length} orçamento(s) • {brl(totalValue)} em valores finais
          </p>
        </div>
        <LinkButton href="/orcamentos/novo">+ Novo orçamento</LinkButton>
      </header>

      <SectionCard>
        <form className="mb-4 flex flex-col gap-2 sm:flex-row" action="/orcamentos">
          <input
            name="q"
            defaultValue={q}
            placeholder="Pesquisar por projeto, cliente, telefone ou data..."
            className="input flex-1"
          />
          <div className="flex gap-2">
            <button type="submit" className="btn-dark flex-1 sm:flex-none">
              Pesquisar
            </button>
            {q ? (
              <Link href="/orcamentos" className="btn-ghost">
                Limpar
              </Link>
            ) : null}
          </div>
        </form>

        {quotes.length === 0 ? (
          <EmptyState
            title={q ? "Nenhum orçamento encontrado" : "Seu histórico está vazio"}
            description={
              q
                ? "Tente outra palavra-chave ou limpe a pesquisa."
                : "Crie o primeiro orçamento para guardar clientes, valores e PDFs gerados."
            }
            action={<LinkButton href="/orcamentos/novo">Criar orçamento</LinkButton>}
          />
        ) : (
          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead className="table-head">
                <tr>
                  <th className="px-3 py-2.5">#</th>
                  <th className="px-3 py-2.5">Projeto</th>
                  <th className="px-3 py-2.5">Cliente</th>
                  <th className="px-3 py-2.5">Data</th>
                  <th className="px-3 py-2.5 text-right">Qtd</th>
                  <th className="px-3 py-2.5 text-right">Tempo</th>
                  <th className="px-3 py-2.5 text-right">Valor final</th>
                  <th className="px-3 py-2.5">Lote</th>
                  <th className="px-3 py-2.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((quote) => (
                  <tr key={quote.id} className="border-b border-ink/5 align-middle last:border-0 hover:bg-cloud/50">
                    <td className="px-3 py-2.5 font-mono text-[11px] text-ink/40">
                      {String(quote.id).padStart(4, "0")}
                    </td>
                    <td className="px-3 py-2.5 font-bold">
                      <Link href={`/orcamentos/${quote.id}`} className="hover:text-brand">
                        {quote.project_name}
                      </Link>
                      <p className="text-[11px] font-medium text-ink/40">{quote.material_label}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="font-semibold text-ink/70">{quote.client_name}</p>
                      <p className="text-[11px] text-ink/40">{quote.client_phone || "—"}</p>
                    </td>
                    <td className="px-3 py-2.5 text-ink/50">{dateBR(quote.created_at)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold">{quote.quantity}</td>
                    <td className="px-3 py-2.5 text-right text-ink/50">
                      {hoursLabel(quote.cycles * quote.hours)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-extrabold">{brl(quote.total)}</td>
                    <td className="px-3 py-2.5">
                      {quote.discount_percent > 0 || quote.special_batch ? (
                        <span className="badge bg-emerald-100 text-emerald-700">
                          {quote.special_batch ? "Especial" : `${num(quote.discount_percent, 0)}%`}
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-ink/30">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-end">
                        <QuoteActions quote={quote} companyName={settings.company_name} compact />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
