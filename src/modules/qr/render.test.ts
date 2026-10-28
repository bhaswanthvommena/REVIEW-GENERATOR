import { describe, expect, it } from "vitest";
import {
  qrDownloadFilename,
  renderQr,
  renderQrCardSvg,
  renderQrPngDataUrl,
  renderQrSvg,
  wrapCardTitle,
} from "./render";

describe("QR render", () => {
  it("renders a PNG data URL", async () => {
    const dataUrl = await renderQrPngDataUrl("https://example.com/r/token");
    expect(dataUrl.startsWith("data:image/png;base64,")).toBe(true);
  });

  it("renders SVG markup", async () => {
    const svg = await renderQrSvg("https://example.com/r/token");
    expect(svg).toContain("<svg");
  });

  it("frames the SVG with the business name", async () => {
    const svg = await renderQrCardSvg(
      "https://example.com/r/token",
      "Tom & Jerry's Cafe",
    );
    expect(svg).toContain("REVIEW US ON");
    expect(svg).toContain("Tom &amp; Jerry&apos;s Cafe");
    expect(svg).toContain("Scan to leave a review");
    expect(svg).toContain("<svg");
  });

  it("wraps a long business name onto two lines", () => {
    const lines = wrapCardTitle("Northside Family Dental and Orthodontics");
    expect(lines.length).toBe(2);
    expect(lines.join(" ")).toContain("Northside");
  });

  it("builds a safe download filename from the business name", () => {
    expect(qrDownloadFilename("Cafe Luna", "png")).toBe("review-cafe-luna.png");
    expect(qrDownloadFilename("Cafe Luna", "pdf")).toBe("review-cafe-luna.pdf");
  });

  it("renders a one-page PDF of the card", async () => {
    const rendered = await renderQr(
      "https://example.com/r/token",
      "pdf",
      "Cafe Luna",
    );
    expect(rendered.contentType).toBe("application/pdf");
    const bytes = new Uint8Array(rendered.body as ArrayBuffer);
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe("%PDF-");
  }, 20000);

  it("renders a framed PNG", async () => {
    const rendered = await renderQr(
      "https://example.com/r/token",
      "png",
      "Cafe Luna",
    );
    expect(rendered.contentType).toBe("image/png");
    expect(rendered.body).toBeInstanceOf(ArrayBuffer);
    expect((rendered.body as ArrayBuffer).byteLength).toBeGreaterThan(1000);
  }, 20000);
});
