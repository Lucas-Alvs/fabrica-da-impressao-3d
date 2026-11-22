/**
 * Geração do PDF do orçamento com a identidade visual da Fábrica Da Impressão 3D.
 *
 * Usa pdf-lib (JavaScript puro, sem binários nativos e sem precisar de
 * navegador headless), o que garante funcionamento em qualquer hospedagem
 * serverless — Vercel, Netlify ou um servidor Node.js comum.
 */

import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb, type RGB } from "pdf-lib";
import { dateBR, hoursLabel, num } from "./format";
import type { Quote, Settings } from "./types";

const ORANGE = rgb(1, 0.42, 0);
const ORANGE_SOFT = rgb(1, 0.94, 0.88);
const INK = rgb(0.067, 0.067, 0.067);
const WHITE = rgb(1, 1, 1);
const GRAY = rgb(0.42, 0.42, 0.42);
const LIGHT = rgb(0.953, 0.953, 0.953);
const LINE = rgb(0.86, 0.86, 0.86);
const GREEN = rgb(0.09, 0.5, 0.24);
const GREEN_SOFT = rgb(0.91, 0.97, 0.92);

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 42;

const money = (value: number) =>
  `R$ ${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Number.isFinite(value) ? value : 0
  )}`;

type Fonts = { regular: PDFFont; bold: PDFFont };

/** Desenha o logotipo (marca em laranja + nome da empresa). */
function drawLogo(page: PDFPage, x: number, y: number, fonts: Fonts, companyName: string) {
  const size = 34;
  page.drawRectangle({ x, y, width: size, height: size, color: ORANGE });
  page.drawRectangle({ x: x + 6, y: y + 6, width: size - 12, height: size - 12, borderColor: WHITE, borderWidth: 1.5 });
  const companyInitials = "F3D";
  const text = companyInitials;
  const width = fonts.bold.widthOfTextAtSize(text, 13);
  page.drawText(text, {
    x: x + (size - width) / 2,
    y: y + size / 2 - 4.5,
    size: 13,
    font: fonts.bold,
    color: INK
  });
}

function label(page: PDFPage, text: string, x: number, y: number, fonts: Fonts, color: RGB = GRAY) {
  page.drawText(text.toUpperCase(), { x, y, size: 7.5, font: fonts.bold, color });
}

function text(
  page: PDFPage,
  value: string,
  x: number,
  y: number,
  size: number,
  fonts: Fonts,
  bold = false,
  color: RGB = INK
) {
  page.drawText(value, { x, y, size, font: bold ? fonts.bold : fonts.regular, color });
}

