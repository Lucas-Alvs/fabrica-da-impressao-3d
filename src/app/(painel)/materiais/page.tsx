import MaterialsManager from "@/components/MaterialsManager";
import { SectionCard } from "@/components/ui";
import { grams } from "@/lib/format";
import { listMaterials } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function MateriaisPage() {
  const materials = await listMaterials();
  const stock = materials.reduce((sum, material) => sum + material.stock_g, 0);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand">Estoque</p>
        <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">Materiais</h1>
        <p className="mt-1 text-sm font-medium text-ink/50">
          {materials.length} material(is) • {grams(stock)} em estoque
        </p>
      </header>

      <SectionCard
        title="Catálogo de filamentos"
        description="Valores por Kg usados no cálculo automático de cada orçamento"
      >
        <MaterialsManager materials={materials} />
      </SectionCard>
    </div>
  );
}
