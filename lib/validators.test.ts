import { describe, it, expect } from "vitest";
import { validateAppSpec } from "./validators";

const sampleAppSpec = {
  app_name: "TestApp",
  entities: [
    {
      name: "Order",
      primary_key: "id",
      fields: [
        { name: "id", type: "uuid", required: true, unique: true },
        { name: "total", type: "number", required: true },
      ],
    },
  ],
  relationships: [
    { from_entity: "Order", to_entity: "Customer", type: "many_to_one", foreign_key: "customer_id" },
  ],
  roles: ["admin", "user"],
  permissions: [
    { role: "admin", entity: "Order", actions: ["create", "read", "update", "delete"] },
  ],
  workflows: [
    { name: "Place order", trigger: "user_submit", steps: [{ action: "create_order" }] },
  ],
  ui_suggestions: [{ description: "Order list view" }],
  assumptions: ["Customer entity exists"],
};

describe("validateAppSpec", () => {
  it("accepts valid sample output", () => {
    const fixed = {
      ...sampleAppSpec,
      relationships: [{ from_entity: "Order", to_entity: "Customer", type: "one_to_many" as const, foreign_key: "customer_id" }],
    };
    const result = validateAppSpec(fixed);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.app_name).toBe("TestApp");
      expect(result.data.entities).toHaveLength(1);
    }
  });

  it("rejects invalid relationship type", () => {
    const invalid = {
      ...sampleAppSpec,
      relationships: [{ from_entity: "A", to_entity: "B", type: "many_to_one" }],
    };
    const result = validateAppSpec(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects missing required top-level fields", () => {
    const missing = { app_name: "X", entities: [], roles: [] };
    const result = validateAppSpec(missing);
    expect(result.success).toBe(false);
  });
});
