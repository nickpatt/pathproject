"use client";

import { useState, useCallback } from "react";
import type { AppSpec } from "@/lib/schema";
import type { SpecReview } from "@/lib/schema";

const MAX_INPUT_LENGTH = 12_000;
const PRESETS = {
  "Orders + refunds": `We need to manage orders and refunds. Each order has an id, customer id, total amount, status (pending, paid, shipped, delivered, cancelled), and created date. Customers have id, name, email. A customer can have many orders. Refunds link to an order and have amount, reason, status (pending, approved, rejected), and created date. Only admins can approve refunds; support can create and read refunds. Workflow: when order status becomes "delivered", allow refund request; approval sends notification.`,
  "Support tickets": `Support ticket system. Tickets have: id, subject, description, status (open, in_progress, waiting, resolved, closed), priority (low, medium, high), assignee (user id), created_at, updated_at. Users have id, name, email, role (agent, admin). Agents can create/read/update tickets assigned to them; admins can do everything. Workflow: new ticket → auto-assign to round-robin agent; when status = resolved, trigger customer satisfaction survey.`,
  "Inventory + vendors": `Inventory and vendor management. Products: id, sku, name, quantity_on_hand, reorder_level, vendor_id. Vendors: id, name, contact_email, payment_terms. Purchase orders: id, vendor_id, status (draft, sent, received), order_date, line items (product_id, quantity, unit_price). Warehouse role can update inventory; procurement can create POs and receive. Workflow: when product quantity falls below reorder_level, create draft PO for that vendor.`,
} as const;

type TabId = "summary" | "json" | "qa";

function summarizeSpec(spec: AppSpec): string {
  const parts: string[] = [];
  parts.push(`App: ${spec.app_name}`);
  parts.push(`\nEntities (${spec.entities.length}): ${spec.entities.map((e) => e.name).join(", ")}`);
  parts.push(`\nRelationships: ${spec.relationships.length}`);
  parts.push(`\nRoles: ${spec.roles.join(", ")}`);
  parts.push(`\nWorkflows: ${spec.workflows.map((w) => w.name).join(", ")}`);
  if (spec.assumptions?.length) {
    parts.push(`\nAssumptions: ${spec.assumptions.join("; ")}`);
  }
  return parts.join("");
}

