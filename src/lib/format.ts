/** Formatadores de números, datas e telefone no padrão brasileiro. */

export const brl = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number.isFinite(value) ? value : 0);

export const num = (value: number, digits = 2) =>
  new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(Number.isFinite(value) ? value : 0);

export const grams = (value: number) =>
  value >= 1000 ? `${num(value / 1000, 2)} kg` : `${num(value, 0)} g`;

export const dateBR = (iso: string) => {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

export const dateTimeBR = (iso: string) => {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

/** "3h 25min" a partir de horas decimais. */
export const hoursLabel = (hours: number) => {
  const total = Math.max(0, hours);
  const h = Math.floor(total);
  const m = Math.round((total - h) * 60);
  if (m === 60) return `${h + 1}h 00min`;
  return `${h}h ${String(m).padStart(2, "0")}min`;
};

/** Normaliza telefone para uso em links do WhatsApp (somente dígitos, com 55). */
export const waNumber = (phone: string) => {
  const digits = (phone || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
};

export const maskPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};
