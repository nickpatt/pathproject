import { z } from "zod";
import type { AppSpec } from "./schema";

const entityFieldSchema = z.object({
  name: z.string(),
  type: z.string(),
  required: z.boolean().nullable().optional(),
  unique: z.boolean().nullable().optional(),
  description: z.string().nullable().optional(),
});

const entitySchema = z.object({
  name: z.string(),
  primary_key: z.string(),
  fields: z.array(entityFieldSchema),
});

const relationshipSchema = z.object({
  from_entity: z.string(),
  to_entity: z.string(),
  type: z.enum(["one_to_one", "one_to_many", "many_to_many"]),
  foreign_key: z.string().nullable().optional(),
});

const permissionSchema = z.object({
  role: z.string(),
  entity: z.string(),
  actions: z.array(z.string()),
});

const workflowStepSchema = z.object({
  action: z.string(),
  entity: z.string().nullable().optional(),
  conditions: z.array(z.string()).nullable().optional(),
});

const workflowSchema = z.object({
  name: z.string(),
  trigger: z.string(),
  steps: z.array(workflowStepSchema),
});

const uiSuggestionSchema = z.object({
  screen: z.string().nullable().optional(),
  description: z.string(),
  components: z.array(z.string()).nullable().optional(),
});

export const appSpecSchema = z.object({
  app_name: z.string(),
  entities: z.array(entitySchema),
  relationships: z.array(relationshipSchema),
  roles: z.array(z.string()),
  permissions: z.array(permissionSchema),
  workflows: z.array(workflowSchema),
  ui_suggestions: z.array(uiSuggestionSchema),
  assumptions: z.array(z.string()),
});

export function validateAppSpec(data: unknown): { success: true; data: AppSpec } | { success: false; error: string } {
  const result = appSpecSchema.safeParse(data);
  if (result.success) return { success: true, data: result.data as AppSpec };
  const msg = result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
  return { success: false, error: msg };
}
