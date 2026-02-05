/**
 * AppSpec data contracts and JSON Schema for Structured Outputs.
 * This schema is fed into OpenAI Responses API for deterministic output.
 */

// --- TypeScript types (source of truth) ---

export interface EntityField {
  name: string;
  type: string;
  required?: boolean;
  unique?: boolean;
  description?: string;
}

export interface Entity {
  name: string;
  primary_key: string;
  fields: EntityField[];
}

export type RelationshipType = "one_to_one" | "one_to_many" | "many_to_many";

export interface Relationship {
  from_entity: string;
  to_entity: string;
  type: RelationshipType;
  foreign_key?: string;
}

export interface Permission {
  role: string;
  entity: string;
  actions: string[];
}

export interface WorkflowStep {
  action: string;
  entity?: string;
  conditions?: string[];
}

export interface Workflow {
  name: string;
  trigger: string;
  steps: WorkflowStep[];
}

export interface UISuggestion {
  screen?: string;
  description: string;
  components?: string[];
}

export interface AppSpec {
  app_name: string;
  entities: Entity[];
  relationships: Relationship[];
  roles: string[];
  permissions: Permission[];
  workflows: Workflow[];
  ui_suggestions: UISuggestion[];
  assumptions: string[];
}

// --- Review / QA response ---

export interface SpecReview {
  score: number;
  missing: string[];
  ambiguities: string[];
  questions: string[];
}

// --- JSON Schema for OpenAI Structured Outputs (extraction) ---
// https://platform.openai.com/docs/guides/structured-outputs

export const appSpecJsonSchema = {
  type: "object",
  properties: {
    app_name: { type: "string", description: "Application name" },
    entities: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          primary_key: { type: "string" },
          fields: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                type: { type: "string" },
                required: { type: "boolean" },
                unique: { type: "boolean" },
                description: { type: "string" },
              },
              required: ["name", "type"],
            },
          },
        },
        required: ["name", "primary_key", "fields"],
      },
    },
    relationships: {
      type: "array",
      items: {
        type: "object",
        properties: {
          from_entity: { type: "string" },
          to_entity: { type: "string" },
          type: { type: "string", enum: ["one_to_one", "one_to_many", "many_to_many"] },
          foreign_key: { type: "string" },
        },
        required: ["from_entity", "to_entity", "type"],
      },
    },
    roles: { type: "array", items: { type: "string" } },
    permissions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          role: { type: "string" },
          entity: { type: "string" },
          actions: { type: "array", items: { type: "string" } },
        },
        required: ["role", "entity", "actions"],
      },
    },
    workflows: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          trigger: { type: "string" },
          steps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                action: { type: "string" },
                entity: { type: "string" },
                conditions: { type: "array", items: { type: "string" } },
              },
              required: ["action"],
            },
          },
        },
        required: ["name", "trigger", "steps"],
      },
    },
    ui_suggestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          screen: { type: "string" },
          description: { type: "string" },
          components: { type: "array", items: { type: "string" } },
        },
        required: ["description"],
      },
    },
    assumptions: { type: "array", items: { type: "string" } },
  },
  required: [
    "app_name",
    "entities",
    "relationships",
    "roles",
    "permissions",
    "workflows",
    "ui_suggestions",
    "assumptions",
  ],
  additionalProperties: false,
} as const;
