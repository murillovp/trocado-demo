import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

export type PdfCell = { x: number; text: string };
export type PdfRow = { page: number; y: number; cells: PdfCell[] };

/** Text pieces this close vertically sit on the same printed row. */
const SAME_ROW_TOLERANCE = 2;

/**
 * Reads every page's text and groups it into rows: pages in order, rows top to
 * bottom, cells left to right. Positions are PDF points from the page's
 * bottom-left corner.
 */
export async function extractPdfRows(bytes: Uint8Array): Promise<PdfRow[]> {
  // pdfjs takes ownership of the buffer it is given, so it gets a copy.
  const document = await getDocument({ data: new Uint8Array(bytes), verbosity: 0, isEvalSupported: false })
    .promise;
  const rows: PdfRow[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageRows: PdfRow[] = [];

      for (const item of content.items) {
        if (!('str' in item) || item.str.trim() === '') continue;
        const x = Number(item.transform[4]);
        const y = Number(item.transform[5]);
        let row = pageRows.find((candidate) => Math.abs(candidate.y - y) <= SAME_ROW_TOLERANCE);
        if (!row) {
          row = { page: pageNumber, y, cells: [] };
          pageRows.push(row);
        }
        row.cells.push({ x, text: item.str.trim() });
      }

      pageRows.sort((a, b) => b.y - a.y);
      for (const row of pageRows) row.cells.sort((a, b) => a.x - b.x);
      rows.push(...pageRows);
    }
  } finally {
    await document.destroy();
  }

  return rows;
}
