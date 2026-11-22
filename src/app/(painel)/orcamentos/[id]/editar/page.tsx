import { notFound } from "next/navigation";
import QuoteForm from "@/components/QuoteForm";
import { getQuote, getSettings, getTiers, listClients, listMaterials } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function EditarOrcamentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quote = await getQuote(Number(id));
  if (!quote) notFound();

  const [clients, materials, settings, tiers] = await Promise.all([
    listClients(),
    listMaterials(),
    getSettings(),
    getTiers()
  ]);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand">
          Orçamento #{String(quote.id).padStart(4, "0")}
        </p>
        <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">Editar orçamento</h1>
        <p className="mt-1 text-sm font-medium text-ink/50">
          Ao salvar, todos os cálculos são refeitos com as configurações atuais.
        </p>
      </header>

      <QuoteForm
        clients={clients}
        materials={materials}
        settings={settings}
        tiers={tiers}
        quote={quote}
      />
    </div>
  );
}
