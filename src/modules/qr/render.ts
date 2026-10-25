import QRCode from "qrcode";

export type QrFormat = "png" | "svg";

export async function renderQrPngDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 512,
    type: "image/png",
  });
}

export async function renderQrSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 512,
  });
}

export async function renderQr(
  url: string,
  format: QrFormat,
): Promise<{ contentType: string; body: string | ArrayBuffer }> {
  if (format === "svg") {
    const svg = await renderQrSvg(url);
    return { contentType: "image/svg+xml; charset=utf-8", body: svg };
  }

  const dataUrl = await renderQrPngDataUrl(url);
  const base64 = dataUrl.split(",")[1] ?? "";
  const bytes = Buffer.from(base64, "base64");
  const arrayBuffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(arrayBuffer).set(bytes);
  return {
    contentType: "image/png",
    body: arrayBuffer,
  };
}
