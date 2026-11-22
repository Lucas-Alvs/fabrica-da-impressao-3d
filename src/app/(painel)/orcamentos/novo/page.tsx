import QuoteForm from "@/components/QuoteForm";
import { getSettings, getTiers, listClients, listMaterials } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function NovoOrcamentoPage({
  searchParams
}: {
  searchParams: Promise<{ cliente?: string }>;
}) {
  const params = await searchParams;
  const [clients, materials, settings, tiers] = await Promise.all([
    listClients(),
    listMaterials(),
    getSettings(),
    getTiers()
  ]);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand">Calculadora de custos</p>
        <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">Novo orçamento</h1>
        <p className="mt-1 text-sm font-medium text-ink/50">
          Os valores de custo, desconto de lote e preço final são calculados automaticamente.
        </p>
      </header>

      <QuoteForm
        clients={clients}
        materials={materials}
        settings={settings}
        tiers={tiers}
        defaultClientId={params.cliente ? Number(params.cliente) : undefined}
      />
    </div>
  );
}
