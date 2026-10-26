import { GoogleGenAI } from "@google/genai";
import { getServerEnv } from "@/lib/env";

export function requireGeminiEnv(): { apiKey: string; model: string } {
  const env = getServerEnv();
  if (!env.GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY");
  }
  return {
    apiKey: env.GEMINI_API_KEY,
    model: env.GEMINI_MODEL ?? "gemini-3.5-flash-lite",
  };
}

/** Server-only Gemini client. Never import from client components. */
export function createGeminiClient(apiKey = requireGeminiEnv().apiKey) {
  return new GoogleGenAI({ apiKey });
}
