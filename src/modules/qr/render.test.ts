import { describe, expect, it } from "vitest";
import { renderQrPngDataUrl, renderQrSvg } from "./render";

describe("QR render", () => {
  it("renders a PNG data URL", async () => {
    const dataUrl = await renderQrPngDataUrl("https://example.com/r/token");
    expect(dataUrl.startsWith("data:image/png;base64,")).toBe(true);
  });

  it("renders SVG markup", async () => {
    const svg = await renderQrSvg("https://example.com/r/token");
    expect(svg).toContain("<svg");
  });
});
