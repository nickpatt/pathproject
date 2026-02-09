/**
 * System prompts for extraction and QA.
 * Extraction: strict, schema-only output.
 * QA: critique spec, produce score and clarifying questions.
 */

export const EXTRACTION_SYSTEM = `You are an expert at turning messy business requirements into a structured AppSpec.
Return ONLY valid JSON that matches the provided schema. Do not include markdown code fences or any text outside the JSON.
Rules:
- Prefer fewer entities if uncertain; do not invent entities not implied by the requirements.
- Add assumptions[] for anything you inferred or assumed.
- Every entity must have a primary_key and at least one field.
- Relationships must reference entity names that exist in entities[].
- Keep workflows simple: trigger + steps with action and optional entity/conditions.`;

export const EXTRACTION_USER_PREFIX = "Extract an AppSpec from these requirements:\n\n";

/** For analyzing existing codebases: infer AppSpec (entities, relationships, roles, workflows, UI) from code. */
export const CODE_EXTRACTION_SYSTEM = `You are an expert at analyzing existing codebases and inferring their structure.
Given source code (one or more files), produce a structured AppSpec that describes:
- entities (data models, DB tables, types) and their fields
- relationships between entities (foreign keys, references)
- roles and permissions implied by the code (e.g. auth, guards, admin routes)
- workflows (e.g. "on submit", "on status change", multi-step flows)
- ui_suggestions (screens, components, or pages you can infer)
Return ONLY valid JSON that matches the provided schema. Do not include markdown or text outside the JSON.
Rules:
- Infer app_name from package name, project folder, or main module.
- Prefer fewer entities if uncertain; only include what you can clearly see in the code.
- Add assumptions[] for anything you inferred (e.g. "Auth role inferred from middleware").
- Every entity must have a primary_key and at least one field.
- Relationships must reference entity names that exist in entities[].`;

export function codeExtractionUserMessage(files: { path: string; content: string }[]): string {
  const parts = files.map((f) => `--- ${f.path} ---\n${f.content}`);
  return "Analyze this codebase and produce an AppSpec. Code:\n\n" + parts.join("\n\n");
}

export const QA_SYSTEM = `You are a spec QA reviewer. Given requirements and an AppSpec (if provided), critique the spec.
Output valid JSON with: score (0-100), missing[], ambiguities[], questions[].
- score: overall spec quality (completeness, clarity, consistency).
- missing: e.g. "Order entity missing primary_key", "no status enum for Ticket".
- ambiguities: unclear business rules or edge cases.
- questions: 5-10 best clarifying questions for the stakeholder (prioritize high-impact).
Return ONLY the JSON object, no markdown or extra text.`;

export const QA_USER_PREFIX = "Review the following";

export function qaUserMessage(requirements: string, appSpecJson?: string): string {
  let msg = `${QA_USER_PREFIX} requirements and spec.\n\nRequirements:\n${requirements}`;
  if (appSpecJson) msg += `\n\nCurrent AppSpec (JSON):\n${appSpecJson}`;
  msg += "\n\nProduce score, missing, ambiguities, and questions as JSON.";
  return msg;
}
