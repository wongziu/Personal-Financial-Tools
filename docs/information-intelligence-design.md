# Information Intelligence Design

## Goal

Build a reusable information intelligence layer for the local investment decision system. The first implementation converts external source text and URLs into structured information-source drafts; later iterations reuse the same extraction result in theses, review events, trade decisions, and risk review.

## Current Scope

- Configuration lives in `system_settings`, exposed through the right-top settings dialog.
- Model API configuration is OpenAI-compatible, with API keys referenced by environment variable name rather than stored as plaintext in SQLite.
- Source intelligence works in two modes:
  - `model`: call the configured chat-completions API when the environment variable is present.
  - `local`: deterministic fallback that creates a reviewable draft without any external model call.
- FX refresh uses the same settings architecture and is intentionally independent from the information intelligence pipeline.

## External Information Pipeline

1. User selects a security and enters source URL plus source text.
2. System builds an auditable extraction prompt with security name, source URL, evidence-level definitions, thesis-impact options, and source text.
3. If model API is configured and the API key environment variable exists, the model returns strict JSON fields.
4. If the model is unavailable or the call fails, the system falls back to a local deterministic draft.
5. User reviews the draft and applies it to the information-source form.
6. The same structured result is designed to be reusable by theses, review events, and trade decisions.

## Data Contract

The draft contains:

- `informationDate`
- `obtainedDate`
- `sourceName`
- `sourceUrl`
- `informationType`
- `evidenceLevel`
- `keyFacts`
- `thesisImpact`
- `triggersReview`

The reuse targets are configurable and default to:

- `sources`
- `theses`
- `trade-decisions`
- `review-events`

## Configuration

### Model API

- Provider: `openai-compatible` or `disabled`
- Base URL: default `https://api.openai.com/v1`
- Model: default `gpt-4.1-mini`
- API key mode: `env`
- API key environment variable: default `OPENAI_API_KEY`
- Temperature: default `0.2`

### Source Intelligence

- Enabled switch
- Trusted domains
- Max candidate sources
- Reuse targets
- Global extraction prompt

## Reflection Round 1

Initial idea: add a model configuration form and call the model directly from the information-source page.

Problem: that couples one page to the model API and makes later thesis/decision reuse harder.

Revision: create a reusable service layer, `source-intelligence`, whose output is a module-neutral draft. The Sources page is only the first consumer.

## Reflection Round 2

Initial idea: store API keys in settings for convenience.

Problem: this is a local SQLite app, but plaintext secrets in the app database are still a bad default and would leak through exports or backups.

Revision: store only the environment variable name. The UI communicates that API keys are loaded from the local environment, and the service falls back to local draft mode when the key is absent.

## Reflection Round 3

Initial idea: make intelligence generation fully automatic and save records directly.

Problem: investment evidence needs auditability. Automatically saving model-generated records would blur the line between external facts, model interpretation, and user-approved evidence.

Revision: generate a draft only. The user must apply it to the source form and save through the existing server-side validation path.

## UX Placement

Information intelligence belongs above the Sources list, not in a separate page, because source ingestion is the beginning of the research workflow. The higher-level navigation is reorganized into workspaces:

- Portfolio Workspace: Accounts, Account Calendar, Securities
- Ledger & Market Data: Transactions, Cashflows, Prices, FX Rates
- Research Workspace: Sources, Theses, Review Events, Trade Decisions
- Governance & Export: Risk Rules, Exceptions, Export

This keeps existing deep links available while making everyday use less like a database admin screen.

## Implementation Status

- Settings dialog implemented.
- FX settings and manual/automatic refresh API implemented.
- Model API settings implemented.
- Source-intelligence draft API implemented.
- Sources page draft panel implemented.
- Workspace tab pages implemented.

## Next Reuse Points

- Add a thesis-assist panel that turns accepted source drafts into thesis delta suggestions.
- Add a trade-decision-assist panel that summarizes linked thesis and source evidence.
- Add review-event generation from source drafts when `triggersReview` is true.
