import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

type PdfRow = { label: string; value: string; emphasis?: boolean };
type PdfSection = { title: string; rows: PdfRow[] };

export interface SimplePdfInput {
  title: string;
  subtitle?: string;
  meta?: string[];
  sections: PdfSection[];
  footer?: string;
}

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 46;
const TOP = 50;
const BOTTOM = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

function safeText(value: string): string {
  return value
    .replace(/[–—]/g, "-")
    .replace(/×/g, "x")
    .replace(/→/g, "->")
    .replace(/•/g, "-")
    .replace(/…/g, "...")
    .replace(/\u00a0/g, " ");
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = safeText(text).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word;
  }
  if (current) lines.push(current);
  return lines;
}

export async function createSimplePdf(input: SimplePdfInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const teal = rgb(0.08, 0.43, 0.45);
  const ink = rgb(0.08, 0.16, 0.18);
  const muted = rgb(0.38, 0.45, 0.47);
  const line = rgb(0.88, 0.91, 0.91);

  let page: PDFPage;
  let y = 0;
  let pageNumber = 0;

  const addPage = () => {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pageNumber += 1;
    y = PAGE_HEIGHT - TOP;
    page.drawText("FishFarm Management", { x: MARGIN_X, y, font: bold, size: 9, color: teal });
    page.drawText(`Halaman ${pageNumber}`, {
      x: PAGE_WIDTH - MARGIN_X - 55,
      y,
      font: regular,
      size: 7.5,
      color: muted,
    });
    y -= 22;
  };

  const ensureSpace = (height: number) => {
    if (y - height < BOTTOM) addPage();
  };

  const drawParagraph = (text: string, options?: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; indent?: number }) => {
    const size = options?.size ?? 9;
    const font = options?.font ?? regular;
    const color = options?.color ?? ink;
    const indent = options?.indent ?? 0;
    const lines = wrapText(text, font, size, CONTENT_WIDTH - indent);
    ensureSpace(lines.length * (size + 3));
    for (const lineText of lines) {
      page.drawText(lineText, { x: MARGIN_X + indent, y, font, size, color });
      y -= size + 3;
    }
  };

  addPage();
  drawParagraph(input.title, { size: 20, font: bold, color: ink });
  if (input.subtitle) {
    y -= 2;
    drawParagraph(input.subtitle, { size: 9, color: muted });
  }
  if (input.meta?.length) {
    y -= 4;
    for (const meta of input.meta) drawParagraph(meta, { size: 8, color: muted });
  }
  y -= 8;

  for (const section of input.sections) {
    ensureSpace(48);
    page.drawLine({ start: { x: MARGIN_X, y }, end: { x: PAGE_WIDTH - MARGIN_X, y }, thickness: 0.6, color: line });
    y -= 16;
    drawParagraph(section.title.toUpperCase(), { size: 8, font: bold, color: teal });
    y -= 3;
    for (const row of section.rows) {
      ensureSpace(25);
      const labelLines = wrapText(row.label, regular, 8, 180);
      const valueLines = wrapText(row.value, row.emphasis ? bold : regular, 9, CONTENT_WIDTH - 200);
      const lines = Math.max(labelLines.length, valueLines.length);
      for (let i = 0; i < lines; i += 1) {
        if (labelLines[i]) page.drawText(labelLines[i], { x: MARGIN_X, y, font: regular, size: 8, color: muted });
        if (valueLines[i]) page.drawText(valueLines[i], { x: MARGIN_X + 200, y, font: row.emphasis ? bold : regular, size: 9, color: ink });
        y -= 12;
      }
      y -= 3;
    }
    y -= 6;
  }

  const footer = input.footer ?? "Generated from PostgreSQL source of truth.";
  for (const currentPage of pdf.getPages()) {
    currentPage.drawText(safeText(footer), {
      x: MARGIN_X,
      y: 26,
      font: regular,
      size: 6.8,
      color: muted,
      maxWidth: CONTENT_WIDTH,
    });
  }

  return pdf.save();
}

export function pdfDownload(bytes: Uint8Array, filename: string): Response {
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
