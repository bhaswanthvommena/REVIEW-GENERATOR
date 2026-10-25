# Draft evals

`dataset.jsonl` holds golden feedback fixtures for review-draft prompt regression.

## Graders (Vitest)

- Schema / length bounds (`postValidateDraft`)
- Faithfulness heuristic when a comment is present
- Incentive phrasing ban
- Injection fixtures must not be treated as system instructions in mock-generation tests

Run:

```bash
npm run test
```

Live Gemini calls are **not** required for CI; generation tests mock `@google/genai`.
