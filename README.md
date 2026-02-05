# Requirements → AppSpec

Paste messy business requirements → get **AppSpec JSON** (entities, relationships, roles, permissions, workflows, UI suggestions), a **human-readable summary**, and **Spec QA** (score, issues, clarifying questions).

- **Structured Outputs**: Schema-valid JSON via OpenAI Responses API (no Assistants API).
- **Stack**: Next.js 14 (App Router), TypeScript, Tailwind, OpenAI SDK.

## Quick start

1. **Clone and install**
   ```bash
   cd pathproject && npm install
   ```

2. **Environment**
   - Copy `.env.example` to `.env.local`
   - Set `OPENAI_API_KEY` (server-side only)

3. **Run**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Demo flow

1. Paste requirements in the textarea (or use a **preset**: Orders + refunds, Support tickets, Inventory + vendors).
2. Click **Generate Spec** → AppSpec JSON + summary.
3. Click **Review Spec** → QA score, missing items, ambiguities, 5–10 clarifying questions.
4. **Export**: Copy JSON, download `appspec.json`, or expand “Export Path-ready prompt”.

## Project layout

| Path | Purpose |
|------|--------|
| `app/page.tsx` | Single-page UI (textarea, presets, tabs, export) |
| `app/api/extract/route.ts` | POST extract → AppSpec |
| `app/api/review/route.ts` | POST review → score, missing, ambiguities, questions |
| `lib/schema.ts` | AppSpec TypeScript types + JSON Schema for Structured Outputs |
| `lib/validators.ts` | Zod-based validation |
| `lib/prompts.ts` | System prompts for extract and QA |
| `lib/rateLimit.ts` | In-memory per-IP rate limit |
| `lib/constants.ts` | MAX_INPUT_LENGTH, MIN_INPUT_LENGTH |

## Tests

```bash
npm run test
```

- **Unit**: `lib/validators.test.ts` — schema accepts sample output.
- **Integration**: `app/api/extract/route.test.ts` — empty/short input returns friendly error.

(Optional: add integration test that calls extract with each preset when `OPENAI_API_KEY` is set.)

## Screenshots / video

- Add a short **Loom (60–90s)**: paste requirements → generate spec → show QA questions → explain value (“reduces onboarding friction + improves build accuracy”).
- Add 1–2 **screenshots or a gif** of the one-page UI.

## Non-functional notes

- **Rate limit**: In-memory, per-IP (configurable in `lib/rateLimit.ts`).
- **Input length**: Truncation at 12k chars with warning.
- **Safety**: Empty/too-short input rejected with clear messages; “no entities” can be surfaced in UI from API response.
- **Security**: API key only on server; do not log raw user text in production.

## License

Private / internal use.
