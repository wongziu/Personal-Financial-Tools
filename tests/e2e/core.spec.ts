import { expect, test } from "@playwright/test";

test("loads dashboard and supports language and theme toggles", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("投资决策系统").first()).toBeVisible();
  await expect(page.getByText("组合净值")).toBeVisible();
  await expect(page.getByText("数据日期")).toBeVisible();
  await expect(page.getByText("汇兑重估影响")).toBeVisible();

  await page.getByRole("combobox", { name: "语言" }).click();
  await page.getByRole("option", { name: "English" }).click();
  await expect(page.getByText("Investment Decision System").first()).toBeVisible();
  await expect(page.getByText("Portfolio Net Value")).toBeVisible();

  await page.getByRole("button", { name: /Dark/ }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("localizes securities list fields and values across three languages", async ({ page }) => {
  await page.goto("/securities");

  await expect(page.getByRole("columnheader", { name: "交易代码" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "标的名称" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "标的 ID" })).toBeHidden();
  await expect(page.getByRole("columnheader", { name: "资产类型" })).toBeVisible();
  await expect(page.getByText("允许").first()).toBeVisible();

  await page.getByRole("combobox", { name: "语言" }).click();
  await page.getByRole("option", { name: "繁體中文" }).click();
  await expect(page.getByRole("columnheader", { name: "交易代碼" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "標的名稱" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "標的 ID" })).toBeHidden();
  await expect(page.getByRole("columnheader", { name: "資產類型" })).toBeVisible();
  await expect(page.getByText("允許").first()).toBeVisible();

  await page.getByRole("combobox", { name: "語言" }).click();
  await page.getByRole("option", { name: "English" }).click();
  await expect(page.getByRole("columnheader", { name: "Ticker" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Security Name" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Security ID" })).toBeHidden();
  await expect(page.getByRole("columnheader", { name: "Asset Type" })).toBeVisible();
  await expect(page.getByText("Allowed").first()).toBeVisible();
});

test("shows hover help for securities form fields", async ({ page }) => {
  await page.goto("/securities");

  await page.getByRole("button", { name: /新建记录/ }).click();
  const dialog = page.getByRole("dialog");

  await expect(dialog.getByRole("button", { name: /说明/ })).toHaveCount(14);
  await expect(dialog.getByRole("textbox", { name: "标的 ID" })).toBeHidden();
  await expect(dialog.getByRole("button", { name: "说明: 代码" })).toBeVisible();
  await dialog.getByRole("button", { name: "说明: 代码" }).hover();
  await expect(page.getByText(/交易代码或基金代码/)).toBeVisible();

  await expect(dialog.getByRole("button", { name: "说明: 基准" })).toBeVisible();
});

test("uses enumerated linked industry selectors for securities", async ({ page }) => {
  await page.goto("/securities");

  await page.getByRole("button", { name: /新建记录/ }).click();
  const dialog = page.getByRole("dialog");

  await expect(dialog.getByRole("combobox", { name: "一级行业" })).toBeVisible();
  await expect(dialog.getByRole("combobox", { name: "二级行业" })).toBeVisible();

  await dialog.getByRole("combobox", { name: "一级行业" }).click();
  await page.getByRole("option", { name: "固定收益" }).click();

  await dialog.getByRole("combobox", { name: "二级行业" }).click();
  await expect(page.getByRole("option", { name: "银行理财" })).toBeVisible();
  await expect(page.getByRole("option", { name: "半导体" })).toBeHidden();
});

test("selects an existing linked account when creating securities", async ({ page }) => {
  await page.goto("/securities");

  await page.getByRole("button", { name: /新建记录/ }).click();
  const dialog = page.getByRole("dialog");

  await expect(dialog.getByRole("combobox", { name: "关联账户" })).toBeVisible();
  await dialog.getByRole("combobox", { name: "关联账户" }).click();
  await expect(page.getByRole("option", { name: "Demo CN Broker · CNY", exact: true })).toBeVisible();
  await expect(page.getByRole("option", { name: /ACC-CN-001/ })).toBeHidden();
});

test("derives securities liquidity from lock-up days instead of direct selection", async ({ page }) => {
  await page.goto("/securities");

  await page.getByRole("button", { name: /新建记录/ }).click();
  const dialog = page.getByRole("dialog");

  await expect(dialog.getByRole("combobox", { name: "流动性" })).toBeHidden();
  await expect(dialog.getByRole("status", { name: "流动性" })).toContainText("高");
  await expect(dialog.getByRole("spinbutton", { name: "锁定期（天）" })).toBeHidden();

  await dialog.getByRole("combobox", { name: "资产类型" }).click();
  await page.getByRole("option", { name: "主动基金" }).click();

  await expect(dialog.getByRole("spinbutton", { name: "锁定期（天）" })).toBeVisible();
  await dialog.getByRole("spinbutton", { name: "锁定期（天）" }).fill("368");
  await expect(dialog.getByRole("status", { name: "流动性" })).toContainText("低");
});

test("opens security detail and shows linked transactions and prices", async ({ page }) => {
  await page.goto("/securities");

  await page.getByRole("link", { name: "详情 Apple Inc." }).click();

  await expect(page).toHaveURL(/\/securities\/US-AAPL$/);
  await expect(page.getByRole("heading", { name: /Apple Inc./ })).toBeVisible();
  await expect(page.getByText("关联交易流水")).toBeVisible();
  await expect(page.getByText("TRD-2026-002")).toBeVisible();
  await expect(page.getByText("价格记录")).toBeVisible();
  await expect(page.getByText("214")).toBeVisible();
});

test("uses existing securities in transaction and price forms and provides a date-based price queue", async ({ page }) => {
  await page.goto("/transactions");
  await page.getByRole("button", { name: /新建记录/ }).click();
  const transactionDialog = page.getByRole("dialog");

  await expect(transactionDialog.getByRole("textbox", { name: "交易 ID" })).toBeHidden();
  await expect(transactionDialog.getByText("必填").first()).toBeVisible();
  await expect(transactionDialog.getByText("选填").first()).toBeVisible();
  await expect(transactionDialog.locator('[data-field-requirement="required"]').first()).toHaveClass(/text-muted-foreground/);
  await expect(transactionDialog.locator('[data-field-requirement="required"]').first()).not.toHaveClass(/bg-primary/);
  await expect(transactionDialog.getByRole("combobox", { name: "标的" })).toBeVisible();
  await expect(transactionDialog.getByRole("textbox", { name: "标的" })).toBeHidden();
  await transactionDialog.getByRole("combobox", { name: "标的" }).click();
  await expect(page.getByRole("option", { name: "Apple Inc.", exact: true })).toBeVisible();
  await expect(page.getByRole("option", { name: /US-AAPL/ })).toBeHidden();
  await page.getByRole("option", { name: "Apple Inc.", exact: true }).click();
  await expect(transactionDialog.getByRole("combobox", { name: "账户" })).toContainText("Demo US Broker");
  await expect(transactionDialog.getByRole("combobox", { name: "币种" })).toContainText("USD");
  await transactionDialog.getByRole("spinbutton", { name: "数量" }).fill("2");
  await transactionDialog.getByRole("spinbutton", { name: "成交单价" }).fill("100");
  await transactionDialog.getByRole("spinbutton", { name: "佣金" }).fill("1");
  await transactionDialog.getByRole("spinbutton", { name: "税费" }).fill("2");
  await transactionDialog.getByRole("spinbutton", { name: "其他费用" }).fill("3");
  await transactionDialog.getByRole("spinbutton", { name: "汇率" }).fill("7.2");
  await expect(transactionDialog.getByRole("status", { name: "成交总额" })).toContainText("200");
  await expect(transactionDialog.getByRole("status", { name: "基准货币金额" })).toContainText("1483.2");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");

  await page.goto("/prices");
  await expect(page.getByText("待补价格")).toBeVisible();
  await page.getByLabel("补价日期").fill("2026-06-03");
  await expect(page.getByRole("spinbutton", { name: "Apple Inc. 保存价格" })).toBeVisible();

  await page.getByRole("button", { name: /新建记录/ }).click();
  const priceDialog = page.getByRole("dialog");
  await expect(priceDialog.getByRole("combobox", { name: "标的" })).toBeVisible();
  await expect(priceDialog.getByRole("textbox", { name: "标的" })).toBeHidden();
  await priceDialog.getByRole("combobox", { name: "标的" }).click();
  await page.getByRole("option", { name: "Apple Inc.", exact: true }).click();
  await expect(priceDialog.getByRole("combobox", { name: "币种" })).toContainText("USD");
});

test("cascades transaction account and security choices by relationship", async ({ page }) => {
  await page.goto("/transactions");
  await page.getByRole("button", { name: /新建记录/ }).click();
  const dialog = page.getByRole("dialog");

  await dialog.getByRole("combobox", { name: "账户" }).click();
  await page.getByRole("option", { name: "Demo CN Broker · CNY", exact: true }).click();
  await dialog.getByRole("combobox", { name: "标的" }).click();
  await expect(page.getByRole("option", { name: "沪深300ETF", exact: true })).toBeVisible();
  await expect(page.getByRole("option", { name: "Apple Inc.", exact: true })).toBeHidden();
  await page.keyboard.press("Escape");

  await dialog.getByRole("combobox", { name: "账户" }).click();
  await page.getByRole("option", { name: "Demo US Broker · USD", exact: true }).click();
  await dialog.getByRole("combobox", { name: "标的" }).click();
  await page.getByRole("option", { name: "Apple Inc.", exact: true }).click();
  await expect(dialog.getByRole("combobox", { name: "账户" })).toContainText("Demo US Broker");

  await dialog.getByRole("combobox", { name: "账户" }).click();
  await page.getByRole("option", { name: "Demo CN Broker · CNY", exact: true }).click();
  await expect(dialog.getByRole("combobox", { name: "标的" })).not.toContainText("Apple Inc.");
});

test("derives cashflow accounting fields from selected security and type", async ({ page }) => {
  await page.goto("/cashflows");

  await expect(page.getByRole("heading", { name: /现金流/ })).toBeVisible();
  await expect(page.getByText("现金流/公司行为")).toBeHidden();
  await expect(page.getByText(/记录账户出入金/)).toBeVisible();

  await page.getByRole("button", { name: /新建记录/ }).click();
  const dialog = page.getByRole("dialog");

  await expect(dialog.getByRole("textbox", { name: "现金流 ID" })).toBeHidden();
  await dialog.getByRole("combobox", { name: "标的" }).click();
  await page.getByRole("option", { name: "Apple Inc.", exact: true }).click();
  await expect(dialog.getByRole("combobox", { name: "账户" })).toContainText("Demo US Broker");
  await expect(dialog.getByRole("combobox", { name: "币种" })).toContainText("USD");

  await dialog.getByRole("combobox", { name: "类型" }).click();
  await page.getByRole("option", { name: "分红" }).click();
  await dialog.getByRole("spinbutton", { name: "金额", exact: true }).fill("30");
  await dialog.getByRole("spinbutton", { name: "汇率" }).fill("7.2");

  await expect(dialog.getByText("换算方向：USD → CNY")).toBeVisible();
  await expect(dialog.getByRole("spinbutton", { name: "基准金额" })).toHaveValue("216");
  await expect(dialog.getByRole("status", { name: "外部现金流" })).toContainText("否");
  await expect(dialog.getByRole("status", { name: "计入收益" })).toContainText("是");
});

test("supports bidirectional cashflow FX and base amount entry", async ({ page }) => {
  await page.goto("/cashflows");

  await page.getByRole("button", { name: /新建记录/ }).click();
  const dialog = page.getByRole("dialog");

  await dialog.getByRole("combobox", { name: "账户" }).click();
  await page.getByRole("option", { name: "Demo US Broker · USD", exact: true }).click();
  await dialog.getByRole("combobox", { name: "币种" }).click();
  await page.getByRole("option", { name: "HKD", exact: true }).click();

  await expect(dialog.getByText("换算方向：HKD → CNY")).toBeVisible();

  await dialog.getByRole("spinbutton", { name: "金额", exact: true }).fill("100");
  await dialog.getByRole("spinbutton", { name: "汇率" }).fill("0.92");
  await expect(dialog.getByRole("spinbutton", { name: "基准金额" })).toHaveValue("92");

  await dialog.getByRole("spinbutton", { name: "基准金额" }).fill("100");
  await expect(dialog.getByRole("spinbutton", { name: "汇率" })).toHaveValue("1");
});

test("formats cashflow amount columns with grouping and fixed cents", async ({ page }) => {
  await page.goto("/cashflows");

  await page.getByRole("button", { name: /新建记录/ }).click();
  const dialog = page.getByRole("dialog");

  await dialog.getByRole("combobox", { name: "账户" }).click();
  await page.getByRole("option", { name: "Demo US Broker · USD", exact: true }).click();
  await dialog.getByRole("spinbutton", { name: "金额", exact: true }).fill("11031.56");
  await dialog.getByRole("spinbutton", { name: "汇率" }).fill("1");
  await dialog.getByRole("textbox", { name: "数据来源" }).fill("Display format test");
  await dialog.getByRole("button", { name: "保存" }).click();

  await expect(page.locator('td[data-column="amount"]').filter({ hasText: "11,031.56" })).toBeVisible();
  await expect(page.locator('td[data-column="amount"]').filter({ hasText: "11031.5600" })).toBeHidden();
});

test("uses selectors for optional relationship ids instead of manual entry", async ({ page }) => {
  await page.goto("/transactions");
  await page.getByRole("button", { name: /新建记录/ }).click();
  const transactionDialog = page.getByRole("dialog");

  await expect(transactionDialog.getByRole("combobox", { name: "论点 ID" })).toBeVisible();
  await expect(transactionDialog.getByRole("textbox", { name: "论点 ID" })).toBeHidden();
  await transactionDialog.getByRole("combobox", { name: "论点 ID" }).click();
  await expect(page.getByRole("option", { name: /Market expectations/ })).toBeVisible();
  await page.keyboard.press("Escape");

  await expect(transactionDialog.getByRole("combobox", { name: "决策单 ID" })).toBeVisible();
  await expect(transactionDialog.getByRole("textbox", { name: "决策单 ID" })).toBeHidden();
  await expect(transactionDialog.getByRole("combobox", { name: "更正关联 ID" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");

  await page.goto("/sources");
  await page.getByRole("button", { name: /新建记录/ }).click();
  const sourceDialog = page.getByRole("dialog");

  await expect(sourceDialog.getByRole("combobox", { name: "关联论点" })).toBeVisible();
  await expect(sourceDialog.getByRole("textbox", { name: "关联论点" })).toBeHidden();
});

test("shows hover help for page content and list columns", async ({ page }) => {
  await page.goto("/securities");

  await expect(page.getByRole("heading", { name: /标的/ }).getByRole("button", { name: "说明: 标的" })).toBeVisible();

  await page.getByRole("button", { name: "说明: 资产类型" }).hover();
  await expect(page.getByText(/标的资产类别/)).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "说明: 总记录" }).hover();
  await expect(page.getByText(/当前模块保存的全部记录数/)).toBeVisible();
});

test("edits an existing security record without changing its locked identifier", async ({ page }) => {
  await page.goto("/securities");

  await page.getByRole("button", { name: "编辑 Apple Inc." }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "编辑记录" })).toBeVisible();
  await expect(dialog.getByRole("textbox", { name: "标的 ID" })).toBeHidden();

  await dialog.getByRole("textbox", { name: "名称" }).fill("Apple Inc. Edited");
  await dialog.getByRole("textbox", { name: "费用说明" }).fill("Updated fee note");
  await dialog.getByRole("button", { name: "保存" }).click();

  await expect(page.getByText("Apple Inc. Edited")).toBeVisible();
  await expect(page.getByText("AAPL").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "详情 Apple Inc. Edited" })).toHaveAttribute("href", "/securities/US-AAPL");

  await page.reload();
  await expect(page.getByText("Apple Inc. Edited")).toBeVisible();
  await expect(page.getByText("Updated fee note")).toBeHidden();
});

