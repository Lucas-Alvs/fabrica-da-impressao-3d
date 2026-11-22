/**
 * Tipos compartilhados entre servidor (Node.js) e cliente (React).
 * Nenhum dado sensível trafega nestes tipos.
 */

export type Settings = {
  id: number;
  kwh_price: number;
  printer_name: string;
  printer_value: number;
  printer_watts: number;
  printer_life_hours: number;
  maintenance_per_hour: number;
  labor_mode: "hourly" | "percent";
  labor_hourly: number;
  labor_percent: number;
  profit_mode: "percent" | "fixed";
  profit_percent: number;
  profit_fixed: number;
  min_margin_percent: number;
  company_name: string;
  company_phone: string;
  company_email: string;
  company_site: string;
  quote_valid_days: number;
  admin_email: string;
  admin_password_hash: string | null;
  updated_at: string;
};

export type BatchTier = {
  id: number;
  min_qty: number;
  max_qty: number | null;
  discount_percent: number;
  special: number; // 1 = solicitar orçamento especial
  sort_order: number;
};

export type Client = {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  company: string | null;
  created_at: string;
};

export type Material = {
  id: number;
  name: string;
  color: string;
  price_per_kg: number;
  stock_g: number;
  created_at: string;
};

export type Quote = {
  id: number;
  client_id: number | null;
  client_name: string;
  client_phone: string;
  project_name: string;
  notes: string | null;
  material_id: number | null;
  material_label: string;
  weight_g: number;
  hours: number;
  quantity: number;
  pieces_per_plate: number;
  cycles: number;
  material_cost: number;
  energy_cost: number;
  wear_cost: number;
  maintenance_cost: number;
  labor_cost: number;
  unit_cost: number;
  profit_unit: number;
  unit_price: number;
  subtotal: number;
  discount_percent: number;
  discount_value: number;
  total: number;
  special_batch: number;
  energy_kwh: number;
  created_at: string;
  pdf_generated_at: string | null;
};

export type AuditLog = {
  id: number;
  action: string;
  entity: string;
  entity_id: number | null;
  details: string | null;
  created_at: string;
};

/** Entrada do formulário de orçamento (usada no cálculo e no servidor). */
export type QuoteInput = {
  weight_g: number;
  hours: number;
  quantity: number;
  pieces_per_plate: number;
  material_price_per_kg: number;
};

export type QuoteComputation = {
  materialCost: number;
  energyCost: number;
  wearCost: number;
  maintenanceCost: number;
  laborCost: number;
  unitCost: number;
  profitUnit: number;
  unitPrice: number;
  /** Preço unitário sugerido para atingir a margem mínima (se aplicável). */
  minPrice: number;
  subtotal: number;
  discountPercent: number;
  discountValue: number;
  total: number;
  specialBatch: boolean;
  tierLabel: string;
  savings: number;
  effectiveUnitPrice: number;
  energyKwh: number;
  // Produção em massa
  cycles: number;
  totalHours: number;
  totalWeightG: number;
  totalEnergyKwh: number;
  totalMaterialCost: number;
  totalEnergyCost: number;
  totalLaborCost: number;
  totalProfit: number;
};
