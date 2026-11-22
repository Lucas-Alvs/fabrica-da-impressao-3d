import Link from "next/link";
import { notFound } from "next/navigation";
import QuoteActions from "@/components/QuoteActions";
import { EmptyState, LinkButton, SectionCard, StatCard } from "@/components/ui";
import { brl, dateBR, hoursLabel } from "@/lib/format";
import { getClient, getSettings, listQuotes } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function ClienteDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await getClient(Number(id));
  if (!client) notFound();

  const [quotes, settings] = await Promise.all([
    listQuotes({ clientId: client.id }),
    getSettings()
  ]);

  const total = quotes.reduce((sum, quote) => sum + quote.total, 0);
  const hours = quotes.reduce((sum, quote) => sum + quote.cycles * quote.hours, 0);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/clientes" className="text-xs font-bold text-ink/65 hover:text-brand-dark">
          ← Voltar para clientes
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold sm:text-3xl">{client.name}</h1>
            <p className="mt-1 text-sm font-medium text-ink/65">
              {client.phone}
              {client.email ? ` • ${client.email}` : ""}
              {client.company ? ` • ${client.company}` : ""}
            </p>
          </div>
          <LinkButton href={`/orcamentos/novo?cliente=${client.id}`}>
            + Novo orçamento para este cliente
          </LinkButton>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Orçamentos" value={String(quotes.length)} />
        <StatCard label="Total orçado" value={brl(total)} />
        <StatCard label="Ticket médio" value={brl(quotes.length ? total / quotes.length : 0)} />
        <StatCard label="Horas impressas" value={hoursLabel(hours)} />
      </div>

      <SectionCard title="Histórico de orçamentos" description="Todos os orçamentos deste cliente">
        {quotes.length === 0 ? (
          <EmptyState
            title="Nenhum orçamento para este cliente"
            description="Crie o primeiro orçamento e ele aparecerá automaticamente aqui."
            action={<LinkButton href={`/orcamentos/novo?cliente=${client.id}`}>Criar orçamento</LinkButton>}
          />
        ) : (
          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead className="table-head">
                <tr>
                  <th className="px-3 py-2.5">Projeto</th>
                  <th className="px-3 py-2.5">Data</th>
                  <th className="px-3 py-2.5 text-right">Qtd</th>
                  <th className="px-3 py-2.5 text-right">Valor</th>
                  <th className="px-3 py-2.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((quote) => (
                  <tr key={quote.id} className="border-b border-ink/5 last:border-0 hover:bg-cloud/50">
                    <td className="px-3 py-2.5 font-bold">
                      <Link href={`/orcamentos/${quote.id}`} className="hover:text-brand-dark">
                        {quote.project_name}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-ink/65">{dateBR(quote.created_at)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold">{quote.quantity}</td>
                    <td className="px-3 py-2.5 text-right font-extrabold">{brl(quote.total)}</td>
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
