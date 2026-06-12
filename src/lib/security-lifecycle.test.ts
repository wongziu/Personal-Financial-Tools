import { describe, expect, test } from "vitest";
import { createDatabase, type DatabaseContext } from "@/lib/db/client";
import { seedDemoData } from "@/lib/db/seed";
import { getSecurityLifecycleMap, securityLifecycleLabels } from "@/lib/security-lifecycle";

function insertSecurity(database: DatabaseContext, input: {
  id: string;
  status?: string;
  assetType?: string;
}) {
  database.sqlite
    .prepare(
      `INSERT INTO securities (
        id, account_id, name, ticker, asset_type, market, currency,
        industry_level_1, industry_level_2, risk_theme_tags, liquidity_level,
        investment_status, benchmark, fee_note, complexity
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.id,
      "ACC-US-001",
      input.id,
      input.id,
      input.assetType ?? "Stock",
      "US",
      "USD",
      "InformationTechnology",
      "Software",
      "[]",
      "High",
      input.status ?? "Allowed",
      "S&P 500",
      "N/A",
      "Simple"
    );
}

function insertTransaction(database: DatabaseContext, input: {
  id: string;
  securityId: string;
  type: "Buy" | "Sell";
  date: string;
  quantity: number;
}) {
  database.sqlite
    .prepare(
      `INSERT INTO transactions (
        id, order_id, trade_date, trade_time, account_id, security_id, strategy_type,
        thesis_id, decision_id, transaction_type, quantity, unit_price, gross_amount,
        commission, tax, other_fees, currency, fx_rate, base_currency_amount,
        status, data_source, correction_of_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.id,
      input.id,
      input.date,
      "15:00",
      "ACC-US-001",
      input.securityId,
      "Active",
      null,
      null,
      input.type,
      input.quantity,
      10,
      input.quantity * 10,
      0,
      0,
      0,
      "USD",
      7.2,
      input.quantity * 72,
      "Settled",
      "Test fill",
      null
    );
}

describe("security lifecycle", () => {
  test("derives holding, exited, observed, candidate, and blocked buckets from existing records", () => {
    const database = createDatabase(":memory:");
    seedDemoData(database);
    insertSecurity(database, { id: "US-EXITED" });
    insertSecurity(database, { id: "US-CANDIDATE" });
    insertSecurity(database, { id: "US-WATCH", status: "Watch" });
    insertSecurity(database, { id: "US-BLOCKED", status: "Prohibited" });
    insertSecurity(database, { id: "US-CASH", assetType: "Cash" });
    insertTransaction(database, { id: "TRD-EXIT-BUY", securityId: "US-EXITED", type: "Buy", date: "2026-01-01", quantity: 10 });
    insertTransaction(database, { id: "TRD-EXIT-SELL", securityId: "US-EXITED", type: "Sell", date: "2026-02-01", quantity: 10 });

    const lifecycle = getSecurityLifecycleMap(database);

    expect(lifecycle.get("US-AAPL")?.bucket).toBe("holding");
    expect(lifecycle.get("US-EXITED")?.bucket).toBe("exited");
    expect(lifecycle.get("US-WATCH")?.bucket).toBe("observed");
    expect(lifecycle.get("US-CANDIDATE")?.bucket).toBe("candidate");
    expect(lifecycle.get("US-BLOCKED")?.bucket).toBe("blocked");
    expect(lifecycle.get("US-CASH")?.bucket).toBe("blocked");
  });

  test("treats researched securities without current holdings as observed", () => {
    const database = createDatabase(":memory:");
    seedDemoData(database);
    insertSecurity(database, { id: "US-RESEARCHED" });
    database.sqlite
      .prepare(
        `INSERT INTO information_sources (
          id, information_date, obtained_date, security_id, risk_theme,
          information_type, evidence_level, source_name, source_url, key_facts,
          thesis_impact, triggers_review, related_thesis_id, entered_by, entered_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        "SRC-RESEARCHED",
        "2026-06-01",
        "2026-06-01",
        "US-RESEARCHED",
        "Growth",
        "News",
        "B",
        "Test source",
        "https://example.com",
        "A useful fact exists.",
        "Support",
        0,
        null,
        "Owner",
        "2026-06-01"
      );

    const lifecycle = getSecurityLifecycleMap(database);

    expect(lifecycle.get("US-RESEARCHED")?.bucket).toBe("observed");
    expect(lifecycle.get("US-RESEARCHED")?.sourceCount).toBe(1);
    expect(securityLifecycleLabels.observed.zh).toBe("观察池");
  });
});
