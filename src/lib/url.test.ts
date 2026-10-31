import { describe, expect, it } from "vitest";
import { safeInternalPath } from "./url";

describe("safeInternalPath", () => {
  it("allows normal dashboard and internal paths", () => {
    expect(safeInternalPath("/dashboard")).toBe("/dashboard");
    expect(safeInternalPath("/dashboard/qr")).toBe("/dashboard/qr");
    expect(safeInternalPath("/r/token-123")).toBe("/r/token-123");
  });

  it("falls back for empty or null", () => {
    expect(safeInternalPath(null)).toBe("/dashboard");
    expect(safeInternalPath("")).toBe("/dashboard");
    expect(safeInternalPath(undefined)).toBe("/dashboard");
  });

  it("rejects external URLs and protocol-relative paths", () => {
    expect(safeInternalPath("https://evil.example.com")).toBe("/dashboard");
    expect(safeInternalPath("//evil.example.com")).toBe("/dashboard");
    expect(safeInternalPath("///evil.example.com")).toBe("/dashboard");
  });

  it("rejects backslash bypasses and encoded backslashes", () => {
    expect(safeInternalPath("/\\evil.com")).toBe("/dashboard");
    expect(safeInternalPath("/%5Cevil.com")).toBe("/dashboard");
    expect(safeInternalPath("/%2Fevil.com")).toBe("/dashboard");
  });

  it("rejects dotfile and directory traversal paths", () => {
    expect(safeInternalPath("/.well-known/change-password")).toBe("/dashboard");
    expect(safeInternalPath("/../etc/passwd")).toBe("/dashboard");
    expect(safeInternalPath("/dashboard/../settings")).toBe("/dashboard");
  });
});
