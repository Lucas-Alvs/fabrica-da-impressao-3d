"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { brl } from "@/lib/format";
import type { Quote } from "@/lib/types";

type Props = {
  quote: Quote;
  companyName: string;
  compact?: boolean;
};

/** Botões de ação do orçamento: PDF, WhatsApp, editar, duplicar e excluir. */
export default function QuoteActions({ quote, companyName, compact = false }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const whatsapp = () => {
    const message = [
      `Olá, ${quote.client_name || "cliente"}.`,
      "",
      `Segue o orçamento da ${companyName}.`,
      "",
      `Projeto: ${quote.project_name}`,
      `Quantidade: ${quote.quantity}`,
      `Valor Final: ${brl(quote.total)}`,
      "",
      "Segue o PDF em anexo."
    ].join("\n");

    const digits = (quote.client_phone || "").replace(/\D/g, "");
    const phone = digits ? (digits.startsWith("55") ? digits : `55${digits}`) : "";
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const duplicate = async () => {
    setBusy(true);
    try {
      const response = await fetch(`/api/quotes/${quote.id}`, { method: "POST" });
      const data = (await response.json()) as { id?: number; error?: string };
      if (data.id) {
        router.push(`/orcamentos/${data.id}`);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Excluir o orçamento de "${quote.project_name}"? Esta ação não pode ser desfeita.`)) {
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/quotes/${quote.id}`, { method: "DELETE" });
      if (response.ok) {
        router.push("/orcamentos");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <Link href={`/orcamentos/${quote.id}`} className="btn-ghost px-2.5 py-1.5 text-[11px]">
          Ver
        </Link>
        <a
          href={`/api/quotes/${quote.id}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost px-2.5 py-1.5 text-[11px]"
        >
          PDF
        </a>
        <button onClick={whatsapp} className="btn-ghost px-2.5 py-1.5 text-[11px]" title="Enviar por WhatsApp">
          WhatsApp
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <a href={`/api/quotes/${quote.id}/pdf?download=1`} className="btn-primary">
        ↓ Baixar PDF
      </a>
      <button onClick={whatsapp} className="btn-dark" disabled={busy}>
        Enviar por WhatsApp
      </button>
      <Link href={`/orcamentos/${quote.id}/editar`} className="btn-ghost">
        Editar
      </Link>
      <button onClick={duplicate} className="btn-ghost" disabled={busy}>
        Duplicar
      </button>
      <button onClick={remove} className="btn-danger" disabled={busy}>
        Excluir
      </button>
    </div>
  );
}
