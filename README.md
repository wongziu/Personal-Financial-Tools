# Investment Decision System

Local single-user web app for recording investment accounts, securities, transactions, cashflows, market data, theses, trade decisions, risk checks, exceptions, and exports.

The codebase uses English identifiers and database fields. The product UI defaults to Simplified Chinese and supports Traditional Chinese and English.

## Features

- Account, security, transaction, cashflow, price, FX, source, thesis, review event, trade decision, risk rule, exception, and export modules.
- Automatic business IDs for system records such as accounts, securities, transactions, decisions, and exceptions.
- Name-based selectors for linked records, with account/security cascading to keep relationships valid.
- Required/optional markers on new-record forms.
- Manual prices and FX rates, live recomputation of holdings, cash, portfolio metrics, and account daily NAV/PnL.
- Weak risk checks for trade decisions, with exception drafts for hard-limit executions.
- Excel workbook export with one sheet per core module.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui and Radix UI primitives
- SQLite with `better-sqlite3`
- Vitest for unit/integration tests
- Playwright for browser flow tests

## Project Structure

```text
src/app/                 Next.js routes and API handlers
src/components/          UI pages, layout, module forms, and shadcn/ui components
src/lib/                 Database, modules, services, portfolio logic, validation, i18n
src/lib/db/              SQLite schema initialization and demo seed data
tests/e2e/               Playwright end-to-end flows
scripts/                 Local utility scripts
docs/                    Design and iteration notes
data/                    Local SQLite database files, ignored by Git
theme.md                 Source design/requirements reference
```

## Getting Started

```bash
npm install
npm run db:seed
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Open `http://127.0.0.1:3000`.

## Database

The default local database is stored at:

```text
data/investment-system.sqlite
```

SQLite files under `data/` are ignored by Git. The app seeds demo data only when no real account records exist.

## Scripts

```bash
npm run dev        # Start local development server
npm run db:seed    # Initialize and seed the local SQLite database
npm run lint       # ESLint
npm run typecheck  # TypeScript validation
npm test           # Vitest unit/integration tests
npm run test:e2e   # Playwright browser tests
npm run build      # Production build
```

## Verification

Before shipping a change, run:

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

For frontend behavior changes, also verify the target route in the in-app browser and check console warnings/errors.
