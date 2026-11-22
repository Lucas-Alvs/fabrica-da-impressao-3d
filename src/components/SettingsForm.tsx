"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { brl, num } from "@/lib/format";
import type { BatchTier, Settings } from "@/lib/types";

type SettingsFields = Omit<Settings, "id" | "admin_password_hash" | "updated_at">;

type Props = {
  settings: SettingsFields;
  tiers: BatchTier[];
};

type TierRow = { min_qty: string; max_qty: string; discount_percent: string; special: boolean };

export default function SettingsForm({ settings, tiers }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<TierRow[]>(
    tiers.map((tier) => ({
      min_qty: String(tier.min_qty),
      max_qty: tier.max_qty === null ? "" : String(tier.max_qty),
      discount_percent: String(tier.discount_percent),
      special: Boolean(tier.special)
    }))
  );
  const [status, setStatus] = useState<{ type: "ok" | "error"; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, watch } = useForm<SettingsFields>({ defaultValues: settings });
  const values = watch();

  const save = async (values: SettingsFields) => {
    setSaving(true);
    setStatus(null);
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: values,
          tiers: rows.map((row) => ({
            min_qty: Number(row.min_qty),
            max_qty: row.max_qty === "" ? null : Number(row.max_qty),
            discount_percent: Number(row.discount_percent),
            special: row.special
          }))
        })
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setStatus({ type: "error", message: data.error ?? "Não foi possível salvar." });
        return;
      }
      setStatus({ type: "ok", message: "Configurações salvas com sucesso." });
      router.refresh();
    } catch {
      setStatus({ type: "error", message: "Falha de conexão. Tente novamente." });
    } finally {
      setSaving(false);
    }
  };

  const wearPerHour =
    Number(values.printer_life_hours) > 0 ? Number(values.printer_value) / Number(values.printer_life_hours) : 0;

  return (
    <form onSubmit={handleSubmit(save)} className="space-y-5">
      {/* Impressora */}
      <section className="card p-4 sm:p-6">
        <h2 className="text-base font-extrabold">Impressora & energia</h2>
        <p className="mt-0.5 text-xs font-medium text-ink/65">
          Base do cálculo de energia e desgaste. Padrão: Bambu Lab A1 Mini (95 W, 10.000 h, R$ 2.000,00).
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="label">Modelo da impressora</label>
            <input className="input" {...register("printer_name")} />
          </div>
          <div>
            <label className="label">Potência média (W)</label>
            <input type="number" step="0.1" min={0} className="input" {...register("printer_watts")} />
          </div>
          <div>
            <label className="label">Valor da impressora (R$)</label>
            <input type="number" step="0.01" min={0} className="input" {...register("printer_value")} />
          </div>
          <div>
            <label className="label">Vida útil (horas)</label>
            <input type="number" step="1" min={1} className="input" {...register("printer_life_hours")} />
          </div>
          <div>
            <label className="label">Valor do kWh (R$)</label>
            <input type="number" step="0.01" min={0} className="input" {...register("kwh_price")} />
          </div>
          <div>
            <label className="label">Manutenção por hora (R$)</label>
            <input type="number" step="0.01" min={0} className="input" {...register("maintenance_per_hour")} />
          </div>
        </div>
        <p className="mt-3 rounded-xl bg-cloud px-3 py-2 text-[11px] font-semibold text-ink/65">
          Desgaste calculado: {brl(wearPerHour)} por hora de impressão • energia:{" "}
          {brl((Number(values.printer_watts) / 1000) * Number(values.kwh_price))} por hora
        </p>
      </section>

      {/* Mão de obra e lucro */}
      <section className="card p-4 sm:p-6">
        <h2 className="text-base font-extrabold">Mão de obra, lucro e margem</h2>
        <p className="mt-0.5 text-xs font-medium text-ink/65">
          Escolha como a mão de obra e o lucro entram no preço final.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-cloud/70 p-3">
            <label className="label">Mão de obra</label>
            <select className="input" {...register("labor_mode")}>
              <option value="hourly">Valor por hora</option>
              <option value="percent">Percentual sobre o custo</option>
            </select>
            <div className="mt-2">
              {values.labor_mode === "percent" ? (
                <>
                  <label className="label">Percentual (%)</label>
                  <input type="number" step="0.1" min={0} className="input" {...register("labor_percent")} />
                </>
              ) : (
                <>
                  <label className="label">Valor por hora (R$)</label>
                  <input type="number" step="0.01" min={0} className="input" {...register("labor_hourly")} />
                </>
              )}
            </div>
          </div>

          <div className="rounded-xl bg-cloud/70 p-3">
            <label className="label">Lucro</label>
            <select className="input" {...register("profit_mode")}>
              <option value="percent">Percentual sobre o custo</option>
              <option value="fixed">Valor fixo por peça</option>
            </select>
            <div className="mt-2">
              {values.profit_mode === "fixed" ? (
                <>
                  <label className="label">Valor fixo (R$)</label>
                  <input type="number" step="0.01" min={0} className="input" {...register("profit_fixed")} />
                </>
              ) : (
                <>
                  <label className="label">Percentual (%)</label>
                  <input type="number" step="0.1" min={0} className="input" {...register("profit_percent")} />
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 max-w-xs">
          <label className="label">Margem mínima de lucro (%)</label>
          <input type="number" step="0.1" min={0} className="input" {...register("min_margin_percent")} />
          <p className="mt-1 text-[10px] font-medium text-ink/65">
            O sistema nunca deixa o preço abaixo de custo + margem mínima.
          </p>
        </div>
      </section>

      {/* Faixas de lote */}
      <section className="card p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-extrabold">Faixas de desconto por lote</h2>
            <p className="mt-0.5 text-xs font-medium text-ink/65">
              Aplicadas automaticamente conforme a quantidade de peças do orçamento.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setRows((current) => [
                ...current,
                { min_qty: "", max_qty: "", discount_percent: "0", special: false }
              ])
            }
            className="btn-ghost px-3 py-1.5 text-[11px]"
          >
            + Adicionar faixa
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {rows.map((row, index) => (
            <div key={index} className="grid grid-cols-2 items-end gap-2 rounded-xl bg-cloud/60 p-3 sm:grid-cols-[1fr_1fr_1fr_auto_auto]">
              <div>
                <label className="label">De (peças)</label>
                <input
                  type="number"
                  min={1}
                  className="input"
                  value={row.min_qty}
                  onChange={(event) =>
                    setRows((current) =>
                      current.map((item, i) => (i === index ? { ...item, min_qty: event.target.value } : item))
                    )
                  }
                />
              </div>
              <div>
                <label className="label">Até (peças)</label>
                <input
                  type="number"
                  min={1}
                  placeholder="sem limite"
                  className="input"
                  value={row.max_qty}
                  onChange={(event) =>
                    setRows((current) =>
                      current.map((item, i) => (i === index ? { ...item, max_qty: event.target.value } : item))
                    )
                  }
                />
              </div>
              <div>
                <label className="label">Desconto (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  className="input"
                  value={row.discount_percent}
                  onChange={(event) =>
                    setRows((current) =>
                      current.map((item, i) =>
                        i === index ? { ...item, discount_percent: event.target.value } : item
                      )
                    )
                  }
                />
              </div>
              <label className="flex items-center gap-2 pb-2.5 text-[11px] font-bold text-ink/60">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-brand"
                  checked={row.special}
                  onChange={(event) =>
                    setRows((current) =>
                      current.map((item, i) => (i === index ? { ...item, special: event.target.checked } : item))
                    )
                  }
                />
                Orçamento especial
              </label>
              <button
                type="button"
                onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
                className="btn-danger px-2.5 py-2 text-[11px]"
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Empresa */}
      <section className="card p-4 sm:p-6">
        <h2 className="text-base font-extrabold">Identidade nos orçamentos</h2>
        <p className="mt-0.5 text-xs font-medium text-ink/65">
          Dados exibidos no cabeçalho e rodapé do PDF.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Nome da empresa</label>
            <input className="input" {...register("company_name")} />
          </div>
          <div>
            <label className="label">Telefone / WhatsApp</label>
            <input className="input" placeholder="(11) 99999-9999" {...register("company_phone")} />
          </div>
          <div>
            <label className="label">E-mail</label>
            <input className="input" placeholder="contato@fabrica3d.com" {...register("company_email")} />
          </div>
          <div>
            <label className="label">Site / Instagram</label>
            <input className="input" placeholder="fabrica3d.com" {...register("company_site")} />
          </div>
          <div>
            <label className="label">Validade do orçamento (dias)</label>
            <input type="number" min={1} className="input" {...register("quote_valid_days")} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">E-mail de acesso ao painel</label>
            <input className="input" type="email" {...register("admin_email")} />
            <p className="mt-1 text-[10px] font-medium text-ink/65">
              Em produção, o e-mail definido em ADMIN_EMAIL tem prioridade sobre este campo.
            </p>
          </div>
        </div>
      </section>

      {status ? (
        <p
          className={`rounded-xl px-4 py-3 text-xs font-semibold ${
            status.type === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
          }`}
        >
          {status.message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Salvando..." : "Salvar configurações"}
        </button>
        <a href="/api/backup" className="btn-ghost">
          ↓ Baixar backup do banco
        </a>
        <span className="self-center text-[11px] font-semibold text-ink/65">
          Desgaste atual: {num(wearPerHour, 4)} R$/h
        </span>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [status, setStatus] = useState<{ type: "ok" | "error"; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, reset } = useForm({
    defaultValues: { current_password: "", new_password: "", confirm_password: "" }
  });

  const onSubmit = async (values: {
    current_password: string;
    new_password: string;
    confirm_password: string;
  }) => {
    setSaving(true);
    setStatus(null);
    try {
      const response = await fetch("/api/settings/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setStatus({ type: "error", message: data.error ?? "Não foi possível alterar a senha." });
        return;
      }
      setStatus({ type: "ok", message: "Senha alterada com sucesso." });
      reset();
    } catch {
      setStatus({ type: "error", message: "Falha de conexão." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label">Senha atual</label>
          <input type="password" className="input" {...register("current_password", { required: true })} />
        </div>
        <div>
          <label className="label">Nova senha</label>
          <input type="password" className="input" {...register("new_password", { required: true })} />
        </div>
        <div>
          <label className="label">Confirmar nova senha</label>
          <input type="password" className="input" {...register("confirm_password", { required: true })} />
        </div>
      </div>
      {status ? (
        <p
          className={`rounded-xl px-3 py-2 text-xs font-semibold ${
            status.type === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
          }`}
        >
          {status.message}
        </p>
      ) : null}
      <button type="submit" className="btn-dark" disabled={saving}>
        {saving ? "Alterando..." : "Alterar senha"}
      </button>
    </form>
  );
}
