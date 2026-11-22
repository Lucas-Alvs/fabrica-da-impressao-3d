/** Normalização e validação da entrada de orçamento (compartilhada pelas rotas). */

import type { QuotePayload } from "./repo";

export function normalizeQuotePayload(
  body: Record<string, unknown>
): { ok: true; payload: QuotePayload } | { ok: false; error: string } {
  const projectName = String(body.project_name ?? "").trim();
  if (!projectName) return { ok: false, error: "Informe o nome da peça / projeto." };

  const weight = Number(body.weight_g);
  const hours = Number(body.hours);
  const quantity = Math.floor(Number(body.quantity));
  const piecesPerPlate = Math.floor(Number(body.pieces_per_plate) || 1);
  const pricePerKg = Number(body.material_price_per_kg);

  if (!Number.isFinite(weight) || weight <= 0) {
    return { ok: false, error: "O peso da peça deve ser maior que zero." };
  }
  if (!Number.isFinite(hours) || hours <= 0) {
    return { ok: false, error: "O tempo da peça deve ser maior que zero." };
  }
  if (!Number.isFinite(quantity) || quantity < 1) {
    return { ok: false, error: "Quantidade inválida." };
  }
  if (!Number.isFinite(piecesPerPlate) || piecesPerPlate < 1) {
    return { ok: false, error: "Peças por mesa deve ser no mínimo 1." };
  }
  if (!Number.isFinite(pricePerKg) || pricePerKg < 0) {
    return { ok: false, error: "Selecione um material válido." };
  }

  const rawClientId = body.client_id ? Number(body.client_id) : null;

  return {
    ok: true,
    payload: {
      client_id: rawClientId && Number.isFinite(rawClientId) ? rawClientId : null,
      client_name: String(body.client_name ?? "").trim() || "Cliente não informado",
      client_phone: String(body.client_phone ?? "").trim(),
      project_name: projectName,
      notes: String(body.notes ?? "").trim(),
      material_id: body.material_id ? Number(body.material_id) : null,
      material_label: String(body.material_label ?? "").trim(),
      weight_g: weight,
      hours,
      quantity,
      pieces_per_plate: piecesPerPlate,
      material_price_per_kg: pricePerKg
    }
  };
}
