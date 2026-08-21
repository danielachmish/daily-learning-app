// Client-side (browser) port of scripts/import-lesson-pdf.py's day-detection
// logic, so importing a monthly booklet doesn't require running a script
// from a terminal. See that script's module docstring for the full
// rationale — this mirrors it exactly, just using pdfjs-dist's
// getTextContent() instead of PyMuPDF, and creating lessons via the normal
// admin Supabase client (RLS-gated by is_admin()) instead of the service
// role key.

const DATE_BADGE_MAX_X = 160;
const DATE_BADGE_MAX_Y = 110;
const DATE_PATTERN = /(\d{2})\/(\d{2})\/(\d{2})/;
export const DAY_PAGE_COUNT_WARNING_THRESHOLD = 4;
export const RENDER_SCALE = 2.5;

export interface DetectedDay {
  dateLabel: string; // DD/MM/YY, as printed
  isoDate: string; // YYYY-MM-DD
  pageNumbers: number[]; // 1-indexed, in order
}

export interface DetectionResult {
  days: DetectedDay[];
  frontMatterPageCount: number;
}

function ddmmyyToIso(dateStr: string): string {
  const [day, month, year] = dateStr.split('/');
  return `20${year}-${month}-${day}`;
}

/** Returns a DD/MM/YY string if this page starts a new day, else null. */
async function detectDateOnPage(pdf: import('pdfjs-dist').PDFDocumentProxy, pageNumber: number): Promise<string | null> {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1 });
  const textContent = await page.getTextContent();

  for (const item of textContent.items) {
    if (!('str' in item) || !('transform' in item)) continue;
    const x = item.transform[4];
    const yFromTop = viewport.height - item.transform[5];
    if (x < DATE_BADGE_MAX_X && yFromTop < DATE_BADGE_MAX_Y) {
      const match = DATE_PATTERN.exec(item.str);
      if (match) return match[0];
    }
  }
  return null;
}

export async function detectDayBoundaries(pdf: import('pdfjs-dist').PDFDocumentProxy): Promise<DetectionResult> {
  const days: DetectedDay[] = [];
  let current: DetectedDay | null = null;
  let frontMatterPageCount = 0;

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const dateLabel = await detectDateOnPage(pdf, pageNumber);
    if (dateLabel) {
      current = { dateLabel, isoDate: ddmmyyToIso(dateLabel), pageNumbers: [pageNumber] };
      days.push(current);
    } else if (current) {
      current.pageNumbers.push(pageNumber);
    } else {
      frontMatterPageCount++;
    }
  }

  return { days, frontMatterPageCount };
}

/** Renders one page (1-indexed) of an already-open PDF to a PNG File. */
export async function renderPageToFile(
  pdf: import('pdfjs-dist').PDFDocumentProxy,
  pageNumber: number,
  fileName: string
): Promise<File> {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale: RENDER_SCALE });

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  // `canvas` only, not `canvasContext` — see pdfToImages.ts for why passing
  // both makes the render promise hang forever with no error.
  await page.render({ canvas, viewport }).promise;

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error(`עיבוד עמוד ${pageNumber} נכשל.`);
  return new File([blob], fileName, { type: 'image/png' });
}

export async function loadPdf(file: File): Promise<import('pdfjs-dist').PDFDocumentProxy> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  const arrayBuffer = await file.arrayBuffer();
  return pdfjsLib.getDocument({ data: arrayBuffer }).promise;
}