test("filters dated modules through the calendar dimension", async ({ page }) => {
  await page.goto("/transactions");

  await expect(page.getByText("日历维度")).toBeVisible();
  await expect(page.getByText("TRD-2026-001")).toBeVisible();
  await expect(page.getByText("TRD-2026-002")).toBeVisible();

  const transactionIds = page.locator('tbody [data-column="id"]');
  await page.getByRole("button", { name: "排序: 成交日期" }).click();
  await expect(transactionIds).toHaveText(["TRD-2026-001", "TRD-2026-002"]);
  await page.getByRole("button", { name: "排序: 成交日期" }).click();
  await expect(transactionIds).toHaveText(["TRD-2026-002", "TRD-2026-001"]);

  await page.getByRole("button", { name: /2026-01-03 1 条记录/ }).click();
  await expect(page.getByText("选定日期: 2026-01-03").first()).toBeVisible();
  await expect(page.getByText("TRD-2026-001")).toBeVisible();
  await expect(page.getByText("TRD-2026-002")).toBeHidden();
});

test("keeps master data pages free of misleading calendar panels", async ({ page }) => {
  await page.goto("/accounts");

  await expect(page.getByRole("heading", { name: /账户/ })).toBeVisible();
  await expect(page.getByText("日历维度")).toBeHidden();
  await expect(page.getByText("账户 ID")).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "账户类型" })).toBeVisible();
  await expect(page.getByText("现金").first()).toBeVisible();
});

