import { loadPdf, renderPageToFile } from './pdfImport';

/**
 * Renders every page of a PDF file to a PNG image, exactly as designed
 * (not re-typeset) — for a single lesson's worth of pages uploaded by hand.
 * See pdfImport.ts for the shared loading/rendering logic and the bulk
 * "import a whole booklet, split by date" flow (used from the lessons list
 * page), and its comments for two real bugs found building this (pdfjs-dist
 * referencing browser-only globals during Next.js's server render pass, and
 * page.render() hanging forever when passed both `canvas` and
 * `canvasContext`).
 */
export async function renderPdfPagesToImages(file: File): Promise<File[]> {
  const pdf = await loadPdf(file);
  const baseName = file.name.replace(/\.pdf$/i, '');

  const pages: File[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    pages.push(await renderPageToFile(pdf, pageNumber, `${baseName}-page-${pageNumber}.png`));
  }
  return pages;
}
