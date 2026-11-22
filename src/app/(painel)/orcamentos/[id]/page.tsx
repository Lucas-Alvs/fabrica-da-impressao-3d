import Link from "next/link";
import { notFound } from "next/navigation";
import QuoteActions from "@/components/QuoteActions";
import { brl, dateTimeBR, grams, hoursLabel, num } from "@/lib/format";
import { getQuote, getSettings } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function OrcamentoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [quote, settings] = await Promise.all([getQuote(Number(id)), getSettings()]);
  if (!quote) notFound();

  const hasBatch = quote.discount_percent > 0 || quote.special_batch === 1;
  const costs: [string, number][] = [
    ["Material", quote.material_cost],
    ["Energia", quote.energy_cost],
    ["Desgaste da impressora", quote.wear_cost],
    ["Manutenção", quote.maintenance_cost],
    ["Mão de obra", quote.labor_cost],
    ["Lucro por peça", quote.profit_unit]
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/orcamentos" className="text-xs font-bold text-ink/45 hover:text-brand">
          ← Voltar para orçamentos
        </Link>
        <p className="text-[11px] font-semibold text-ink/40">
          Criado em {dateTimeBR(quote.created_at)}
          {quote.pdf_generated_at ? ` • PDF gerado em ${dateTimeBR(quote.pdf_generated_at)}` : " • PDF ainda não gerado"}
        </p>
      </div>

      <article className="card overflow-hidden">
        {/* Cabeçalho do orçamento */}
        <header className="relative bg-ink px-5 py-6 sm:px-8">
          <div className="absolute inset-x-0 top-0 h-1 bg-brand" />
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand text-sm font-extrabold text-ink">
                F3D
              </div>
              <div>
                <p className="text-sm font-extrabold uppercase tracking-wide text-white">
                  {settings.company_name}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                  Impressão 3D • Prototipagem • Produção
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-extrabold uppercase text-white">Orçamento</p>
              <p className="text-xs font-bold text-brand">Nº {String(quote.id).padStart(4, "0")}</p>
            </div>
          </div>
        </header>

        <div className="space-y-6 p-5 sm:p-8">
          {/* Cliente e projeto */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-cloud/80 p-4 ring-1 ring-inset ring-ink/5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink/40">Cliente</p>
              <p className="mt-1 text-base font-extrabold">{quote.client_name || "Cliente não informado"}</p>
              <p className="text-xs font-semibold text-ink/50">{quote.client_phone || "Telefone não informado"}</p>
            </div>
            <div className="rounded-2xl bg-cloud/80 p-4 ring-1 ring-inset ring-ink/5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink/40">Projeto</p>
              <p className="mt-1 text-base font-extrabold">{quote.project_name}</p>
              <p className="text-xs font-semibold text-ink/50">
                {quote.material_label || "Material não informado"} • {grams(quote.weight_g)} por peça
              </p>
            </div>
          </div>

          {/* Tabela */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-sm">
              <thead>
                <tr className="bg-ink text-left text-[10px] font-bold uppercase tracking-wider text-white">
                  <th className="rounded-l-lg px-3 py-2.5">Item</th>
                  <th className="px-3 py-2.5">Tempo</th>
                  <th className="px-3 py-2.5">Peso</th>
                  <th className="px-3 py-2.5 text-right">Qtd</th>
                  <th className="px-3 py-2.5 text-right">Valor unit.</th>
                  <th className="rounded-r-lg px-3 py-2.5 text-right">Valor total</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-ink/10">
                  <td className="px-3 py-3 font-bold">{quote.project_name}</td>
                  <td className="px-3 py-3 text-ink/60">{hoursLabel(quote.hours)}</td>
                  <td className="px-3 py-3 text-ink/60">{num(quote.weight_g, 0)} g</td>
                  <td className="px-3 py-3 text-right font-semibold">{quote.quantity}</td>
                  <td className="px-3 py-3 text-right">{brl(quote.unit_price)}</td>
                  <td className="px-3 py-3 text-right font-extrabold">{brl(quote.subtotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Resumo financeiro + total */}
          <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <div className="rounded-2xl bg-cloud p-4 sm:p-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink/40">
                Resumo financeiro (por peça)
              </p>
              <dl className="mt-3 space-y-1.5 text-[13px]">
                {costs.map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3">
                    <dt className="font-semibold text-ink/55">{label}</dt>
                    <dd className="font-bold">{brl(value)}</dd>
                  </div>
                ))}
                <div className="flex justify-between border-t border-dashed border-ink/15 pt-2 text-[13px] font-extrabold">
                  <dt>Custo total por peça</dt>
                  <dd>{brl(quote.unit_cost)}</dd>
                </div>
              </dl>
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-ink p-5">
              <div className="absolute inset-x-0 top-0 h-1 bg-brand" />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Valor total</p>
              <p className="mt-2 break-words text-3xl font-extrabold text-white">{brl(quote.total)}</p>
              <p className="mt-2 text-[11px] font-semibold text-white/50">
                {brl(quote.unit_price)} por peça • {quote.quantity} peça(s)
              </p>
              <p className="text-[11px] font-semibold text-white/35">
                {quote.cycles} ciclo(s) de impressão • {hoursLabel(quote.cycles * quote.hours)} no total
              </p>
            </div>
          </div>

          {/* Lote */}
          {hasBatch ? (
            <div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-inset ring-emerald-200">
              <span className="badge bg-emerald-600 text-white">✅ Preço especial de lote</span>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-[12px] font-semibold text-emerald-900 sm:grid-cols-4">
                <div>
                  <dt className="text-[10px] font-bold uppercase text-emerald-700/70">Quantidade</dt>
                  <dd className="font-extrabold">{quote.quantity} peças</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase text-emerald-700/70">Desconto aplicado</dt>
                  <dd className="font-extrabold">
                    {quote.special_batch ? "A combinar" : `${num(quote.discount_percent, 0)}%`}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase text-emerald-700/70">Economia obtida</dt>
                  <dd className="font-extrabold">{brl(quote.discount_value)}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase text-emerald-700/70">Valor final</dt>
                  <dd className="font-extrabold">{brl(quote.total)}</dd>
                </div>
              </dl>
            </div>
          ) : null}

          {/* Produção */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink/40">Otimização de produção</p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {[
                ["Peças/mesa", String(quote.pieces_per_plate)],
                ["Ciclos", String(quote.cycles)],
                ["Horas totais", hoursLabel(quote.cycles * quote.hours)],
                ["Peso total", grams(quote.weight_g * quote.quantity)],
                ["Energia", `${num((quote.cycles * quote.hours * settings.printer_watts) / 1000, 2)} kWh`],
                ["Lucro total", brl(quote.profit_unit * quote.quantity - quote.discount_value)]
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-white px-3 py-2 ring-1 ring-inset ring-ink/10">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-ink/40">{label}</p>
                  <p className="mt-0.5 text-[12px] font-extrabold">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Observações */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink/40">Observações</p>
            <p className="mt-2 rounded-xl border border-ink/10 px-4 py-3 text-[13px] font-medium text-ink/60">
              {quote.notes?.trim() || `Orçamento válido por ${settings.quote_valid_days} dias. Prazo de produção a combinar.`}
            </p>
          </div>

          <p className="border-t border-ink/10 pt-4 text-[11px] font-semibold text-ink/40">
            {settings.company_name} | Orçamento válido por {settings.quote_valid_days} dias
          </p>
        </div>
      </article>

      <QuoteActions quote={quote} companyName={settings.company_name} />

      <p className="text-[11px] font-medium text-ink/35">
        O envio por WhatsApp abre a conversa com a mensagem pronta e o telefone do cliente. Baixe o PDF e
        anexe na conversa para concluir o envio.
      </p>
    </div>
  );
}
