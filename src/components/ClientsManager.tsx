"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { dateBR, maskPhone } from "@/lib/format";
import type { Client } from "@/lib/types";

type FormValues = { name: string; phone: string; email: string; company: string };

type Props = {
  clients: Client[];
  quoteCounts: Record<number, { count: number; total: number; last: string | null }>;
};

export default function ClientsManager({ clients, quoteCounts }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<Client | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, setValue } = useForm<FormValues>({
    defaultValues: { name: "", phone: "", email: "", company: "" }
  });

  const openNew = () => {
    setEditing(null);
    reset({ name: "", phone: "", email: "", company: "" });
    setError("");
    setOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditing(client);
    reset({
      name: client.name,
      phone: client.phone,
      email: client.email ?? "",
      company: client.company ?? ""
    });
    setError("");
    setOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(editing ? `/api/clients/${editing.id}` : "/api/clients", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Não foi possível salvar o cliente.");
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

  const remove = async (client: Client) => {
    if (!window.confirm(`Excluir o cliente "${client.name}"? Os orçamentos continuam no histórico.`)) return;
    await fetch(`/api/clients/${client.id}`, { method: "DELETE" });
    router.refresh();
  };

  return (
    <>
      <div className="mb-4 flex justify-end">
        <button onClick={openNew} className="btn-primary">
          + Novo cliente
        </button>
      </div>

      <div className="-mx-4 overflow-x-auto sm:mx-0">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead className="table-head">
            <tr>
              <th className="px-3 py-2.5">Cliente</th>
              <th className="px-3 py-2.5">Contato</th>
              <th className="px-3 py-2.5 text-right">Orçamentos</th>
              <th className="px-3 py-2.5 text-right">Total</th>
              <th className="px-3 py-2.5">Último</th>
              <th className="px-3 py-2.5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => {
              const stats = quoteCounts[client.id];
              return (
                <tr key={client.id} className="border-b border-ink/5 last:border-0 hover:bg-cloud/50">
                  <td className="px-3 py-2.5">
                    <Link href={`/clientes/${client.id}`} className="font-bold hover:text-brand-dark">
                      {client.name}
                    </Link>
                    <p className="text-[11px] font-medium text-ink/65">{client.company || "Pessoa física"}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <p className="font-semibold text-ink/70">{client.phone}</p>
                    <p className="text-[11px] text-ink/65">{client.email || "—"}</p>
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold">{stats?.count ?? 0}</td>
                  <td className="px-3 py-2.5 text-right font-extrabold">
                    {stats ? `R$ ${stats.total.toFixed(2).replace(".", ",")}` : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-ink/65">{stats?.last ? dateBR(stats.last) : "—"}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <Link
                        href={`/orcamentos/novo?cliente=${client.id}`}
                        className="btn-primary px-2.5 py-1.5 text-[11px]"
                      >
                        Novo orçamento
                      </Link>
                      <button onClick={() => openEdit(client)} className="btn-ghost px-2.5 py-1.5 text-[11px]">
                        Editar
                      </button>
                      <button onClick={() => remove(client)} className="btn-danger px-2.5 py-1.5 text-[11px]">
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6">
            <h2 className="text-lg font-extrabold">{editing ? "Editar cliente" : "Novo cliente"}</h2>
            <p className="mt-0.5 text-xs font-medium text-ink/65">
              Os dados ficam vinculados aos orçamentos deste cliente.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3">
              <div>
                <label className="label">Nome *</label>
                <input className="input" placeholder="João Silva" {...register("name", { required: true })} />
              </div>
              <div>
                <label className="label">Celular / WhatsApp *</label>
                <input
                  className="input"
                  placeholder="(11) 99999-9999"
                  {...register("phone", {
                    required: true,
                    onChange: (event) => setValue("phone", maskPhone(event.target.value))
                  })}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">E-mail (opcional)</label>
                  <input className="input" type="email" placeholder="joao@email.com" {...register("email")} />
                </div>
                <div>
                  <label className="label">Empresa (opcional)</label>
                  <input className="input" placeholder="Silva Design" {...register("company")} />
                </div>
              </div>

              {error ? (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{error}</p>
              ) : null}

              <div className="flex gap-2 pt-1">
                <button type="submit" className="btn-primary flex-1" disabled={saving}>
                  {saving ? "Salvando..." : "Salvar cliente"}
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
