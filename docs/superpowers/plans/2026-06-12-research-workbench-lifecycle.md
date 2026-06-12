# Research Workbench Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the research workbench directly distinguish observed, held, exited, and candidate securities; make AI stock picking default away from exited securities; show visible agent progress while stock picking runs.

**Architecture:** Add one derived lifecycle service from existing tables and settled transactions, then reuse that service in the AI workflow and research UI. Keep the persistence model unchanged; the new behavior is a read/projection layer plus request filtering and UI state.

**Tech Stack:** Next.js App Router, TypeScript, React client components, SQLite via better-sqlite3, Vitest, Playwright.

---

### Task 1: Security Lifecycle Projection

**Files:**
- Create: `src/lib/security-lifecycle.ts`
- Test: `src/lib/security-lifecycle.test.ts`

- [ ] **Step 1: Write the failing lifecycle tests**

Add tests that seed demo data, then insert specific securities and settled transactions:

```ts
import { describe, expect, test } from "vitest";
import { createDatabase } from "@/lib/db/client";
import { seedDemoData } from "@/lib/db/seed";
import { getSecurityLifecycleMap } from "@/lib/security-lifecycle";

function insertSecurity(database: ReturnType<typeof createDatabase>, id: string, status = "Allowed", assetType = "Stock") {
  database.sqlite.prepare(`
    INSERT INTO securities (
      id, account_id, name, ticker, asset_type, market, currency,
      industry_level_1, industry_level_2, risk_theme_tags, liquidity_level,
      investment_status, benchmark, fee_note, complexity
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, "ACC-US-001", id, id, assetType, "US", "USD", "InformationTechnology", "Software", "[]", "High", status, "S&P 500", "N/A", "Simple");
}

