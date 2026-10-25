import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("MVP product locks", () => {
  const pkg = JSON.parse(
    readFileSync(path.join(process.cwd(), "package.json"), "utf8"),
  ) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  const deps = {
    ...(pkg.dependencies ?? {}),
    ...(pkg.devDependencies ?? {}),
  };

  it("does not depend on OpenAI SDKs", () => {
    const openaiish = Object.keys(deps).filter(
      (name) =>
        name === "openai" ||
        name.startsWith("@openai/") ||
        name.includes("openai"),
    );
    expect(openaiish).toEqual([]);
  });

  it("does not depend on Stripe SDK in MVP", () => {
    const stripeish = Object.keys(deps).filter(
      (name) => name === "stripe" || name.startsWith("@stripe/"),
    );
    expect(stripeish).toEqual([]);
  });

  it("includes server Gemini SDK", () => {
    expect(deps["@google/genai"]).toBeTruthy();
  });

  it("env example documents Gemini not OpenAI", () => {
    const envExample = readFileSync(
      path.join(process.cwd(), ".env.example"),
      "utf8",
    );
    expect(envExample).toMatch(/GEMINI_API_KEY/);
    expect(envExample).toMatch(/GEMINI_MODEL/);
    expect(envExample).not.toMatch(/OPENAI_/);
    expect(envExample.toLowerCase()).toMatch(/not openai/);
  });
});