test("renders account boolean values as localized labels and distinguishes market badges", async ({ page }) => {
  await page.goto("/accounts");

  await expect(page.getByRole("columnheader", { name: "账户名称" })).toBeVisible();
  const institutionCells = page.locator('tbody [data-column="institution_name"]');
  await expect(institutionCells).toHaveCount(1);
  await expect(institutionCells.first()).toHaveAttribute("rowspan", "2");

  const includeCells = page.locator('tbody [data-column="include_in_net_worth"]');
  await expect(includeCells).toHaveCount(2);
  await expect(includeCells).toHaveText(["是", "是"]);

  await expect(page.getByRole("columnheader", { name: "支持市场" })).toBeVisible();
  const aShareMarket = page.locator('[data-column="supported_markets"] [data-market="A-Share"]').first();
  const hkMarket = page.locator('[data-column="supported_markets"] [data-market="HK"]').first();
  const usMarket = page.locator('[data-column="supported_markets"] [data-market="US"]').first();
  await expect(aShareMarket).toHaveText("A 股");
  await expect(hkMarket).toHaveText("港股");
  await expect(usMarket).toHaveText("美股");

  const aShareClass = await aShareMarket.getAttribute("class");
  const usClass = await usMarket.getAttribute("class");
  expect(aShareClass).toBeTruthy();
  expect(usClass).toBeTruthy();
  expect(aShareClass).not.toBe(usClass);
});

