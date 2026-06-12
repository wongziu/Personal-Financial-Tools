import type { DatabaseContext } from "@/lib/db/client";
import type { TransactionInput } from "@/lib/domain";
import { calculateHoldings } from "@/lib/portfolio";
import type { Row } from "@/lib/services";

export type SecurityLifecycleBucket = "observed" | "holding" | "exited" | "candidate" | "blocked";
export type SecurityLifecycleUniverse = "active-research" | "observed" | "holding" | "candidate" | "exited" | "researchable";

export interface SecurityLifecycleEntry {
  id: string;
  name: string;
  ticker: string;
  market: string;
  assetType: string;
  investmentStatus: string;
  bucket: SecurityLifecycleBucket;
  holdingQuantity: number;
  hasSettledEntryTransaction: boolean;
  sourceCount: number;
  thesisCount: number;
  reviewEventCount: number;
  tradeDecisionCount: number;
}

export const securityLifecycleLabels: Record<SecurityLifecycleBucket, { zh: string; en: string }> = {
  observed: { zh: "观察池", en: "Watchlist" },
  holding: { zh: "持仓中", en: "Holding" },
  exited: { zh: "已退出复盘", en: "Exited Review" },
  candidate: { zh: "候选池", en: "Candidate Pool" },
  blocked: { zh: "禁用", en: "Blocked" }
};

export const securityLifecycleUniverseLabels: Record<SecurityLifecycleUniverse, { zh: string; en: string }> = {
  "active-research": { zh: "默认研究范围", en: "Default Research" },
  observed: { zh: "观察池", en: "Watchlist" },
  holding: { zh: "持仓中", en: "Holdings" },
  candidate: { zh: "候选池", en: "Candidates" },
  exited: { zh: "已退出复盘", en: "Exited Review" },
  researchable: { zh: "全部可研究", en: "All Researchable" }
};

const universeBuckets: Record<SecurityLifecycleUniverse, SecurityLifecycleBucket[]> = {
  "active-research": ["observed", "holding", "candidate"],
  observed: ["observed"],
  holding: ["holding"],
  candidate: ["candidate"],
  exited: ["exited"],
  researchable: ["observed", "holding", "candidate", "exited"]
};

function allRows(database: DatabaseContext, sql: string): Row[] {
  return database.sqlite.prepare(sql).all() as Row[];
}

function countBySecurity(database: DatabaseContext, table: string): Map<string, number> {
  const rows = allRows(database, `SELECT security_id, COUNT(*) AS count FROM ${table} WHERE security_id IS NOT NULL GROUP BY security_id`);
  return new Map(rows.map((row) => [String(row.security_id), Number(row.count)]));
}

function transactionRows(database: DatabaseContext): TransactionInput[] {
  return allRows(database, "SELECT * FROM transactions").map((row) => ({
    id: String(row.id),
    accountId: String(row.account_id),
    securityId: String(row.security_id),
    strategyType: row.strategy_type as TransactionInput["strategyType"],
    transactionType: row.transaction_type as TransactionInput["transactionType"],
    status: row.status as TransactionInput["status"],
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    grossAmount: Number(row.gross_amount),
    totalFees: Number(row.commission) + Number(row.tax) + Number(row.other_fees),
    baseCurrencyAmount: Number(row.base_currency_amount),
    tradeDate: String(row.trade_date)
  }));
}

function holdingQuantityBySecurity(transactions: TransactionInput[]): Map<string, number> {
  const quantities = new Map<string, number>();
  for (const holding of calculateHoldings(transactions)) {
    quantities.set(holding.securityId, (quantities.get(holding.securityId) ?? 0) + holding.quantity);
  }
  return quantities;
}

function settledEntryTransactionSet(transactions: TransactionInput[]): Set<string> {
  return new Set(
    transactions
      .filter((transaction) => transaction.status === "Settled" && ["Buy", "Subscribe"].includes(transaction.transactionType))
      .map((transaction) => transaction.securityId)
  );
}

function deriveBucket(input: {
  assetType: string;
  investmentStatus: string;
  holdingQuantity: number;
  hasSettledEntryTransaction: boolean;
  sourceCount: number;
  thesisCount: number;
  reviewEventCount: number;
  tradeDecisionCount: number;
}): SecurityLifecycleBucket {
  if (input.assetType === "Cash" || input.investmentStatus === "Prohibited") {
    return "blocked";
  }
  if (input.holdingQuantity > 0.000001) {
    return "holding";
  }
  if (input.hasSettledEntryTransaction) {
    return "exited";
  }
  if (
    input.investmentStatus === "Watch" ||
    input.sourceCount > 0 ||
    input.thesisCount > 0 ||
    input.reviewEventCount > 0 ||
    input.tradeDecisionCount > 0
  ) {
    return "observed";
  }
  if (input.investmentStatus === "Allowed") {
    return "candidate";
  }
  return "blocked";
}

export function normalizeSecurityLifecycleUniverse(value: unknown): SecurityLifecycleUniverse {
  return Object.keys(universeBuckets).includes(String(value)) ? value as SecurityLifecycleUniverse : "active-research";
}

export function securityLifecycleMatchesUniverse(bucket: SecurityLifecycleBucket, universe: SecurityLifecycleUniverse): boolean {
  return universeBuckets[universe].includes(bucket);
}

export function getSecurityLifecycleEntries(database: DatabaseContext): SecurityLifecycleEntry[] {
  const securities = allRows(database, "SELECT * FROM securities ORDER BY rowid DESC");
  const transactions = transactionRows(database);
  const holdingQuantities = holdingQuantityBySecurity(transactions);
  const settledEntryTransactions = settledEntryTransactionSet(transactions);
  const sourceCounts = countBySecurity(database, "information_sources");
  const thesisCounts = countBySecurity(database, "theses");
  const reviewEventCounts = countBySecurity(database, "review_events");
  const tradeDecisionCounts = countBySecurity(database, "trade_decisions");

  return securities.map((security) => {
    const id = String(security.id);
    const entryInput = {
      assetType: String(security.asset_type),
      investmentStatus: String(security.investment_status),
      holdingQuantity: holdingQuantities.get(id) ?? 0,
      hasSettledEntryTransaction: settledEntryTransactions.has(id),
      sourceCount: sourceCounts.get(id) ?? 0,
      thesisCount: thesisCounts.get(id) ?? 0,
      reviewEventCount: reviewEventCounts.get(id) ?? 0,
      tradeDecisionCount: tradeDecisionCounts.get(id) ?? 0
    };

    return {
      id,
      name: String(security.name),
      ticker: String(security.ticker),
      market: String(security.market),
      assetType: entryInput.assetType,
      investmentStatus: entryInput.investmentStatus,
      bucket: deriveBucket(entryInput),
      holdingQuantity: entryInput.holdingQuantity,
      hasSettledEntryTransaction: entryInput.hasSettledEntryTransaction,
      sourceCount: entryInput.sourceCount,
      thesisCount: entryInput.thesisCount,
      reviewEventCount: entryInput.reviewEventCount,
      tradeDecisionCount: entryInput.tradeDecisionCount
    };
  });
}

export function getSecurityLifecycleMap(database: DatabaseContext): Map<string, SecurityLifecycleEntry> {
  return new Map(getSecurityLifecycleEntries(database).map((entry) => [entry.id, entry]));
}

