import QRCode from "qrcode";
import type { PdfPageSize } from "./pdf";

export type QrFormat = "png" | "svg" | "pdf";

/** Print card size. PNG and SVG downloads share these dimensions. */
export const QR_CARD_WIDTH = 800;
export const QR_CARD_HEIGHT = 1020;

const GOOGLE_LETTERS: Array<[string, string]> = [
  ["G", "#4285F4"],
  ["o", "#EA4335"],
  ["g", "#4285F4"],
  ["l", "#34A853"],
  ["e", "#EA4335"],
];

export async function renderQrPngDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: 640,
    type: "image/png",
  });
}

export async function renderQrSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "H",
    margin: 2,
    width: 640,
  });
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Up to two centered lines so long business names still fit the card. */
export function wrapCardTitle(name: string, maxChars = 26): string[] {
  const clean =
    name.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim() ||
    "Your business";
  const words = clean.split(" ");
  const lines: string[] = [];
  let index = 0;

  while (index < words.length && lines.length < 2) {
    let line = "";
    while (index < words.length) {
      const word =
        words[index].length > maxChars
          ? `${words[index].slice(0, maxChars - 1)}…`
          : words[index];
      const next = line ? `${line} ${word}` : word;
      if (line && next.length > maxChars) break;
      line = next;
      index += 1;
      if (word.endsWith("…")) break;
    }
    lines.push(line);
  }

  if (index < words.length && lines.length > 0) {
    const last = lines[lines.length - 1] ?? "";
    lines[lines.length - 1] =
      last.length >= maxChars ? `${last.slice(0, maxChars - 1)}…` : `${last}…`;
  }

  return lines;
}

export function qrDownloadFilename(businessName: string, format: QrFormat): string {
  const slug = businessName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `review-${slug || "qr"}.${format}`;
}

/**
 * Printable review card: color bar, “Review us on Google”, the QR, and the
 * business name so two businesses are easy to tell apart on paper.
 */
export async function renderQrCardSvg(url: string, businessName: string): Promise<string> {
  const qr = await renderQrSvg(url);
  const viewBox = qr.match(/viewBox="([^"]+)"/)?.[1] ?? "0 0 100 100";
  const inner = qr.replace(/<svg[^>]*>/, "").replace("</svg>", "");
  const lines = wrapCardTitle(businessName);
  const title = lines
    .map((line, index) => {
      const y = 860 + index * 46;
      return `<text x="400" y="${y}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="40" font-weight="700" fill="#202124">${xmlEscape(line)}</text>`;
    })
    .join("");
  const wordmark = GOOGLE_LETTERS.map(
    ([letter, color]) => `<tspan fill="${color}">${letter}</tspan>`,
  ).join("");
  const bars = ["#4285F4", "#EA4335", "#FBBC05", "#34A853"]
    .map(
      (color, index) =>
        `<rect x="${72 + index * 164}" y="56" width="164" height="14" fill="${color}"/>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${QR_CARD_WIDTH}" height="${QR_CARD_HEIGHT}" viewBox="0 0 ${QR_CARD_WIDTH} ${QR_CARD_HEIGHT}">
  <rect width="${QR_CARD_WIDTH}" height="${QR_CARD_HEIGHT}" rx="40" fill="#ffffff"/>
  <rect x="28" y="28" width="744" height="964" rx="32" fill="none" stroke="#dadce0" stroke-width="3"/>
  <clipPath id="qr-card-bar"><rect x="72" y="56" width="656" height="14" rx="7"/></clipPath>
  <g clip-path="url(#qr-card-bar)">${bars}</g>
  <text x="400" y="140" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="22" letter-spacing="3" fill="#5f6368">REVIEW US ON</text>
  <text x="400" y="214" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="72" font-weight="700">${wordmark}</text>
  <svg x="120" y="260" width="560" height="560" viewBox="${viewBox}">${inner}</svg>
  ${title}
  <text x="400" y="972" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="22" fill="#5f6368">Scan to leave a review</text>
</svg>`;
}

export async function renderQr(
  url: string,
  format: QrFormat,
  businessName: string,
  options?: { pageSize?: PdfPageSize },
): Promise<{ contentType: string; body: string | ArrayBuffer }> {
  if (format === "svg") {
    const svg = await renderQrCardSvg(url, businessName);
    return { contentType: "image/svg+xml; charset=utf-8", body: svg };
  }

  const { renderFramedQrPng } = await import("./framed-png");
  const png = await renderFramedQrPng(url, businessName);
  if (format === "pdf") {
    const { pngToPdf } = await import("./pdf");
    return {
      contentType: "application/pdf",
      body: await pngToPdf(png, options?.pageSize),
    };
  }

  return { contentType: "image/png", body: png };
}
