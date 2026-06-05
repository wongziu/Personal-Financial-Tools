import ExcelJS from "exceljs";

type ExportRows = Record<string, unknown>[];

export interface ExportWorkbookInput {
  accounts: ExportRows;
  accountNavAnchors: ExportRows;
  securities: ExportRows;
  transactions: ExportRows;
  cashflows: ExportRows;
  marketPrices: ExportRows;
  fxRates: ExportRows;
  informationSources: ExportRows;
  theses: ExportRows;
  reviewEvents: ExportRows;
  tradeDecisions: ExportRows;
  riskRules: ExportRows;
  exceptions: ExportRows;
}

const sheetDefinitions: Array<[keyof ExportWorkbookInput, string]> = [
  ["accounts", "Accounts"],
  ["accountNavAnchors", "Account NAV Anchors"],
  ["securities", "Securities"],
  ["transactions", "Transactions"],
  ["cashflows", "Cashflows"],
  ["marketPrices", "Prices"],
  ["fxRates", "FX Rates"],
  ["informationSources", "Sources"],
  ["theses", "Theses"],
  ["reviewEvents", "Review Events"],
  ["tradeDecisions", "Trade Decisions"],
  ["riskRules", "Risk Rules"],
  ["exceptions", "Exceptions"]
];

function addWorksheet(workbook: ExcelJS.Workbook, name: string, rows: ExportRows): void {
  const worksheet = workbook.addWorksheet(name);
  const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  worksheet.columns = keys.map((key) => ({
    header: key,
    key,
    width: Math.max(14, key.length + 2)
  }));

  for (const row of rows) {
    worksheet.addRow(row);
  }

  worksheet.getRow(1).font = { bold: true };
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
}

export async function buildExportWorkbook(input: ExportWorkbookInput): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Investment Decision System";
  workbook.created = new Date();

  for (const [key, name] of sheetDefinitions) {
    addWorksheet(workbook, name, input[key]);
  }

  return workbook;
}
