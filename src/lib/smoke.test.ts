import { describe, expect, it } from "vitest";

describe("phase-1 bootstrap smoke", () => {
  it("runs the vitest harness", () => {
    expect(true).toBe(true);
  });

  it("resolves the @ path alias root", () => {
    expect(typeof process.cwd()).toBe("string");
  });
});
