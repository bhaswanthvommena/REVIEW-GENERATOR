import { createElement as h, type ReactNode } from "react";
import { ImageResponse } from "next/og";
import { QR_CARD_HEIGHT, QR_CARD_WIDTH, renderQrPngDataUrl, wrapCardTitle } from "./render";

const LETTERS: Array<[string, string]> = [
  ["G", "#4285F4"],
  ["o", "#EA4335"],
  ["o", "#FBBC05"],
  ["g", "#4285F4"],
  ["l", "#34A853"],
  ["e", "#EA4335"],
];

const BARS = ["#4285F4", "#EA4335", "#FBBC05", "#34A853"];

/**
 * Raster card matching `renderQrCardSvg`. Kept out of the QR barrel's hot path
 * callers by being imported only when a PNG is actually rendered.
 */
export async function renderFramedQrPng(
  url: string,
  businessName: string,
): Promise<ArrayBuffer> {
  const qr = await renderQrPngDataUrl(url);
  const lines = wrapCardTitle(businessName);
  const nameSize = lines.some((line) => line.length > 22) ? 32 : 40;

  const response = new ImageResponse(
    h(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          background: "#ffffff",
          color: "#202124",
          fontFamily: "geist",
          border: "3px solid #dadce0",
          borderRadius: "40px",
        },
      },
      h("div", {
        style: {
          display: "flex",
          width: "656px",
          height: "14px",
          marginTop: "56px",
          borderRadius: "7px",
          overflow: "hidden",
        },
      }, ...BARS.map((color) =>
        h("div", { style: { display: "flex", flex: 1, background: color, height: "14px" } }),
      )),
      h(
        "div",
        {
          style: {
            display: "flex",
            marginTop: "48px",
            fontSize: "22px",
            letterSpacing: "3px",
            color: "#5f6368",
            fontWeight: 400,
          },
        },
        "REVIEW US ON",
      ),
      h(
        "div",
        {
          style: {
            display: "flex",
            marginTop: "8px",
            fontSize: "72px",
            fontWeight: 400,
          },
        },
        ...LETTERS.map(([letter, color]) =>
          h("div", { style: { color, display: "flex" } }, letter),
        ),
      ),
      h("img", {
        src: qr,
        width: 560,
        height: 560,
        style: { marginTop: "28px" },
      }),
      ...lines.map(
        (line): ReactNode =>
          h(
            "div",
            {
              style: {
                display: "flex",
                marginTop: "8px",
                fontSize: `${nameSize}px`,
                fontWeight: 400,
                textAlign: "center",
              },
            },
            line,
          ),
      ),
      h(
        "div",
        {
          style: {
            display: "flex",
            marginTop: "16px",
            fontSize: "22px",
            color: "#5f6368",
          },
        },
        "Scan to leave a review",
      ),
    ),
    { width: QR_CARD_WIDTH, height: QR_CARD_HEIGHT },
  );

  return response.arrayBuffer();
}
