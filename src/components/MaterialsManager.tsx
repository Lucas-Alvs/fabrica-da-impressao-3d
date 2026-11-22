"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { brl, grams, num } from "@/lib/format";
import type { Material } from "@/lib/types";

type FormValues = { name: string; color: string; price_per_kg: string; stock_g: string };

const PRESETS = ["PLA", "PETG", "ABS", "TPU", "ASA", "Outro"];

export default function MaterialsManager({ materials }: { materials: Material[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Material | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, setValue } = useForm<FormValues>({
    defaultValues: { name: "", color: "", price_per_kg: "", stock_g: "" }
  });

  const openNew = () => {
    setEditing(null);
    reset({ name: "", color: "", price_per_kg: "", stock_g: "" });
    setError("");
    setOpen(true);
  };

  const openEdit = (material: Material) => {
    setEditing(material);
    reset({
      name: material.name,
      color: material.color,
      price_per_kg: String(material.price_per_kg),
      stock_g: String(material.stock_g)
    });
    setError("");
    setOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(editing ? `/api/materials/${editing.id}` : "/api/materials", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Não foi possível salvar o material.");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (material: Material) => {
    if (!window.confirm(`Excluir o material ${material.name} ${material.color}?`)) return;
    await fetch(`/api/materials/${material.id}`, { method: "DELETE" });
    router.refresh();
  };

  return (
    <>
      <div className="mb-4 flex justify-end">
        <button onClick={openNew} className="btn-primary">
          + Novo material
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {materials.map((material) => (
          <div key={material.id} className="rounded-2xl bg-white p-4 ring-1 ring-inset ring-ink/10">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-extrabold">{material.name}</p>
                <p className="text-[11px] font-semibold text-ink/40">{material.color || "Cor não informada"}</p>
              </div>
              <span className="badge bg-brand/10 text-brand">{brl(material.price_per_kg)}/kg</span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-ink/10 pt-3 text-[11px] font-semibold text-ink/50">
              <span>Estoque: {grams(material.stock_g)}</span>
              <div className="flex gap-1.5">
                <button onClick={() => openEdit(material)} className="btn-ghost px-2 py-1 text-[11px]">
                  Editar
                </button>
                <button onClick={() => remove(material)} className="btn-danger px-2 py-1 text-[11px]">
                  Excluir
                </button>
              </div>
            </div>
            <p className="mt-2 text-[10px] font-medium text-ink/35">
              Custo por grama: {brl(material.price_per_kg / 1000)}
            </p>
          </div>
        ))}
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6">
            <h2 className="text-lg font-extrabold">{editing ? "Editar material" : "Novo material"}</h2>
            <p className="mt-0.5 text-xs font-medium text-ink/45">
              O valor por Kg alimenta automaticamente o custo de material dos orçamentos.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3">
              <div>
                <label className="label">Nome *</label>
                <input className="input" placeholder="PLA" {...register("name", { required: true })} />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setValue("name", preset)}
                      className="rounded-full bg-cloud px-2.5 py-1 text-[11px] font-bold text-ink/60 hover:bg-brand/15 hover:text-brand"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">Cor</label>
                  <input className="input" placeholder="Preto" {...register("color")} />
                </div>
                <div>
                  <label className="label">Valor por Kg (R$) *</label>
                  <input type="number" min={0} step="0.01" className="input" placeholder="110" {...register("price_per_kg", { required: true })} />
                </div>
              </div>
              <div>
                <label className="label">Estoque (g)</label>
                <input type="number" min={0} step="1" className="input" placeholder="1000" {...register("stock_g")} />
                <p className="mt-1 text-[10px] font-medium text-ink/35">
                  {num(Number(0), 0)}
                </p>
              </div>

              {error ? (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{error}</p>
              ) : null}

              <div className="flex gap-2 pt-1">
                <button type="submit" className="btn-primary flex-1" disabled={saving}>
                  {saving ? "Salvando..." : "Salvar material"}
                </button>
                <button type="button" onClick={() => setOpen(false)} className="btn-ghost">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
