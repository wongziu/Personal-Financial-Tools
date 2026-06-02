import { expect, test } from "@playwright/test";

test("loads dashboard and supports language and theme toggles", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("投资决策系统").first()).toBeVisible();
  await expect(page.getByText("组合净值")).toBeVisible();

  await page.getByLabel("语言").click();
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

  await page.getByLabel("语言").click();
  await page.getByRole("option", { name: "繁體中文" }).click();
  await expect(page.getByRole("columnheader", { name: "標的 ID" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "資產類型" })).toBeVisible();
  await expect(page.getByText("允許").first()).toBeVisible();

  await page.getByLabel("語言").click();
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
  await expect(dialog.getByRole("button", { name: "标的 ID 说明" })).toBeVisible();
  await dialog.getByRole("button", { name: "标的 ID 说明" }).hover();
  await expect(page.getByText(/系统内唯一标识/)).toBeVisible();

  await expect(dialog.getByRole("button", { name: "基准 说明" })).toBeVisible();
});

test("submits an executing trade decision and creates an exception draft", async ({ page }) => {
  await page.goto("/trade-decisions");
  await page.getByRole("button", { name: /新建交易决策/ }).click();
  await page.getByRole("button", { name: /提交决策/ }).click();

  await expect(page.getByText(/DEC-2026-/).first()).toBeVisible();
  await page.goto("/exceptions");
  await expect(page.getByText(/EXC-2026-/).first()).toBeVisible();
});

test("exports the xlsx workbook", async ({ page }) => {
  await page.goto("/export");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /下载 Excel 工作簿/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("investment-system-export.xlsx");
});
