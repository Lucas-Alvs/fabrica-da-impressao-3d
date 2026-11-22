"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { computeQuote, resolveTier, tierLabel } from "@/lib/calc";
import { brl, grams, hoursLabel, num } from "@/lib/format";
import type { BatchTier, Client, Material, Quote, Settings } from "@/lib/types";

type FormValues = {
  client_id: string;
  client_name: string;
  client_phone: string;
  project_name: string;
  quantity: string;
  weight_g: string;
  hours_h: string;
  hours_min: string;
  material_id: string;
  pieces_per_plate: string;
  notes: string;
};

type Props = {
  clients: Client[];
  materials: Material[];
  settings: Settings;
  tiers: BatchTier[];
  quote?: Quote;
  defaultClientId?: number;
};

export default function QuoteForm({ clients, materials, settings, tiers, quote, defaultClientId }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const initialMaterial =
    quote?.material_id ?? materials[0]?.id ?? null;

  const { register, handleSubmit, watch, setValue } = useForm<FormValues>({
    defaultValues: {
      client_id: String(quote?.client_id ?? defaultClientId ?? ""),
      client_name: quote?.client_name ?? "",
      client_phone: quote?.client_phone ?? "",
      project_name: quote?.project_name ?? "",
      quantity: String(quote?.quantity ?? 1),
      weight_g: quote?.weight_g ? String(quote.weight_g) : "",
      hours_h: quote ? String(Math.floor(quote.hours)) : "",
      hours_min: quote ? String(Math.round((quote.hours % 1) * 60)) : "",
      material_id: String(initialMaterial ?? ""),
      pieces_per_plate: String(quote?.pieces_per_plate ?? 1),
      notes: quote?.notes ?? ""
    }
  });

  const values = watch();

  const selectedMaterial = materials.find((material) => String(material.id) === String(values.material_id));
  const pricePerKg = selectedMaterial?.price_per_kg ?? 0;
  const hours = (Number(values.hours_h) || 0) + (Number(values.hours_min) || 0) / 60;
  const quantity = Math.max(1, Math.floor(Number(values.quantity) || 1));
  const weight = Number(values.weight_g) || 0;
  const piecesPerPlate = Math.max(1, Math.floor(Number(values.pieces_per_plate) || 1));

  const calc = useMemo(
    () =>
      computeQuote(
        {
          weight_g: weight,
          hours,
          quantity,
          pieces_per_plate: piecesPerPlate,
          material_price_per_kg: pricePerKg
        },
        settings,
        tiers
      ),
    [weight, hours, quantity, piecesPerPlate, pricePerKg, settings, tiers]
  );

  const activeTier = resolveTier(quantity, tiers);
  const hasBatch = calc.discountPercent > 0 || calc.specialBatch;

  const onSubmit = async (form: FormValues) => {
    setSaving(true);
    setError("");
    const totalHours = (Number(form.hours_h) || 0) + (Number(form.hours_min) || 0) / 60;
    const material = materials.find((item) => String(item.id) === String(form.material_id));
    const payload = {
      client_id: form.client_id ? Number(form.client_id) : null,
      client_name: form.client_name.trim(),
      client_phone: form.client_phone.trim(),
      project_name: form.project_name.trim(),
      notes: form.notes,
      material_id: material?.id ?? null,
      material_label: material ? `${material.name} ${material.color}`.trim() : "",
      weight_g: Number(form.weight_g),
      hours: totalHours,
      quantity: Math.max(1, Math.floor(Number(form.quantity) || 1)),
      pieces_per_plate: Math.max(1, Math.floor(Number(form.pieces_per_plate) || 1)),
      material_price_per_kg: material?.price_per_kg ?? 0
    };

    try {
      const response = await fetch(quote ? `/api/quotes/${quote.id}` : "/api/quotes", {
        method: quote ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = (await response.json()) as { error?: string; id?: number };
      if (!response.ok) {
        setError(data.error ?? "Não foi possível salvar o orçamento.");
        return;
      }
      router.push(`/orcamentos/${quote ? quote.id : data.id}`);
      router.refresh();
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const costRows: [string, number, string][] = [
    ["Material", calc.materialCost, `${num(weight, 0)} g × ${brl(pricePerKg)}/kg`],
    ["Energia", calc.energyCost, `${num(settings.printer_watts / 1000 * hours, 2)} kWh`],
    ["Desgaste", calc.wearCost, `${brl(settings.printer_value / settings.printer_life_hours)}/h`],
    ["Manutenção", calc.maintenanceCost, `${brl(settings.maintenance_per_hour)}/h`],
    [
      settings.labor_mode === "percent" ? "Mão de obra (%)" : "Mão de obra (h)",
      calc.laborCost,
      settings.labor_mode === "percent" ? `${num(settings.labor_percent, 0)}% do custo` : `${brl(settings.labor_hourly)}/h`
    ],
    [
      settings.profit_mode === "fixed" ? "Lucro (fixo)" : "Lucro (%)",
      calc.profitUnit,
      settings.profit_mode === "fixed" ? brl(settings.profit_fixed) : `${num(settings.profit_percent, 0)}%`
    ]
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
      {/* ───────── Formulário ───────── */}
      <div className="space-y-5">
        <section className="card p-4 sm:p-6">
          <h2 className="text-base font-extrabold">Cliente</h2>
          <p className="mt-0.5 text-xs font-medium text-ink/45">
            Escolha um cliente cadastrado ou preencha os dados manualmente.
          </p>

          <div className="mt-4 space-y-4">
            <div>
              <label className="label">Cliente cadastrado</label>
              <select
                className="input"
                {...register("client_id", {
                  onChange: (event) => {
                    const client = clients.find((item) => String(item.id) === event.target.value);
                    setValue("client_name", client?.name ?? "");
                    setValue("client_phone", client?.phone ?? "");
                  }
                })}
              >
                <option value="">Sem vínculo / novo nome</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name} — {client.phone}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Nome do cliente</label>
                <input className="input" placeholder="Ex.: João Silva" {...register("client_name")} />
              </div>
              <div>
                <label className="label">Celular / WhatsApp</label>
                <input className="input" placeholder="(11) 99999-9999" {...register("client_phone")} />
              </div>
            </div>
          </div>
        </section>

        <section className="card p-4 sm:p-6">
          <h2 className="text-base font-extrabold">Dados da peça</h2>
          <p className="mt-0.5 text-xs font-medium text-ink/45">
            Informe peso, tempo de impressão e quantidade para o cálculo automático.
          </p>

          <div className="mt-4 space-y-4">
            <div>
              <label className="label">Nome da peça / projeto</label>
              <input
                className="input"
                placeholder="Ex.: Suporte de celular articulado"
                {...register("project_name", { required: true })}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="label">Quantidade</label>
                <input type="number" min={1} step={1} className="input" {...register("quantity")} />
              </div>
              <div>
                <label className="label">Peso da peça (g)</label>
                <input type="number" min={0} step={0.1} className="input" placeholder="85" {...register("weight_g")} />
              </div>
              <div>
                <label className="label">Peças por mesa</label>
                <input type="number" min={1} step={1} className="input" {...register("pieces_per_plate")} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Tempo da peça</label>
                <div className="flex items-center gap-2">
                  <input type="number" min={0} step={1} className="input" placeholder="3" {...register("hours_h")} />
                  <span className="text-xs font-bold text-ink/40">h</span>
                  <input type="number" min={0} max={59} step={1} className="input" placeholder="30" {...register("hours_min")} />
                  <span className="text-xs font-bold text-ink/40">min</span>
                </div>
                <p className="mt-1 text-[11px] font-semibold text-ink/40">
                  {hours > 0 ? hoursLabel(hours) : "Informe as horas e os minutos"}
                </p>
              </div>
              <div>
                <label className="label">Material</label>
                <select className="input" {...register("material_id")}>
                  {materials.map((material) => (
                    <option key={material.id} value={material.id}>
                      {material.name} {material.color} — {brl(material.price_per_kg)}/kg
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="label">Observações</label>
              <textarea
                rows={3}
                className="input resize-none"
                placeholder="Detalhes, prazo, acabamento, condições de pagamento..."
                {...register("notes")}
              />
            </div>
          </div>
        </section>

        {error ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">{error}</p>
        ) : null}
      </div>

      {/* ───────── Resumo / prévia ───────── */}
      <div className="space-y-5 lg:sticky lg:top-6 lg:self-start">
        <section className="card overflow-hidden">
          <div className="bg-ink px-5 py-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Valor do orçamento</p>
            <p className="mt-1 text-3xl font-extrabold text-white">{brl(calc.total)}</p>
            <p className="mt-1 text-[11px] font-semibold text-white/45">
              {quantity} peça(s) • {brl(calc.effectiveUnitPrice)} por unidade
            </p>
          </div>

          <div className="space-y-2 px-5 py-4 text-sm">
            {costRows.map(([label, value, hint]) => (
              <div key={label} className="flex items-baseline justify-between gap-3">
                <div>
                  <p className="text-[13px] font-semibold text-ink/70">{label}</p>
                  <p className="text-[10px] font-medium text-ink/35">{hint}</p>
                </div>
                <p className="font-bold text-ink">{brl(value)}</p>
              </div>
            ))}
            <div className="flex justify-between border-t border-dashed border-ink/15 pt-2 text-[13px] font-bold">
              <span>Custo por peça</span>
              <span>{brl(calc.unitCost)}</span>
            </div>
            <div className="flex justify-between text-[13px] font-extrabold text-brand">
              <span>Preço de venda unitário</span>
              <span>{brl(calc.unitPrice)}</span>
            </div>
          </div>
        </section>

        {/* Faixa de lote */}
        <section className={`card p-5 ${hasBatch ? "ring-2 ring-emerald-300" : ""}`}>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-extrabold">Precificação em lote</h3>
            <span className="badge bg-cloud text-ink/60">{tierLabel(activeTier)}</span>
          </div>

          {hasBatch ? (
            <div className="mt-3 space-y-2 rounded-xl bg-emerald-50 p-3 ring-1 ring-inset ring-emerald-200">
              <span className="badge bg-emerald-600 text-white">✅ Preço de lote aplicado</span>
              <dl className="mt-2 space-y-1 text-[12px] font-semibold text-emerald-900">
                <div className="flex justify-between">
                  <dt>Quantidade</dt>
                  <dd>{quantity} peças</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Faixa utilizada</dt>
                  <dd>{tierLabel(activeTier)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Desconto aplicado</dt>
                  <dd>{calc.specialBatch ? "A combinar" : `${num(calc.discountPercent, 0)}%`}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Valor economizado</dt>
                  <dd>{brl(calc.savings)}</dd>
                </div>
                <div className="flex justify-between border-t border-emerald-200 pt-1 text-[13px] font-extrabold">
                  <dt>Valor final</dt>
                  <dd>{brl(calc.total)}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <div className="mt-3 rounded-xl bg-cloud/70 p-3">
              <p className="text-[12px] font-semibold text-ink/60">
                A partir de 50 peças o desconto de lote é aplicado automaticamente.
              </p>
              <ul className="mt-2 space-y-1 text-[11px] font-semibold text-ink/45">
                {tiers.map((tier) => (
                  <li key={tier.id} className="flex justify-between gap-2">
                    <span>{tierLabel(tier)}</span>
                    <span>{tier.special ? "sob consulta" : tier.discount_percent > 0 ? `${num(tier.discount_percent, 0)}%` : "sem desconto"}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Comparação de preço */}
        <section className="card p-5">
          <h3 className="text-sm font-extrabold">Comparação de preço</h3>
          <dl className="mt-3 space-y-2 text-[12px] font-semibold">
            <div className="flex justify-between">
              <dt className="text-ink/55">Preço unitário</dt>
              <dd>{brl(calc.unitPrice)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink/55">Preço em lote (por peça)</dt>
              <dd>{brl(calc.effectiveUnitPrice)}</dd>
            </div>
            <div className="flex justify-between text-emerald-700">
              <dt>Economia obtida</dt>
              <dd>{brl(calc.savings)}</dd>
            </div>
            <div className="flex justify-between text-emerald-700">
              <dt>Percentual economizado</dt>
              <dd>{num(calc.discountPercent, 0)}%</dd>
            </div>
          </dl>
        </section>

        {/* Produção em massa */}
        <section className="card p-5">
          <h3 className="text-sm font-extrabold">Otimização de produção</h3>
          <p className="mt-0.5 text-[11px] font-medium text-ink/45">
            {piecesPerPlate} peça(s) por mesa • {quantity} peças solicitadas
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-[12px] font-semibold">
            {[
              ["Ciclos", `${calc.cycles}`],
              ["Horas totais", hoursLabel(calc.totalHours)],
              ["Peso total", grams(calc.totalWeightG)],
              ["Energia total", `${num(calc.totalEnergyKwh, 2)} kWh`],
              ["Faturamento", brl(calc.total)],
              ["Lucro total", brl(calc.totalProfit)]
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-cloud/70 px-2.5 py-2">
                <dt className="text-[9px] font-bold uppercase tracking-wide text-ink/40">{label}</dt>
                <dd className="mt-0.5 text-[12px] font-extrabold text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="flex flex-col gap-2">
          <button type="submit" disabled={saving} className="btn-primary py-3">
            {saving ? "Salvando..." : quote ? "Salvar alterações" : "Salvar orçamento"}
          </button>
          <button type="button" onClick={() => router.back()} className="btn-ghost">
            Cancelar
          </button>
        </div>
      </div>
    </form>
  );
}
