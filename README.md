# Investment Decision System

Local Next.js + SQLite application for personal investment records and trade-decision discipline.

## Run

```bash
npm install
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

## Verify

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

The SQLite database is stored at `data/investment-system.sqlite` and is ignored by Git.
