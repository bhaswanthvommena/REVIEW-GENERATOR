import { readFileSync } from "node:fs";
import path from "node:path";
import { PROMPT_VERSION } from "./schemas";

export type DraftPromptInput = {
  businessName: string;
  ratings: Array<{ label: string; rating: number }>;
  comment: string | null;
  stricter?: boolean;
};

let cachedSystemPrompt: string | null = null;

export function loadSystemPrompt(): string {
  if (cachedSystemPrompt) {
    return cachedSystemPrompt;
  }
  const filePath = path.join(
    process.cwd(),
    "prompts",
    "review-draft",
    "v1.md",
  );
  cachedSystemPrompt = readFileSync(filePath, "utf8");
  return cachedSystemPrompt;
}

export function buildUserPayload(input: DraftPromptInput): string {
  const lines = [
    `Business name: ${input.businessName}`,
    "Attribute ratings:",
    ...input.ratings.map((r) => `- ${r.label}: ${r.rating}/5`),
    `Optional comment: ${input.comment?.trim() ? input.comment.trim() : "(none)"}`,
  ];

  if (input.stricter) {
    lines.push(
      "",
      "STRICT RETRY: Do not invent any specifics. Use only the ratings and comment. Keep the draft shorter if the comment is empty.",
    );
  }

  return lines.join("\n");
}

export function getPromptVersion(): typeof PROMPT_VERSION {
  return PROMPT_VERSION;
}
