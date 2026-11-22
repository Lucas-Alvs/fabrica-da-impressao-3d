import Link from "next/link";
import { EmptyState, LinkButton, SectionCard, StatCard } from "@/components/ui";
import { brl, dateBR, grams, hoursLabel, num } from "@/lib/format";
import { getDashboard, getSettings } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [data, settings] = await Promise.all([getDashboard(), getSettings()]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand">Painel principal</p>
          <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">Visão geral da produção</h1>
          <p className="mt-1 text-sm font-medium text-ink/50">
            {settings.printer_name} • {num(settings.printer_watts, 0)} W • vida útil de{" "}
            {num(settings.printer_life_hours, 0)} h
          </p>
        </div>
        <LinkButton href="/orcamentos/novo">+ Novo orçamento</LinkButton>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Total de orçamentos" value={String(data.quotesCount)} hint="Histórico completo" />
        <StatCard label="Total faturado" value={brl(data.revenue)} hint={`Ticket médio ${brl(data.avgTicket)}`} />
        <StatCard label="Total de lucro" value={brl(data.profit)} hint="Lucro estimado acumulado" />
        <StatCard label="Horas impressas" value={hoursLabel(data.hours)} hint={`${data.batchesCount} com preço de lote`} />
        <StatCard label="Consumo energético" value={`${num(data.energyKwh, 1)} kWh`} hint={`${brl(data.energyKwh * settings.kwh_price)} estimado`} />
        <StatCard
          label="Material mais usado"
          value={data.topMaterial?.label ?? "—"}
          hint={data.topMaterial ? `${data.topMaterial.count} orçamento(s)` : "Nenhum orçamento ainda"}
        />
        <StatCard label="Clientes cadastrados" value={String(data.clientsCount)} hint={`${data.materialsCount} materiais`} />
        <StatCard label="Custo/hora da impressora" value={brl(settings.printer_value / settings.printer_life_hours)} hint="Desgaste por hora" />
      </div>

      <SectionCard
        title="Últimos orçamentos"
        description="Os 6 registros mais recentes"
        action={<Link href="/orcamentos" className="text-xs font-bold text-brand hover:underline">Ver todos</Link>}
      >
        {data.recentQuotes.length === 0 ? (
          <EmptyState
            title="Nenhum orçamento ainda"
            description="Crie o primeiro orçamento para começar a acompanhar faturamento, lucro e consumo."
            action={<LinkButton href="/orcamentos/novo">Criar orçamento</LinkButton>}
          />
        ) : (
          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead className="table-head">
                <tr>
                  <th className="px-3 py-2.5">Projeto</th>
                  <th className="px-3 py-2.5">Cliente</th>
                  <th className="px-3 py-2.5">Data</th>
                  <th className="px-3 py-2.5 text-right">Qtd</th>
                  <th className="px-3 py-2.5 text-right">Peso</th>
                  <th className="px-3 py-2.5 text-right">Valor</th>
                  <th className="px-3 py-2.5 text-right">Lote</th>
                </tr>
              </thead>
              <tbody>
                {data.recentQuotes.map((quote) => (
                  <tr key={quote.id} className="border-b border-ink/5 last:border-0 hover:bg-cloud/50">
                    <td className="px-3 py-2.5 font-bold">
                      <Link href={`/orcamentos/${quote.id}`} className="hover:text-brand">
                        {quote.project_name}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-ink/60">{quote.client_name}</td>
                    <td className="px-3 py-2.5 text-ink/50">{dateBR(quote.created_at)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold">{quote.quantity}</td>
                    <td className="px-3 py-2.5 text-right text-ink/60">{grams(quote.weight_g * quote.quantity)}</td>
                    <td className="px-3 py-2.5 text-right font-extrabold">{brl(quote.total)}</td>
                    <td className="px-3 py-2.5 text-right">
                      {quote.discount_percent > 0 || quote.special_batch ? (
                        <span className="badge bg-emerald-100 text-emerald-700">
                          {quote.special_batch ? "Especial" : `${num(quote.discount_percent, 0)}%`}
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-ink/30">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/orcamentos/novo" className="card group p-5 transition hover:shadow-glow">
          <p className="text-xs font-bold uppercase tracking-wider text-brand">Calculadora</p>
          <p className="mt-1 text-sm font-extrabold">Novo orçamento</p>
          <p className="mt-1 text-xs font-medium text-ink/45">Calcule custos e preço em segundos.</p>
        </Link>
        <Link href="/clientes" className="card p-5 transition hover:shadow-glow">
          <p className="text-xs font-bold uppercase tracking-wider text-brand">CRM</p>
          <p className="mt-1 text-sm font-extrabold">Clientes</p>
          <p className="mt-1 text-xs font-medium text-ink/45">Histórico e contatos por cliente.</p>
        </Link>
        <Link href="/configuracoes" className="card p-5 transition hover:shadow-glow">
          <p className="text-xs font-bold uppercase tracking-wider text-brand">Ajustes</p>
          <p className="mt-1 text-sm font-extrabold">Configurações</p>
          <p className="mt-1 text-xs font-medium text-ink/45">Impressora, energia, lucro e faixas.</p>
        </Link>
      </div>
    </div>
  );
}