function truncate(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 1))}…`;
}

export async function buildQuotePdf(quote: Quote, settings: Settings): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Orçamento ${quote.project_name} — ${settings.company_name}`);
  doc.setAuthor(settings.company_name);
  doc.setCreator(settings.company_name);

  const fonts: Fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold)
  };

  const page = doc.addPage([PAGE_W, PAGE_H]);
  const company = settings.company_name || "Fábrica Da Impressão 3D";

  /* ───────── Cabeçalho ───────── */
  page.drawRectangle({ x: 0, y: PAGE_H - 132, width: PAGE_W, height: 132, color: INK });
  page.drawRectangle({ x: 0, y: PAGE_H - 132, width: PAGE_W, height: 4, color: ORANGE });

  drawLogo(page, MARGIN, PAGE_H - 82, fonts, company);
  text(page, truncate(company.toUpperCase(), 34), MARGIN + 46, PAGE_H - 56, 14, fonts, true, WHITE);
  text(page, "IMPRESSÃO 3D  •  PROTOTIPAGEM  •  PRODUÇÃO", MARGIN + 46, PAGE_H - 72, 7.5, fonts, false, rgb(0.72, 0.72, 0.72));
  if (settings.company_phone || settings.company_email) {
    const contact = [settings.company_phone, settings.company_email].filter(Boolean).join("  |  ");
    text(page, contact, MARGIN + 46, PAGE_H - 88, 7.5, fonts, false, rgb(0.72, 0.72, 0.72));
  }

  const titleWidth = fonts.bold.widthOfTextAtSize("ORÇAMENTO", 22);
  text(page, "ORÇAMENTO", PAGE_W - MARGIN - titleWidth, PAGE_H - 58, 22, fonts, true, WHITE);
  const numberLabel = `Nº ${String(quote.id).padStart(4, "0")}`;
  const numberWidth = fonts.bold.widthOfTextAtSize(numberLabel, 9);
  text(page, numberLabel, PAGE_W - MARGIN - numberWidth, PAGE_H - 76, 9, fonts, true, ORANGE);
  const dateLabel = dateBR(quote.created_at);
  const dateWidth = fonts.regular.widthOfTextAtSize(dateLabel, 8.5);
  text(page, dateLabel, PAGE_W - MARGIN - dateWidth, PAGE_H - 90, 8.5, fonts, false, rgb(0.72, 0.72, 0.72));

  /* ───────── Cliente ───────── */
  let y = PAGE_H - 158;
  const boxW = PAGE_W - MARGIN * 2;
  page.drawRectangle({ x: MARGIN, y: y - 62, width: boxW, height: 62, color: LIGHT });
  page.drawRectangle({ x: MARGIN, y: y - 62, width: 3, height: 62, color: ORANGE });
  label(page, "Cliente", MARGIN + 16, y - 16, fonts);
  text(page, truncate(quote.client_name || "Cliente não informado", 52), MARGIN + 16, y - 32, 12, fonts, true);
  text(page, `Telefone: ${quote.client_phone || "—"}`, MARGIN + 16, y - 48, 8.5, fonts, false, GRAY);

  /* ───────── Projeto ───────── */
  y -= 88;
  label(page, "Projeto", MARGIN, y, fonts);
  text(page, truncate(quote.project_name || "Peça sem nome", 60), MARGIN, y - 18, 13, fonts, true);
  const materialInfo = `Material: ${quote.material_label || "—"}   •   Quantidade: ${quote.quantity} peça(s)   •   Tempo por peça: ${hoursLabel(quote.hours)}`;
  text(page, materialInfo, MARGIN, y - 34, 8.5, fonts, false, GRAY);

  /* ───────── Tabela ───────── */
  y -= 58;
  const colItem = MARGIN + 10;
  const colTime = MARGIN + 180;
  const colWeight = MARGIN + 250;
  const colQty = MARGIN + 322;
  // Colunas de valores alinhadas à direita (sem sobreposição)
  const unitRight = MARGIN + 406;
  const totalRight = PAGE_W - MARGIN - 10;

  page.drawRectangle({ x: MARGIN, y: y - 20, width: boxW, height: 24, color: INK });
  text(page, "ITEM", colItem, y - 12, 7.5, fonts, true, WHITE);
  text(page, "TEMPO", colTime, y - 12, 7.5, fonts, true, WHITE);
  text(page, "PESO", colWeight, y - 12, 7.5, fonts, true, WHITE);
  text(page, "QTD", colQty, y - 12, 7.5, fonts, true, WHITE);
  const unitHeader = "VALOR UNIT.";
  text(page, unitHeader, unitRight - fonts.bold.widthOfTextAtSize(unitHeader, 7.5), y - 12, 7.5, fonts, true, WHITE);
  const totalHeader = "VALOR TOTAL";
  text(page, totalHeader, totalRight - fonts.bold.widthOfTextAtSize(totalHeader, 7.5), y - 12, 7.5, fonts, true, WHITE);

  y -= 20;
  page.drawRectangle({ x: MARGIN, y: y - 34, width: boxW, height: 34, color: WHITE, borderColor: LINE, borderWidth: 0.6 });
  text(page, truncate(quote.project_name || "Peça", 32), colItem, y - 21, 9, fonts, true);
  text(page, hoursLabel(quote.hours), colTime, y - 21, 8.5, fonts);
  text(page, `${num(quote.weight_g, 0)} g`, colWeight, y - 21, 8.5, fonts);
  text(page, String(quote.quantity), colQty, y - 21, 8.5, fonts);
  const unitValue = money(quote.unit_price);
  text(page, unitValue, unitRight - fonts.regular.widthOfTextAtSize(unitValue, 8.5), y - 21, 8.5, fonts);
  const totalValue = money(quote.subtotal);
  text(page, totalValue, totalRight - fonts.regular.widthOfTextAtSize(totalValue, 8.5), y - 21, 8.5, fonts, true);

  /* ───────── Resumo financeiro (unitário) ───────── */
  y -= 62;
  const summaryX = MARGIN;
  const summaryW = 268;
  const rows: [string, string][] = [
    ["Material", money(quote.material_cost)],
    ["Energia", money(quote.energy_cost)],
    ["Desgaste da impressora", money(quote.wear_cost)],
    ["Manutenção", money(quote.maintenance_cost)],
    ["Mão de obra", money(quote.labor_cost)],
    ["Lucro", money(quote.profit_unit)]
  ];

  page.drawRectangle({ x: summaryX, y: y - 150, width: summaryW, height: 150, color: LIGHT });
  label(page, "Resumo financeiro (por peça)", summaryX + 14, y - 18, fonts);
  let rowY = y - 36;
  for (const [name, value] of rows) {
    text(page, name, summaryX + 14, rowY, 8.5, fonts, false, GRAY);
    text(page, value, summaryX + summaryW - 14 - fonts.bold.widthOfTextAtSize(value, 8.5), rowY, 8.5, fonts, true);
    rowY -= 15;
  }
  page.drawLine({
    start: { x: summaryX + 14, y: rowY + 6 },
    end: { x: summaryX + summaryW - 14, y: rowY + 6 },
    thickness: 0.6,
    color: LINE
  });
  text(page, "Custo total por peça", summaryX + 14, rowY - 8, 9, fonts, true);
  text(
    page,
    money(quote.unit_cost),
    summaryX + summaryW - 14 - fonts.bold.widthOfTextAtSize(money(quote.unit_cost), 9),
    rowY - 8,
    9,
    fonts,
    true
  );

  /* ───────── Caixa de valor total ───────── */
  const totalBoxX = summaryX + summaryW + 16;
  const totalBoxW = PAGE_W - MARGIN - totalBoxX;
  const totalBoxY = y - 150;
  page.drawRectangle({ x: totalBoxX, y: totalBoxY, width: totalBoxW, height: 150, color: INK });
  page.drawRectangle({ x: totalBoxX, y: totalBoxY + 150 - 4, width: totalBoxW, height: 4, color: ORANGE });

  label(page, "Valor total", totalBoxX + 14, totalBoxY + 112, fonts, rgb(0.7, 0.7, 0.7));
  const totalText = money(quote.total);
  let totalSize = 21;
  while (fonts.bold.widthOfTextAtSize(totalText, totalSize) > totalBoxW - 28 && totalSize > 12) {
    totalSize -= 1;
  }
  text(page, totalText, totalBoxX + 14, totalBoxY + 84, totalSize, fonts, true, WHITE);

  if (quote.discount_percent > 0 || quote.special_batch) {
    const badgeW = 92;
    page.drawRectangle({ x: totalBoxX + 14, y: totalBoxY + 52, width: badgeW, height: 18, color: GREEN });
    text(page, "PREÇO DE LOTE", totalBoxX + 22, totalBoxY + 57, 7.5, fonts, true, WHITE);
  }
  const unitLine = `Valor unitário: ${money(quote.unit_price)}`;
  text(page, unitLine, totalBoxX + 14, totalBoxY + 32, 8, fonts, false, rgb(0.75, 0.75, 0.75));
  const qtyLine = `${quote.quantity} peça(s)  •  ${quote.cycles} ciclo(s) de impressão`;
  text(page, qtyLine, totalBoxX + 14, totalBoxY + 16, 7.5, fonts, false, rgb(0.6, 0.6, 0.6));

  /* ───────── Faixa de lote ───────── */
  y = totalBoxY - 18;
  if (quote.discount_percent > 0 || quote.special_batch) {
    const boxH = 54;
    page.drawRectangle({ x: MARGIN, y: y - boxH, width: PAGE_W - MARGIN * 2, height: boxH, color: GREEN_SOFT });
    page.drawRectangle({ x: MARGIN, y: y - boxH, width: 3, height: boxH, color: GREEN });
    text(
      page,
      quote.special_batch ? "PREÇO ESPECIAL DE LOTE — SOLICITE CONDIÇÕES" : "PREÇO ESPECIAL DE LOTE APLICADO",
      MARGIN + 16,
      y - 18,
      10,
      fonts,
      true,
      GREEN
    );
    const detail = quote.special_batch
      ? `Quantidade: ${quote.quantity} peças  •  Produção acima de 499 peças: valores a combinar`
      : `Quantidade: ${quote.quantity} peças  •  Desconto aplicado: ${num(quote.discount_percent, 0)}%  •  Economia: ${money(quote.discount_value)}`;
    text(page, detail, MARGIN + 16, y - 34, 8.5, fonts, false, GREEN);
    if (!quote.special_batch) {
      const original = `Valor sem desconto: ${money(quote.subtotal)}`;
      text(page, original, MARGIN + 16, y - 46, 7.5, fonts, false, GREEN);
    }
    y -= boxH + 14;
  } else {
    y -= 4;
  }

  /* ───────── Produção em massa ───────── */
  const massRows: [string, string][] = [
    ["Peças por mesa", `${quote.pieces_per_plate}`],
    ["Ciclos de impressão", `${quote.cycles}`],
    ["Horas totais", hoursLabel(quote.cycles * quote.hours)],
    ["Peso total", `${num(quote.weight_g * quote.quantity, 0)} g`],
    ["Energia total", `${num(quote.energy_kwh * quote.cycles, 2)} kWh`]
  ];
  y -= 10;
  label(page, "Otimização de produção", MARGIN, y, fonts);
  let colX = MARGIN;
  const colW = (PAGE_W - MARGIN * 2) / massRows.length;
  y -= 16;
  for (const [name, value] of massRows) {
    page.drawRectangle({ x: colX, y: y - 34, width: colW - 6, height: 34, color: WHITE, borderColor: LINE, borderWidth: 0.6 });
    text(page, name.toUpperCase(), colX + 8, y - 13, 6.5, fonts, true, GRAY);
    text(page, value, colX + 8, y - 26, 9, fonts, true);
    colX += colW;
  }
  y -= 50;

  /* ───────── Observações ───────── */
  const notes = (quote.notes || "").trim();
  label(page, "Observações", MARGIN, y, fonts);
  y -= 12;
  page.drawRectangle({ x: MARGIN, y: y - 52, width: PAGE_W - MARGIN * 2, height: 52, color: WHITE, borderColor: LINE, borderWidth: 0.6 });
  const noteLines: string[] = [];
  if (notes) {
    const words = notes.replace(/\s+/g, " ").split(" ");
    let current = "";
    const maxWidth = PAGE_W - MARGIN * 2 - 24;
    for (const word of words) {
      const attempt = current ? `${current} ${word}` : word;
      if (fonts.regular.widthOfTextAtSize(attempt, 8.5) > maxWidth) {
        noteLines.push(current);
        current = word;
      } else {
        current = attempt;
      }
    }
    if (current) noteLines.push(current);
  }
  const visibleNotes = noteLines.slice(0, 3);
  if (!visibleNotes.length) visibleNotes.push("Orçamento válido por 7 dias. Prazo de produção a combinar.");
  visibleNotes.forEach((line, index) => {
    text(page, truncate(line, 118), MARGIN + 12, y - 16 - index * 13, 8.5, fonts, false, GRAY);
  });

  /* ───────── Rodapé ───────── */
  page.drawLine({
    start: { x: MARGIN, y: 62 },
    end: { x: PAGE_W - MARGIN, y: 62 },
    thickness: 1,
    color: ORANGE
  });
  const footer = `${company} | Orçamento válido por ${settings.quote_valid_days || 7} dias`;
  text(page, footer, MARGIN, 46, 8.5, fonts, true, INK);
  if (settings.company_site) {
    text(page, settings.company_site, MARGIN, 34, 7.5, fonts, false, GRAY);
  }
  const pageLabel = "1/1";
  text(page, pageLabel, PAGE_W - MARGIN - fonts.regular.widthOfTextAtSize(pageLabel, 8), 46, 8, fonts, false, GRAY);

  return doc.save();
}
