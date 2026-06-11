# Research Workbench Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the research workbench's user-facing module sprawl with three readable retail-investor flows: information analysis, AI stock picking, and my decisions.

**Architecture:** Keep the existing database tables and workflow APIs as implementation details. Change the `/research` tab structure and add focused panels that summarize existing data instead of exposing every backend table as a primary tab.

**Tech Stack:** Next.js App Router, React client components, TypeScript, Tailwind CSS, SQLite, Vitest, Playwright.

---

### Task 1: Reduce Research Workbench Navigation

**Files:**
- Modify: `src/app/research/page.tsx`
- Modify: `src/components/module-workspace.tsx`

- [x] **Step 1: Replace research tabs with three user-facing tabs**

Use these tabs:

```ts
const tabs: WorkspaceTab[] = [
  { id: "information-analysis", labelZh: "信息分析", labelEn: "Information Analysis", special: "information-analysis" },
  { id: "ai-picks", labelZh: "AI 自驱选股", labelEn: "AI Stock Picks", special: "ai-picks" },
  { id: "my-decisions", labelZh: "我的决策", labelEn: "My Decisions", special: "decision-center" }
];
```

- [x] **Step 2: Extend workspace special render types**

Add special render cases for `information-analysis`, `ai-picks`, and `decision-center` while keeping old special cases for existing pages.

### Task 2: Add Simplified Panels

**Files:**
- Create: `src/components/research-workbench-panels.tsx`
- Create: `src/components/ai-stock-picks-panel.tsx`
- Modify: `src/components/source-intelligence-panel.tsx`

- [x] **Step 1: Make source draft apply optional**

When `onApplyDraft` is absent, hide the "应用到新建记录" button and keep the generated draft readable.

- [x] **Step 2: Create information analysis panel**

Show the source intelligence input plus latest source and thesis cards.

- [x] **Step 3: Create AI stock picks panel**

Call `POST /api/research-iteration-workflow` with `triggerType: "strategy-run"` and render candidate action cards.

- [x] **Step 4: Create decision center panel**

Summarize trade decisions and pending review events as user-readable cards.

### Task 3: Update Docs And Tests

**Files:**
- Modify: `docs/function-knowledge-graph.md`
- Modify: `tests/e2e/core.spec.ts`

- [x] **Step 1: Update function graph research section**

Document that `/research` exposes three user-facing tabs while the detailed tables remain backend/legacy routes.

- [x] **Step 2: Update e2e tests**

Change research workspace expectations from many backend tabs to three simplified tabs. Keep AI strategy workflow coverage through the new AI picks tab.

### Task 4: Verify

**Commands:**

```bash
npm run build
npm run typecheck
npm run lint
npm test
PLAYWRIGHT_PORT=3122 npm run test:e2e -- --reporter=line
```
