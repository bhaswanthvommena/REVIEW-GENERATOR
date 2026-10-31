import { describe, expect, it } from "vitest";
import {
  parseJsonBody,
  PayloadTooLargeError,
  UnsupportedMediaTypeError,
} from "./body";

describe("parseJsonBody", () => {
  it("parses valid JSON within limits", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hello: "world" }),
    });
    const parsed = await parseJsonBody<{ hello: string }>(req);
    expect(parsed).toEqual({ hello: "world" });
  });

  it("throws PayloadTooLargeError when content-length exceeds maxBytes", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": "100",
      },
      body: JSON.stringify({ a: 1 }),
    });
    await expect(parseJsonBody(req, { maxBytes: 50 })).rejects.toThrow(
      PayloadTooLargeError,
    );
  });

  it("throws PayloadTooLargeError when actual body bytes exceed maxBytes", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ longText: "x".repeat(200) }),
    });
    await expect(parseJsonBody(req, { maxBytes: 50 })).rejects.toThrow(
      PayloadTooLargeError,
    );
  });

  it("throws UnsupportedMediaTypeError when requireJsonContentType is true and content-type is missing or wrong", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ a: 1 }),
    });
    await expect(
      parseJsonBody(req, { requireJsonContentType: true }),
    ).rejects.toThrow(UnsupportedMediaTypeError);
  });
});
