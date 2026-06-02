import { expect, test } from "@playwright/test";

test("loads dashboard and supports language and theme toggles", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("投资决策系统").first()).toBeVisible();
  await expect(page.getByText("组合净值")).toBeVisible();

  await page.getByRole("combobox", { name: "语言" }).click();
  await page.getByRole("option", { name: "English" }).click();
  await expect(page.getByText("Investment Decision System").first()).toBeVisible();
  await expect(page.getByText("Portfolio Net Value")).toBeVisible();

  await page.getByRole("button", { name: /Dark/ }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("localizes securities list fields and values across three languages", async ({ page }) => {
  await page.goto("/securities");

  await expect(page.getByRole("columnheader", { name: "标的 ID" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "资产类型" })).toBeVisible();
  await expect(page.getByText("允许").first()).toBeVisible();

  await page.getByRole("combobox", { name: "语言" }).click();
  await page.getByRole("option", { name: "繁體中文" }).click();
  await expect(page.getByRole("columnheader", { name: "標的 ID" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "資產類型" })).toBeVisible();
  await expect(page.getByText("允許").first()).toBeVisible();

  await page.getByRole("combobox", { name: "語言" }).click();
  await page.getByRole("option", { name: "English" }).click();
  await expect(page.getByRole("columnheader", { name: "Security ID" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Asset Type" })).toBeVisible();
  await expect(page.getByText("Allowed").first()).toBeVisible();
});

test("shows hover help for securities form fields", async ({ page }) => {
  await page.goto("/securities");

  await page.getByRole("button", { name: /新建记录/ }).click();
  const dialog = page.getByRole("dialog");

  await expect(dialog.getByRole("button", { name: /说明/ })).toHaveCount(14);
  await expect(dialog.getByRole("button", { name: "说明: 标的 ID" })).toBeVisible();
  await dialog.getByRole("button", { name: "说明: 标的 ID" }).hover();
  await expect(page.getByText(/系统内唯一标识/)).toBeVisible();

  await expect(dialog.getByRole("button", { name: "说明: 基准" })).toBeVisible();
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

test("filters dated modules through the calendar dimension", async ({ page }) => {
  await page.goto("/transactions");

  await expect(page.getByText("日历维度")).toBeVisible();
  await expect(page.getByText("TRD-2026-001")).toBeVisible();
  await expect(page.getByText("TRD-2026-002")).toBeVisible();

  await page.getByRole("button", { name: /2026-01-03 1 条记录/ }).click();
  await expect(page.getByText("选定日期: 2026-01-03").first()).toBeVisible();
  await expect(page.getByText("TRD-2026-001")).toBeVisible();
  await expect(page.getByText("TRD-2026-002")).toBeHidden();
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