describe("security lifecycle", () => {
  test("derives holding, exited, observed, candidate, and blocked securities", () => {
    const database = createDatabase(":memory:");
    seedDemoData(database);
    insertSecurity(database, "US-EXITED");
    insertSecurity(database, "US-CANDIDATE");
    insertSecurity(database, "US-WATCH", "Watch");
    insertSecurity(database, "US-BLOCKED", "Prohibited");
    insertSecurity(database, "US-CASH", "Allowed", "Cash");

    database.sqlite.prepare(`
      INSERT INTO transactions (
        id, account_id, security_id, strategy_type, transaction_type, status,
        trade_date, quantity, unit_price, gross_amount, commission, tax,
        other_fees, currency, fx_rate_to_base, base_currency_amount,
        decision_id, cashflow_id, correction_of_id, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run("TRD-EXIT-BUY", "ACC-US-001", "US-EXITED", "Active", "Buy", "Settled", "2026-01-01", 10, 10, 100, 0, 0, 0, "USD", 7, 700, null, null, null, "")
      .run("TRD-EXIT-SELL", "ACC-US-001", "US-EXITED", "Active", "Sell", "Settled", "2026-02-01", 10, 11, 110, 0, 0, 0, "USD", 7, 770, null, null, null, "");

    const lifecycle = getSecurityLifecycleMap(database);

    expect(lifecycle.get("US-AAPL")?.bucket).toBe("holding");
    expect(lifecycle.get("US-EXITED")?.bucket).toBe("exited");
    expect(lifecycle.get("US-WATCH")?.bucket).toBe("observed");
    expect(lifecycle.get("US-CANDIDATE")?.bucket).toBe("candidate");
    expect(lifecycle.get("US-BLOCKED")?.bucket).toBe("blocked");
    expect(lifecycle.get("US-CASH")?.bucket).toBe("blocked");
  });
});
```

Run: `npm test -- src/lib/security-lifecycle.test.ts`

Expected before implementation: module import fails.

- [ ] **Step 2: Implement `getSecurityLifecycleMap`**

Create `src/lib/security-lifecycle.ts` with exported bucket types, labels, universe types, and a function that uses `calculateHoldings(transactionRows)` semantics locally to classify each security.

- [ ] **Step 3: Verify lifecycle tests pass**

Run: `npm test -- src/lib/security-lifecycle.test.ts`

Expected: PASS.

### Task 2: AI Workflow Universe Filtering

**Files:**
- Modify: `src/lib/research-iteration-workflow.ts`
- Modify: `src/app/api/research-iteration-workflow/route.ts`
- Test: `src/lib/research-iteration-workflow.test.ts`

- [ ] **Step 1: Write failing AI universe tests**

Add tests that:

```ts
expect(defaultResult.candidates.map((candidate) => candidate.securityId)).not.toContain("US-EXITED");
expect(exitedResult.candidates.map((candidate) => candidate.securityId)).toEqual(["US-EXITED"]);
expect(defaultResult.candidates[0].lifecycleBucket).toMatch(/holding|observed|candidate/);
```

Run: `npm test -- src/lib/research-iteration-workflow.test.ts`

Expected before implementation: `lifecycleBucket` is missing or exited appears in default candidates.

- [ ] **Step 2: Add universe input and candidate lifecycle fields**

Add:

```ts
export type ResearchIterationUniverse = "active-research" | "observed" | "holding" | "candidate" | "exited" | "researchable";
```

Extend input/result candidates with `universe` and `lifecycleBucket`. Default `universe` to `"active-research"`.

- [ ] **Step 3: Filter candidates through lifecycle service**

Replace `securitiesForMarket()` use in strategy workflow with market-filtered lifecycle entries:

- `active-research`: observed, holding, candidate
- `observed`: observed only
- `holding`: holding only
- `candidate`: candidate only
- `exited`: exited only
- `researchable`: observed, holding, candidate, exited

Exclude `blocked` from all strategy runs.

- [ ] **Step 4: Verify workflow tests pass**

Run: `npm test -- src/lib/research-iteration-workflow.test.ts`

Expected: PASS.

### Task 3: Research UI Lifecycle Controls and Progress

**Files:**
- Modify: `src/components/module-workspace.tsx`
- Modify: `src/components/ai-stock-picks-panel.tsx`
- Modify: `src/components/research-workbench-panels.tsx`

- [ ] **Step 1: Update server-provided security options**

In `module-workspace.tsx`, enrich research security reference options with lifecycle metadata:

```ts
metadata: {
  market,
  lifecycleBucket,
  lifecycleLabel,
  holdingQuantity,
  sourceCount,
  thesisCount,
  reviewEventCount,
  tradeDecisionCount
}
```

- [ ] **Step 2: Add AI universe UI**

In `AiStockPicksPanel`, add `universe` state and a `选股范围` select with six options from Task 2. Filter the reference security dropdown by market and selected universe. Include `universe` in the POST body.

- [ ] **Step 3: Add visible stage progress**

Add a local `progressStages` array. On click, set stages to queued/running/completed while the request is pending. On success, replace them with returned server stages; on failure, mark current stage failed and keep the error visible.

- [ ] **Step 4: Display lifecycle on candidate cards**

Show `candidate.lifecycleBucket` as a badge, using the label from `metadata.lifecycleLabel` or a local label map.

- [ ] **Step 5: Add decision center lifecycle summary**

Show a compact four-column summary for observed, holding, exited, and candidate counts above existing decision cards.

### Task 4: E2E Coverage

**Files:**
- Modify: `tests/e2e/core.spec.ts`

- [ ] **Step 1: Update mocked AI response**

Include `universe: "active-research"` and `lifecycleBucket: "observed"` in mocked response.

- [ ] **Step 2: Assert UI controls and request body**

Extend the stock-picking e2e to assert:

```ts
await expect(panel.getByRole("combobox", { name: "选股范围" })).toBeVisible();
await panel.getByRole("combobox", { name: "选股范围" }).click();
await page.getByRole("option", { name: "默认研究范围" }).click();
await panel.getByRole("button", { name: "立即更新选股" }).click();
expect(requests[0]).toMatchObject({ triggerType: "strategy-run", market: "US", universe: "active-research" });
await expect(panel.getByText("Agent 进度")).toBeVisible();
await expect(result.getByText("观察池")).toBeVisible();
```

Run: `PLAYWRIGHT_PORT=3126 npm run test:e2e -- --reporter=line tests/e2e/core.spec.ts`

Expected after implementation: PASS.

### Task 5: Documentation and Verification

**Files:**
- Modify: `docs/function-knowledge-graph.md`

- [ ] **Step 1: Update function graph**

Add lifecycle projection to the research graph and AI stock picking row.

- [ ] **Step 2: Run verification**

Run:

```bash
npm run lint
npm run typecheck
npm test
npm run build
PLAYWRIGHT_PORT=3126 npm run test:e2e -- --reporter=line
```

Expected: all pass.

- [ ] **Step 3: Browser smoke check**

Open `/research`, switch to `AI 自驱选股`, verify market and universe controls, click update, and confirm progress plus lifecycle labels render.

- [ ] **Step 4: Commit, merge, push**

Commit implementation on `codex/research-workbench-lifecycle`, merge to `main`, push `main` to GitHub.

