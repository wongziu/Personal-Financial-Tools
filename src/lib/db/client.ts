import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { defaultSystemSettingRows } from "@/lib/app-settings";
import { schema } from "@/lib/db/schema";

export interface DatabaseContext {
  sqlite: Database.Database;
  orm: BetterSQLite3Database<typeof schema>;
}

const defaultDatabasePath = path.join(process.cwd(), "data", "investment-system.sqlite");

function ensureDirectory(databasePath: string): void {
  if (databasePath === ":memory:") {
    return;
  }

  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
}

export function createDatabase(databasePath = process.env.INVESTMENT_DB_PATH ?? defaultDatabasePath): DatabaseContext {
  ensureDirectory(databasePath);
  const sqlite = new Database(databasePath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  initializeDatabase(sqlite);
  return {
    sqlite,
    orm: drizzle(sqlite, { schema })
  };
}

let singleton: DatabaseContext | undefined;

export function getDatabase(): DatabaseContext {
  singleton ??= createDatabase();
  return singleton;
}

export function initializeDatabase(sqlite: Database.Database): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS risk_rules (
      code TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      threshold REAL NOT NULL,
      severity TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS id_counters (
      prefix TEXT NOT NULL,
      year INTEGER,
      current_value INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (prefix, year)
    );
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      institution_name TEXT NOT NULL,
      account_name TEXT NOT NULL DEFAULT '',
      account_type TEXT NOT NULL,
      market TEXT NOT NULL,
      supported_markets TEXT NOT NULL DEFAULT '[]',
      currency TEXT NOT NULL,
      allow_margin_or_derivatives INTEGER NOT NULL DEFAULT 0,
      include_in_net_worth INTEGER NOT NULL DEFAULT 1,
      initial_entry_date TEXT NOT NULL,
      data_update_method TEXT NOT NULL,
      notes TEXT
    );
    CREATE TABLE IF NOT EXISTS securities (
      id TEXT PRIMARY KEY,
      account_id TEXT,
      name TEXT NOT NULL,
      ticker TEXT NOT NULL,
      asset_type TEXT NOT NULL,
      market TEXT NOT NULL,
      currency TEXT NOT NULL,
      industry_level_1 TEXT,
      industry_level_2 TEXT,
      risk_theme_tags TEXT NOT NULL DEFAULT '[]',
      lockup_days INTEGER,
      liquidity_level TEXT NOT NULL,
      investment_status TEXT NOT NULL,
      benchmark TEXT NOT NULL,
      fee_note TEXT,
      complexity TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      order_id TEXT,
      trade_date TEXT NOT NULL,
      trade_time TEXT,
      account_id TEXT NOT NULL,
      security_id TEXT NOT NULL,
      strategy_type TEXT NOT NULL,
      thesis_id TEXT,
      decision_id TEXT,
      transaction_type TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      gross_amount REAL NOT NULL,
      commission REAL NOT NULL DEFAULT 0,
      tax REAL NOT NULL DEFAULT 0,
      other_fees REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL,
      fx_rate REAL,
      base_currency_amount REAL NOT NULL,
      status TEXT NOT NULL,
      data_source TEXT NOT NULL,
      correction_of_id TEXT
    );
    CREATE TABLE IF NOT EXISTS cashflows (
      id TEXT PRIMARY KEY,
      cashflow_date TEXT NOT NULL,
      account_id TEXT NOT NULL,
      security_id TEXT,
      cashflow_type TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      fx_rate REAL,
      base_currency_amount REAL NOT NULL,
      is_external INTEGER NOT NULL,
      is_investment_income INTEGER NOT NULL,
      data_source TEXT NOT NULL,
      notes TEXT
    );
    CREATE TABLE IF NOT EXISTS market_prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      price_date TEXT NOT NULL,
      security_id TEXT NOT NULL,
      close_price REAL NOT NULL,
      currency TEXT NOT NULL,
      source TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS fx_rates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rate_date TEXT NOT NULL,
      from_currency TEXT NOT NULL,
      to_currency TEXT NOT NULL,
      rate REAL NOT NULL,
      source TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS information_sources (
      id TEXT PRIMARY KEY,
      information_date TEXT NOT NULL,
      obtained_date TEXT NOT NULL,
      security_id TEXT,
      risk_theme TEXT,
      information_type TEXT NOT NULL,
      evidence_level TEXT NOT NULL,
      source_name TEXT NOT NULL,
      source_url TEXT NOT NULL,
      key_facts TEXT NOT NULL,
      thesis_impact TEXT NOT NULL,
      triggers_review INTEGER NOT NULL,
      related_thesis_id TEXT,
      entered_by TEXT NOT NULL,
      entered_date TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS theses (
      id TEXT PRIMARY KEY,
      security_id TEXT NOT NULL,
      strategy_type TEXT NOT NULL,
      established_date TEXT NOT NULL,
      version TEXT NOT NULL,
      status TEXT NOT NULL,
      one_line_thesis TEXT NOT NULL,
      return_mechanism TEXT NOT NULL,
      key_variables TEXT NOT NULL,
      base_scenario TEXT NOT NULL,
      optimistic_scenario TEXT NOT NULL,
      pessimistic_scenario TEXT NOT NULL,
      invalidation_conditions TEXT NOT NULL,
      entry_conditions TEXT NOT NULL,
      add_conditions TEXT NOT NULL,
      reduce_conditions TEXT NOT NULL,
      exit_conditions TEXT NOT NULL,
      max_position_weight REAL NOT NULL,
      expected_holding_period TEXT NOT NULL,
      next_review_date TEXT NOT NULL,
      closing_conclusion TEXT
    );
    CREATE TABLE IF NOT EXISTS thesis_evidence (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      thesis_id TEXT NOT NULL,
      source_id TEXT NOT NULL,
      evidence_side TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS review_events (
      id TEXT PRIMARY KEY,
      security_id TEXT,
      strategy_type TEXT,
      event_type TEXT NOT NULL,
      expected_date TEXT NOT NULL,
      importance TEXT NOT NULL,
      variables_to_check TEXT NOT NULL,
      pre_event_action TEXT NOT NULL,
      post_event_deadline TEXT NOT NULL,
      status TEXT NOT NULL,
      result_summary TEXT,
      triggers_trade INTEGER,
      decision_id TEXT
    );
    CREATE TABLE IF NOT EXISTS trade_decisions (
      id TEXT PRIMARY KEY,
      decision_time TEXT NOT NULL,
      security_id TEXT NOT NULL,
      thesis_id TEXT,
      strategy_type TEXT NOT NULL,
      action TEXT NOT NULL,
      current_price REAL NOT NULL,
      planned_price_min REAL NOT NULL,
      planned_price_max REAL NOT NULL,
      planned_amount_base REAL NOT NULL,
      pre_trade_weight REAL NOT NULL,
      post_trade_weight REAL NOT NULL,
      max_allowed_weight REAL NOT NULL,
      trigger TEXT NOT NULL,
      expected_return_source TEXT NOT NULL,
      main_risks TEXT NOT NULL,
      downside_loss_base REAL NOT NULL,
      stop_loss_or_invalidation TEXT NOT NULL,
      has_similar_theme_exposure INTEGER NOT NULL,
      similar_theme_exposure REAL NOT NULL,
      touches_limits INTEGER NOT NULL,
      is_rule_exception INTEGER NOT NULL,
      emotion_tag TEXT NOT NULL,
      final_decision TEXT NOT NULL,
      executed_transaction_id TEXT,
      risk_warnings TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'Draft'
    );
    CREATE TABLE IF NOT EXISTS trade_decision_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      decision_id TEXT NOT NULL,
      source_id TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS exceptions (
      id TEXT PRIMARY KEY,
      exception_date TEXT NOT NULL,
      decision_id TEXT,
      transaction_id TEXT,
      exception_type TEXT NOT NULL,
      related_rule TEXT NOT NULL,
      behavior_description TEXT NOT NULL,
      original_reason TEXT NOT NULL,
      risk_impact TEXT NOT NULL,
      caused_loss INTEGER NOT NULL DEFAULT 0,
      repair_action TEXT NOT NULL,
      needs_system_change INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Draft',
      closed_date TEXT
    );
    CREATE TABLE IF NOT EXISTS holding_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      snapshot_date TEXT NOT NULL,
      account_id TEXT NOT NULL,
      security_id TEXT NOT NULL,
      strategy_type TEXT NOT NULL,
      quantity REAL NOT NULL,
      market_price REAL NOT NULL,
      market_value_base REAL NOT NULL,
      total_cost REAL NOT NULL,
      unrealized_profit REAL NOT NULL,
      realized_profit REAL NOT NULL,
      weight REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS portfolio_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      snapshot_date TEXT NOT NULL,
      portfolio_net_value REAL NOT NULL,
      cash_value_base REAL NOT NULL,
      max_drawdown REAL NOT NULL DEFAULT 0,
      risk_warnings TEXT NOT NULL DEFAULT '[]'
    );
    CREATE TABLE IF NOT EXISTS account_nav_anchors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id TEXT NOT NULL,
      anchor_date TEXT NOT NULL,
      net_asset_value_base REAL NOT NULL,
      source TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(account_id, anchor_date)
    );
  `);

  const insertSetting = sqlite.prepare("INSERT OR IGNORE INTO system_settings (key, value) VALUES (?, ?)");
  for (const setting of defaultSystemSettingRows) {
    insertSetting.run(setting.key, setting.value);
  }

  const accountColumns = sqlite.prepare("PRAGMA table_info(accounts)").all() as Array<{ name: string }>;
  if (!accountColumns.some((column) => column.name === "account_name")) {
    sqlite.exec("ALTER TABLE accounts ADD COLUMN account_name TEXT NOT NULL DEFAULT ''");
  }
  if (!accountColumns.some((column) => column.name === "supported_markets")) {
    sqlite.exec("ALTER TABLE accounts ADD COLUMN supported_markets TEXT NOT NULL DEFAULT '[]'");
  }

  const securityColumns = sqlite.prepare("PRAGMA table_info(securities)").all() as Array<{ name: string }>;
  if (!securityColumns.some((column) => column.name === "account_id")) {
    sqlite.exec("ALTER TABLE securities ADD COLUMN account_id TEXT");
  }
  if (!securityColumns.some((column) => column.name === "lockup_days")) {
    sqlite.exec("ALTER TABLE securities ADD COLUMN lockup_days INTEGER");
  }

  sqlite.exec(`
    UPDATE accounts
    SET account_name = CASE id
      WHEN 'ACC-HSBC-HK-001' THEN '汇丰全速易 HKD'
      WHEN 'ACC-HSBC-US-001' THEN '汇丰全速易 USD'
      WHEN 'ACC-CITIC-CN-001' THEN '中信证券 A股'
      WHEN 'ACC-FOSUN-HK-001' THEN '复星证券 HKD'
      WHEN 'ACC-CMB-WM-001' THEN '招商银行理财 CNY'
      WHEN 'ACC-BOC-WM-001' THEN '中国银行理财 CNY'
      ELSE institution_name || ' ' || currency
    END
    WHERE account_name IS NULL
      OR account_name = ''
      OR (
        account_name = institution_name
        AND id IN (
          'ACC-HSBC-HK-001',
          'ACC-HSBC-US-001',
          'ACC-CITIC-CN-001',
          'ACC-FOSUN-HK-001',
          'ACC-CMB-WM-001',
          'ACC-BOC-WM-001'
        )
      );

    UPDATE accounts
    SET supported_markets = '["' || market || '"]'
    WHERE supported_markets IS NULL OR supported_markets = '' OR supported_markets = '[]';

    UPDATE securities
    SET account_id = COALESCE(
      account_id,
      (SELECT accounts.id FROM accounts WHERE accounts.market = securities.market ORDER BY rowid LIMIT 1),
      (SELECT accounts.id FROM accounts ORDER BY rowid LIMIT 1)
    )
    WHERE account_id IS NULL;

    UPDATE securities
    SET industry_level_1 = CASE industry_level_1
      WHEN 'Broad Market' THEN 'BroadMarket'
      WHEN 'Technology' THEN 'InformationTechnology'
      WHEN '固定收益' THEN 'FixedIncome'
      WHEN '待补充' THEN 'Unclassified'
      ELSE industry_level_1
    END;

    UPDATE securities
    SET industry_level_2 = CASE industry_level_2
      WHEN 'Index' THEN 'IndexETF'
      WHEN 'Consumer Electronics' THEN 'Hardware'
      WHEN '银行理财' THEN 'BankWealthManagement'
      ELSE industry_level_2
    END;

    UPDATE securities
    SET lockup_days = CASE
      WHEN asset_type IN ('ActiveFund', 'Bond') AND (name LIKE '%368%' OR ticker LIKE '%368%') THEN 368
      WHEN asset_type IN ('ActiveFund', 'Bond') AND lockup_days IS NULL AND liquidity_level = 'Low' THEN 365
      WHEN asset_type IN ('ActiveFund', 'Bond') AND lockup_days IS NULL AND liquidity_level = 'Medium' THEN 90
      WHEN asset_type IN ('ActiveFund', 'Bond') AND lockup_days IS NULL THEN 0
      WHEN asset_type NOT IN ('ActiveFund', 'Bond') THEN NULL
      ELSE lockup_days
    END;

    UPDATE securities
    SET liquidity_level = CASE
      WHEN asset_type IN ('ActiveFund', 'Bond') AND COALESCE(lockup_days, 0) > 180 THEN 'Low'
      WHEN asset_type IN ('ActiveFund', 'Bond') AND COALESCE(lockup_days, 0) > 7 THEN 'Medium'
      ELSE 'High'
    END;
  `);
}