test("groups account entry fields into basic information and strategy restrictions", async ({ page }) => {
  await page.goto("/accounts");
  await page.getByRole("button", { name: /新建记录/ }).click();
  const dialog = page.getByRole("dialog");

  await expect(dialog.getByRole("group", { name: "基本信息" })).toBeVisible();
  await expect(dialog.getByRole("group", { name: "策略限制" })).toBeVisible();
  await expect(dialog.getByRole("textbox", { name: "机构名称" })).toBeVisible();
  await expect(dialog.getByRole("textbox", { name: "账户名称" })).toBeVisible();
  await expect(dialog.locator("#initialEntryDate")).toBeVisible();
  await expect(dialog.getByText("账户类型")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "A 股" })).toHaveAttribute("aria-pressed", "true");
  await dialog.getByRole("button", { name: "美股" }).click();
  await expect(dialog.getByRole("button", { name: "美股" })).toHaveAttribute("aria-pressed", "true");

  await dialog.getByRole("combobox", { name: "账户类型" }).click();
  await expect(page.getByRole("option", { name: "现金", exact: true })).toBeVisible();
  await expect(page.getByRole("option", { name: "基金/理财", exact: true })).toBeVisible();
});

test("shows account calendar with daily nav pnl and supports nav correction", async ({ page }) => {
  await page.goto("/account-calendar");

  await expect(page.getByRole("heading", { name: /账户日历/ })).toBeVisible();
  await expect(page.getByText("账户每日净值", { exact: true })).toBeVisible();
  await expect(page.getByText("日盈亏", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("汇兑重估", { exact: true }).first()).toBeVisible();

  await page.getByRole("combobox", { name: "账户", exact: true }).click();
  await page.getByRole("option", { name: /Demo CN Broker/ }).click();
  await expect(page.getByText("ACC-CN-001").first()).toBeVisible();

  await page.getByLabel("校准日期").fill("2026-06-02");
  await page.getByRole("spinbutton", { name: "校准净值" }).fill("250000");
  await page.getByRole("button", { name: /保存校准净值/ }).click();

  await expect(page.getByText("250,000.00").first()).toBeVisible();
  await expect(page.getByText("已校准").first()).toBeVisible();
});

test("uses review due date as the default thesis calendar dimension", async ({ page }) => {
  await page.goto("/theses");

  await expect(page.getByText("日历维度")).toBeVisible();
  await expect(page.getByText(/下次复核日期 · 全部日期/)).toBeVisible();
});

test("shows latest FX and supports quick rate entry", async ({ page }) => {
  await page.goto("/fx-rates");

  const panel = page.getByTestId("fx-quick-panel");
  await expect(panel.getByText("汇率速查")).toBeVisible();
  await expect(panel.getByText(/1 USD =/)).toBeVisible();

  await panel.getByTestId("fx-rate-input").fill("7.3333");
  await panel.getByRole("button", { name: /保存汇率/ }).click();
  await expect(page.getByText("7.3333").first()).toBeVisible();
});

test("uses existing records in the trade decision form", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  await page.goto("/trade-decisions");
  await page.getByRole("button", { name: /新建交易决策/ }).click();
  const dialog = page.getByRole("dialog");

  await expect(dialog.getByText("必填").first()).toBeVisible();
  await expect(dialog.getByText("选填").first()).toBeVisible();
  await expect(dialog.getByRole("combobox", { name: "标的" })).toBeVisible();
  await expect(dialog.getByRole("textbox", { name: "标的" })).toBeHidden();
  await expect(dialog.getByRole("combobox", { name: "论点" })).toBeVisible();
  await expect(dialog.getByRole("textbox", { name: "论点" })).toBeHidden();
  await expect(dialog.getByRole("checkbox", { name: /Demo quarterly filing/ })).toBeVisible();
  expect(consoleErrors).toEqual([]);
  await page.keyboard.press("Escape");
});

test("submits an executing trade decision and creates an exception draft", async ({ page }) => {
  await page.goto("/trade-decisions");
  await expect(page.getByText("日历维度")).toBeVisible();
  await page.getByRole("button", { name: /新建交易决策/ }).click();
  await page.getByRole("button", { name: /提交决策/ }).click();

  await expect(page.getByText(/DEC-2026-/).first()).toBeVisible();
  await page.goto("/exceptions");
  await expect(page.getByText(/EXC-2026-/).first()).toBeVisible();
});

test("exports the xlsx workbook", async ({ page }) => {
  await page.goto("/export");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "下载 Excel 工作簿", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("investment-system-export.xlsx");
});
