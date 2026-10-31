import { PDFDocument } from "pdf-lib";

export type PdfPageSize = "letter" | "a4";

/** Letter: 612x792 pt. A4: 595.28x841.89 pt. Card is centered so it prints cleanly. */
const PAGE_DIMENSIONS: Record<PdfPageSize, [number, number]> = {
  letter: [612, 792],
  a4: [595.28, 841.89],
};
const MARGIN = 54;

export async function pngToPdf(
  png: ArrayBuffer,
  pageSize: PdfPageSize = "letter",
): Promise<ArrayBuffer> {
  const [pageWidth, pageHeight] =
    PAGE_DIMENSIONS[pageSize] ?? PAGE_DIMENSIONS.letter;
  const doc = await PDFDocument.create();
  const page = doc.addPage([pageWidth, pageHeight]);
  const image = await doc.embedPng(png);
  const maxWidth = pageWidth - MARGIN * 2;
  const maxHeight = pageHeight - MARGIN * 2;
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
  const width = image.width * scale;
  const height = image.height * scale;

  page.drawImage(image, {
    x: (pageWidth - width) / 2,
    y: (pageHeight - height) / 2,
    width,
    height,
  });

  const bytes = await doc.save();
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}
