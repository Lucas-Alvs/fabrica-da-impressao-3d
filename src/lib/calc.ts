/**
 * Motor de cálculo de custos — funções puras.
 *
 * O mesmo arquivo é usado no servidor (persistência) e no navegador
 * (prévia em tempo real), garantindo que o valor exibido seja
 * exatamente o valor salvo no orçamento.
 */

import type { BatchTier, QuoteComputation, QuoteInput, Settings } from "./types";

const r2 = (value: number) => Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
const safe = (value: number) => (Number.isFinite(value) && value > 0 ? value : 0);

/** Faixa de lote correspondente à quantidade informada. */
export function resolveTier(quantity: number, tiers: BatchTier[]): BatchTier | null {
  const sorted = [...tiers].sort((a, b) => a.min_qty - b.min_qty);
  return (
    sorted.find((tier) => {
      const max = tier.max_qty ?? Number.POSITIVE_INFINITY;
      return quantity >= tier.min_qty && quantity <= max;
    }) ?? null
  );
}

export function tierLabel(tier: BatchTier | null): string {
  if (!tier) return "Sem faixa de lote";
  if (tier.special) return `${tier.min_qty}+ peças — orçamento especial`;
  if (tier.max_qty === null) return `${tier.min_qty}+ peças`;
  return `${tier.min_qty} a ${tier.max_qty} peças`;
}

/**
 * Calcula todos os custos, o preço unitário e o total do orçamento.
 *
 * 1. Material      = (g ÷ 1000) × valor do Kg
 * 2. Energia       = (watts ÷ 1000) × horas × valor do kWh
 * 3. Desgaste      = (valor da impressora ÷ vida útil) × horas
 * 4. Manutenção    = valor/hora × horas
 * 5. Mão de obra   = valor/hora × horas  OU  % sobre o custo
 * 6. Lucro         = % sobre o custo  OU  valor fixo
 * 7. Valor final   = custos + mão de obra + lucro (com desconto de lote)
 */
export function computeQuote(
  input: QuoteInput,
  settings: Settings,
  tiers: BatchTier[]
): QuoteComputation {
  const weightG = safe(input.weight_g);
  const hours = safe(input.hours);
  const quantity = Math.max(1, Math.floor(safe(input.quantity) || 1));
  const piecesPerPlate = Math.max(1, Math.floor(safe(input.pieces_per_plate) || 1));

  // 1. Material
  const materialCost = r2((weightG / 1000) * safe(input.material_price_per_kg));

  // 2. Energia
  const energyKwh = r2(((safe(settings.printer_watts) / 1000) * hours * 100) / 100);
  const energyCost = r2((safe(settings.printer_watts) / 1000) * hours * safe(settings.kwh_price));

  // 3. Desgaste da impressora
  const wearPerHour = safe(settings.printer_life_hours) > 0
    ? safe(settings.printer_value) / safe(settings.printer_life_hours)
    : 0;
  const wearCost = r2(wearPerHour * hours);

  // 4. Manutenção
  const maintenanceCost = r2(safe(settings.maintenance_per_hour) * hours);

  // 5. Mão de obra
  const directCost = materialCost + energyCost + wearCost + maintenanceCost;
  const laborCost = r2(
    settings.labor_mode === "percent"
      ? (directCost * safe(settings.labor_percent)) / 100
      : safe(settings.labor_hourly) * hours
  );

  const unitCost = r2(directCost + laborCost);

  // 6. Lucro
  let profitUnit = r2(
    settings.profit_mode === "fixed"
      ? safe(settings.profit_fixed)
      : (unitCost * safe(settings.profit_percent)) / 100
  );

  // Margem mínima de lucro (garante que o preço nunca fique abaixo do custo + margem)
  const minPrice = r2(unitCost * (1 + safe(settings.min_margin_percent) / 100));
  if (unitCost + profitUnit < minPrice) {
    profitUnit = r2(minPrice - unitCost);
  }

  // 7. Valor final
  const unitPrice = r2(unitCost + profitUnit);
  const subtotal = r2(unitPrice * quantity);

  const tier = resolveTier(quantity, tiers);
  const specialBatch = Boolean(tier?.special);
  const discountPercent = specialBatch ? 0 : safe(tier?.discount_percent ?? 0);
  const discountValue = r2((subtotal * discountPercent) / 100);
  const total = specialBatch ? subtotal : r2(subtotal - discountValue);

  // Produção em massa
  const cycles = Math.max(1, Math.ceil(quantity / piecesPerPlate));
  const totalHours = r2(cycles * hours);
  const totalWeightG = r2(weightG * quantity);
  const totalEnergyKwh = r2((safe(settings.printer_watts) / 1000) * totalHours);
  const totalProfit = r2(profitUnit * quantity - discountValue);

  return {
    materialCost,
    energyCost,
    wearCost,
    maintenanceCost,
    laborCost,
    unitCost,
    profitUnit,
    unitPrice,
    minPrice,
    subtotal,
    discountPercent,
    discountValue,
    total,
    specialBatch,
    tierLabel: tierLabel(tier),
    savings: discountValue,
    effectiveUnitPrice: r2(total / quantity),
    energyKwh,
    cycles,
    totalHours,
    totalWeightG,
    totalEnergyKwh,
    totalMaterialCost: r2(materialCost * quantity),
    totalEnergyCost: r2(energyCost * quantity),
    totalLaborCost: r2(laborCost * quantity),
    totalProfit
  };
}

/** Soma os custos individuais de um orçamento (usada em resumos). */
export function sumCosts(q: {
  material_cost: number;
  energy_cost: number;
  wear_cost: number;
  maintenance_cost: number;
  labor_cost: number;
}) {
  return r2(q.material_cost + q.energy_cost + q.wear_cost + q.maintenance_cost + q.labor_cost);
}
