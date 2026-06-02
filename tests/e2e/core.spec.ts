import { expect, test } from "@playwright/test";

test("loads dashboard and supports language and theme toggles", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("投资决策系统").first()).toBeVisible();
  await expect(page.getByText("组合净值")).toBeVisible();

  await page.getByRole("button", { name: /EN/ }).click();
  await expect(page.getByText("Investment Decision System").first()).toBeVisible();
  await expect(page.getByText("Portfolio Net Value")).toBeVisible();

  await page.getByRole("button", { name: /Dark/ }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
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