export default function Home() {
  const [requirements, setRequirements] = useState("");
  const [appSpec, setAppSpec] = useState<AppSpec | null>(null);
  const [review, setReview] = useState<SpecReview | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("summary");
  const [loading, setLoading] = useState<"extract" | "review" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAssumptions, setShowAssumptions] = useState(false);
  const [truncated, setTruncated] = useState(false);

  const fetchExtract = useCallback(async () => {
    setError(null);
    setTruncated(false);
    if (!requirements.trim()) {
      setError("Please enter requirements text.");
      return;
    }
    if (requirements.length > MAX_INPUT_LENGTH) {
      setError(`Input exceeds ${MAX_INPUT_LENGTH} characters. It will be truncated.`);
      setTruncated(true);
    }
    setLoading("extract");
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: requirements.slice(0, MAX_INPUT_LENGTH) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Extract failed");
      setAppSpec(data.appSpec);
      if (data.truncated) setTruncated(true);
      setActiveTab("summary");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Extract failed");
    } finally {
      setLoading(null);
    }
  }, [requirements]);

  const fetchReview = useCallback(async () => {
    setError(null);
    if (!requirements.trim()) {
      setError("Please enter requirements text.");
      return;
    }
    setLoading("review");
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: requirements, appSpec: appSpec ?? undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Review failed");
      setReview(data);
      setActiveTab("qa");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Review failed");
    } finally {
      setLoading(null);
    }
  }, [requirements, appSpec]);

  const copyJson = useCallback(() => {
    if (!appSpec) return;
    navigator.clipboard.writeText(JSON.stringify(appSpec, null, 2));
  }, [appSpec]);

  const downloadJson = useCallback(() => {
    if (!appSpec) return;
    const blob = new Blob([JSON.stringify(appSpec, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "appspec.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }, [appSpec]);

  const copyQa = useCallback(() => {
    if (!review) return;
    navigator.clipboard.writeText(JSON.stringify(review, null, 2));
  }, [review]);

  const copySummary = useCallback(() => {
    if (!appSpec) return;
    navigator.clipboard.writeText(summarizeSpec(appSpec));
  }, [appSpec]);

  const presetKeys = Object.keys(PRESETS) as (keyof typeof PRESETS)[];

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Requirements → AppSpec</h1>
      <p className="text-slate-600 text-sm">
        Paste business requirements below. Generate a structured AppSpec, then review for QA and clarifying questions.
      </p>

      {/* Presets */}
      <div className="flex flex-wrap gap-2">
        {presetKeys.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setRequirements(PRESETS[key])}
            className="px-3 py-1.5 rounded-md bg-slate-200 text-slate-800 text-sm hover:bg-slate-300"
          >
            {key}
          </button>
        ))}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Requirements</label>
        <textarea
          value={requirements}
          onChange={(e) => setRequirements(e.target.value)}
          placeholder="Paste your messy business requirements here..."
          className="w-full h-40 p-3 border border-slate-300 rounded-lg font-mono text-sm resize-y"
          maxLength={MAX_INPUT_LENGTH + 100}
        />
        <div className="flex justify-between mt-1 text-xs text-slate-500">
          <span>{requirements.length} / {MAX_INPUT_LENGTH} chars</span>
          {requirements.length > MAX_INPUT_LENGTH && (
            <span className="text-amber-600">Will be truncated</span>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={fetchExtract}
          disabled={!!loading}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading === "extract" ? "Generating…" : "Generate Spec"}
        </button>
        <button
          type="button"
          onClick={fetchReview}
          disabled={!!loading}
          className="px-4 py-2 rounded-lg bg-slate-600 text-white font-medium hover:bg-slate-700 disabled:opacity-50"
        >
          {loading === "review" ? "Reviewing…" : "Review Spec"}
        </button>
      </div>

      {truncated && (
        <p className="text-amber-700 text-sm">Input was truncated to {MAX_INPUT_LENGTH} characters.</p>
      )}
      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-800 text-sm" role="alert">
          {error}
        </div>
      )}

      {/* Results tabs */}
      {(appSpec || review) && (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="flex border-b border-slate-200 bg-slate-50">
            {["summary", "json", "qa"].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab as TabId)}
                className={`px-4 py-2 text-sm font-medium capitalize ${
                  activeTab === tab ? "bg-white border-b-2 border-blue-600 text-blue-700" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tab === "qa" ? "QA / Questions" : tab === "json" ? "AppSpec JSON" : tab}
              </button>
            ))}
          </div>
          <div className="p-4 bg-white min-h-[200px]">
            {activeTab === "summary" && appSpec && (
              <div className="space-y-2">
                <div className="flex justify-end">
                  <button type="button" onClick={copySummary} className="text-sm text-blue-600 hover:underline">
                    Copy
                  </button>
                </div>
                <pre className="whitespace-pre-wrap text-sm text-slate-800 font-sans">
                  {summarizeSpec(appSpec)}
                </pre>
                {appSpec.assumptions?.length ? (
                  <div className="mt-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={showAssumptions}
                        onChange={(e) => setShowAssumptions(e.target.checked)}
                      />
                      Show assumptions
                    </label>
                    {showAssumptions && (
                      <ul className="mt-2 list-disc list-inside text-sm text-slate-600">
                        {appSpec.assumptions.map((a, i) => (
                          <li key={i}>{a}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}
              </div>
            )}
            {activeTab === "json" && appSpec && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button type="button" onClick={copyJson} className="text-sm text-blue-600 hover:underline">
                    Copy
                  </button>
                  <button type="button" onClick={downloadJson} className="text-sm text-blue-600 hover:underline">
                    Download appspec.json
                  </button>
                </div>
                <pre className="p-3 bg-slate-50 rounded overflow-x-auto text-xs font-mono text-slate-800">
                  {JSON.stringify(appSpec, null, 2)}
                </pre>
              </div>
            )}
            {activeTab === "qa" && review && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button type="button" onClick={copyQa} className="text-sm text-blue-600 hover:underline">
                    Copy
                  </button>
                </div>
                <p className="text-lg font-medium">Score: {review.score}/100</p>
                <div>
                  <h3 className="text-sm font-semibold text-slate-700">Missing</h3>
                  <ul className="list-disc list-inside text-sm text-slate-600">
                    {review.missing?.length ? review.missing.map((m, i) => <li key={i}>{m}</li>) : <li>None</li>}
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-700">Ambiguities</h3>
                  <ul className="list-disc list-inside text-sm text-slate-600">
                    {review.ambiguities?.length ? review.ambiguities.map((a, i) => <li key={i}>{a}</li>) : <li>None</li>}
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-700">Clarifying questions</h3>
                  <ul className="list-disc list-inside text-sm text-slate-600">
                    {review.questions?.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Export Path-ready prompt (optional) */}
      {appSpec && (
        <details className="border border-slate-200 rounded-lg">
          <summary className="p-3 cursor-pointer text-sm font-medium text-slate-700">
            Export Path-ready prompt
          </summary>
          <div className="p-3 border-t border-slate-200">
            <p className="text-xs text-slate-500 mb-2">
              Use this block as context for Path or other builders.
            </p>
            <pre className="p-3 bg-slate-50 rounded text-xs font-mono overflow-x-auto">
              {`App: ${appSpec.app_name}\nEntities: ${JSON.stringify(appSpec.entities)}\nRelationships: ${JSON.stringify(appSpec.relationships)}\nRoles: ${appSpec.roles.join(", ")}\nWorkflows: ${JSON.stringify(appSpec.workflows)}`}
            </pre>
          </div>
        </details>
      )}
    </main>
  );
}
