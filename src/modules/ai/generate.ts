import { ThinkingLevel, type GoogleGenAI } from "@google/genai";
import { createGeminiClient, requireGeminiEnv } from "@/lib/gemini";
import {
  buildUserPayload,
  collectDetails,
  getPromptVersion,
  loadSystemPrompt,
  type DraftDetail,
} from "./prompt";
import { pickStyleBrief, type Rng } from "./style";
import {
  DRAFT_RESPONSE_JSON_SCHEMA,
  DraftModelOutputSchema,
  faithfulnessHeuristic,
  faithfulnessToDetails,
  postValidateDraft,
  type DraftModelOutput,
} from "./schemas";

export type GenerateDraftInput = {
  businessName: string;
  businessCategory?: string | null;
  ratings: Array<{ label: string; rating: number }>;
  /** Answers to the owner's custom fields. */
  fields?: DraftDetail[];
  /** Legacy comment from sessions made before custom fields. */
  comment?: string | null;
  /** Earlier draft for this session, passed on regenerate. */
  previousDraft?: string | null;
};

export type GenerateDraftResult = {
  draftText: string;
  warnings: string[];
  model: string;
  promptVersion: string;
  usage: {
    promptTokens?: number;
    candidatesTokens?: number;
    totalTokens?: number;
  };
  validation: {
    retries: number;
    postValidateOk: boolean;
    faithfulnessOk: boolean;
    reasons: string[];
  };
};

export class DraftGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DraftGenerationError";
  }
}

type GeminiGenerateFn = (args: {
  model: string;
  system: string;
  user: string;
}) => Promise<{
  text: string;
  usage: GenerateDraftResult["usage"];
}>;

function defaultGeminiGenerate(client: GoogleGenAI): GeminiGenerateFn {
  return async ({ model, system, user }) => {
    const response = await client.models.generateContent({
      model,
      contents: user,
      config: {
        systemInstruction: system,
        responseMimeType: "application/json",
        responseJsonSchema: DRAFT_RESPONSE_JSON_SCHEMA,
        // Flash-Lite defaults to minimal thinking, which keeps short drafts fast.
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.MINIMAL,
          includeThoughts: false,
        },
        maxOutputTokens: 1024,
      },
    });

    const text = response.text ?? "";
    const meta = response.usageMetadata;
    return {
      text,
      usage: {
        promptTokens: meta?.promptTokenCount,
        candidatesTokens: meta?.candidatesTokenCount,
        totalTokens: meta?.totalTokenCount,
      },
    };
  };
}

function parseModelJson(raw: string): DraftModelOutput {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new DraftGenerationError("Model returned non-JSON output");
  }
  return DraftModelOutputSchema.parse(parsed);
}

/**
 * Generate a review draft with structured Gemini output + Zod post-validation.
 * Retries once with a stricter instruction on validation failure.
 */
export async function generateReviewDraft(
  input: GenerateDraftInput,
  options?: {
    generate?: GeminiGenerateFn;
    model?: string;
    rng?: Rng;
  },
): Promise<GenerateDraftResult> {
  const { model: defaultModel } = requireGeminiEnv();
  const model = options?.model ?? defaultModel;
  const generate =
    options?.generate ?? defaultGeminiGenerate(createGeminiClient());
  const system = loadSystemPrompt();
  const promptVersion = getPromptVersion();

  const rng = options?.rng ?? Math.random;
  const details = collectDetails({ details: input.fields });
  const brief = pickStyleBrief(
    collectDetails({ details: input.fields, comment: input.comment }).map(
      (d) => d.label,
    ),
    rng,
  );

  let lastUsage: GenerateDraftResult["usage"] = {};
  let lastReasons: string[] = [];

  for (let attempt = 0; attempt < 2; attempt++) {
    const stricter = attempt === 1;
    const user = buildUserPayload({
      businessName: input.businessName,
      businessCategory: input.businessCategory,
      ratings: input.ratings,
      details: input.fields,
      comment: input.comment,
      previousDraft: input.previousDraft,
      brief,
      stricter,
      rng,
    });

    let rawText: string;
    try {
      const result = await generate({ model, system, user });
      rawText = result.text;
      lastUsage = result.usage;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gemini error";
      if (/429|resource.?exhausted|quota/i.test(message)) {
        throw new DraftGenerationError(
          "The AI service is busy. Please try again in a moment.",
        );
      }
      throw new DraftGenerationError(message);
    }

    let modelOut: DraftModelOutput;
    try {
      modelOut = parseModelJson(rawText);
    } catch (error) {
      lastReasons = [
        error instanceof Error ? error.message : "Invalid model JSON",
      ];
      continue;
    }

    const post = postValidateDraft(modelOut.draft_text);
    const faith = faithfulnessToDetails(details, modelOut.draft_text);
    const commentFaith = faithfulnessHeuristic(input.comment, modelOut.draft_text);
    const reasons = [
      ...(post.ok ? [] : post.reasons),
      ...(faith.ok ? [] : [faith.reason]),
      ...(commentFaith.ok ? [] : [commentFaith.reason]),
    ];

    if (reasons.length === 0) {
      return {
        draftText: modelOut.draft_text,
        warnings: modelOut.warnings ?? [],
        model,
        promptVersion,
        usage: lastUsage,
        validation: {
          retries: attempt,
          postValidateOk: true,
          faithfulnessOk: true,
          reasons: [],
        },
      };
    }

    lastReasons = reasons;
  }

  throw new DraftGenerationError(
    `Could not produce a valid draft: ${lastReasons.join("; ")}`,
  );
}

