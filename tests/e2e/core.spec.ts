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

test("opens system settings and saves fx and model configuration", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "系统配置" }).click();
  const dialog = page.getByRole("dialog");

  await expect(dialog.getByRole("heading", { name: "系统配置" })).toBeVisible();
  await expect(dialog.getByRole("combobox", { name: "涨跌颜色" })).toContainText("绿涨 / 红跌");
  await dialog.getByRole("combobox", { name: "涨跌颜色" }).click();
  await page.getByRole("option", { name: "红涨 / 绿跌" }).click();

  await dialog.getByRole("tab", { name: "汇率" }).click();
  await expect(dialog.getByRole("combobox", { name: "汇率数据源" })).toContainText("Frankfurter");
  await dialog.getByRole("spinbutton").fill("6");

  await dialog.getByRole("tab", { name: "模型 API" }).click();
  await expect(dialog.getByRole("combobox", { name: "执行模式" })).toContainText("模型 API");
  await dialog.getByRole("textbox", { name: "Model" }).fill("gpt-4.1-mini");
  await expect(dialog.getByRole("textbox", { name: "API Key Env" })).toHaveValue("ANTHROPIC_AUTH_TOKEN");
  await dialog.getByRole("tab", { name: "Agent 工作流" }).click();
  await expect(dialog.getByRole("combobox", { name: "默认选股市场" })).toContainText("全部");
  await expect(dialog.getByRole("combobox", { name: "默认选股范围" })).toContainText("默认研究范围");
  await expect(dialog.getByRole("spinbutton", { name: "模型研判候选上限" })).toHaveValue("3");
  await expect(dialog.getByText("人工确认门禁")).toBeVisible();

  await dialog.getByRole("button", { name: "保存" }).click();
  await expect(page.getByText("记录已保存")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator('[data-market-change-color-mode="red-up-green-down"]').first()).toBeVisible();
});

test("groups related modules into clearer tabbed workspaces", async ({ page }) => {
  test.slow();
  await page.goto("/");

  await expect(page.getByRole("link", { name: "账户", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "标的", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "标的交易流水", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "账户现金流", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "行情数据", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "流水", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "资产工作台", exact: true })).toHaveCount(0);

  await page.goto("/accounts");

  await expect(page.getByRole("heading", { name: "账户", exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "账户资料", exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "账户日历" }).click();
  await expect(page.getByRole("heading", { name: /账户日历/ })).toBeVisible();

  await page.goto("/securities");
  await expect(page.getByRole("heading", { name: /标的/ }).first()).toBeVisible();
  await expect(page.getByRole("tab", { name: "账户", exact: true })).toHaveCount(0);

  await page.goto("/transactions");
  await expect(page.getByRole("heading", { name: /标的交易流水/ })).toBeVisible();
  await expect(page.locator('aside nav a[aria-current="page"]')).toHaveText("标的交易流水");
  await expect(page.getByRole("tab", { name: "交易流水" })).toHaveCount(0);

  await page.goto("/cashflows");
  await expect(page.getByRole("heading", { name: /账户现金流/ })).toBeVisible();
  await expect(page.locator('aside nav a[aria-current="page"]')).toHaveText("账户现金流");
  await expect(page.getByRole("tab", { name: "现金流" })).toHaveCount(0);

  await page.goto("/ledger");
  await expect(page).toHaveURL(/\/transactions$/);
  await expect(page.getByRole("tab", { name: "价格" })).toHaveCount(0);

  await page.goto("/market-data");
  await expect(page.getByRole("heading", { name: "行情数据", exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "价格" })).toBeVisible();
  await page.getByRole("tab", { name: "汇率" }).click();
  await expect(page.getByTestId("fx-quick-panel")).toBeVisible();

  await page.goto("/research");
  await expect(page.getByRole("heading", { name: "研究工作台" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "信息分析" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "AI 自驱选股" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "我的决策" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Agent 工作流" })).toBeVisible();
  await expect(page.getByTestId("source-intelligence-panel")).toBeVisible();
  await page.getByRole("tab", { name: "Agent 工作流" }).click();
  await expect(page.getByTestId("research-agent-console")).toBeVisible();
  await expect(page.getByText("工作流总览", { exact: true })).toBeVisible();
  await expect(page.getByText("Agent 配置快照", { exact: true })).toBeVisible();
  await expect(page.getByText("历史操作", { exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "策略版本" })).toHaveCount(0);
});

test("runs AI self-directed stock picking from the research workspace", async ({ page }) => {
  const requests: Array<Record<string, unknown>> = [];
  const actionRequests: Array<Record<string, unknown>> = [];
  const historyRun = {
    strategyRunId: "SRUN-2026-000",
    runId: "AIRUN-2026-000",
    runDate: "2026-06-12",
    strategyId: "STRAT-CORE-GROWTH",
    strategyName: "核心成长观察策略",
    strategyVersionId: "STRAT-CORE-GROWTH-V1",
    market: "US",
    universe: "active-research",
    universeSummary: "美股候选池 1 个标的",
    status: "Completed",
    finalSummary: "上一轮策略运行已记录，可用于复盘。",
    candidates: [
      {
        id: "CAND-2026-000",
        securityId: "US-MSFT",
        securityName: "Microsoft Corp.",
        lifecycleBucket: "observed",
        rank: 1,
        fitScore: 72,
        recommendation: "CollectEvidence",
        matchedRules: ["证据数=0"],
        missingEvidence: ["缺少 A/B 级本地信息来源"],
        riskFlags: [],
        nextAction: "先补资料。",
        actionStatus: "Open"
      }
    ]
  };
  const currentRun = {
    triggerType: "strategy-run",
    runId: "AIRUN-2026-001",
    strategyId: "STRAT-CORE-GROWTH",
    strategyVersionId: "STRAT-CORE-GROWTH-V1",
    strategyRunId: "SRUN-2026-001",
    market: "US",
    universe: "active-research",
    finalSummary: "策略「核心成长观察策略」完成本地候选筛选。",
    stages: [
      {
        id: "screening",
        title: "筛选 Agent",
        status: "completed",
        inputSummary: "candidates=2",
        output: "Apple Inc. enters the candidate review queue.",
        latencyMs: 0
      }
    ],
    candidates: [
      {
        id: "CAND-2026-001",
        securityId: "US-AAPL",
        securityName: "Apple Inc.",
        lifecycleBucket: "observed",
        rank: 1,
        fitScore: 80,
        recommendation: "DraftDecision",
        matchedRules: ["证据数=2"],
        missingEvidence: ["缺少最近一次结构化复盘结论"],
        riskFlags: ["风险主题：AI Capex"],
        nextAction: "生成交易决策草案前先确认仓位上限。",
        actionStatus: "Open",
        modelAssessment: {
          mode: "model",
          model: "openai:test-model@default",
          searchStatus: "searched",
          summary: "模型检索后认为仍需核对财报和复盘条件。",
          judgement: "可推进",
          suggestedAction: "进入交易草案前补齐复盘条件。",
          evidenceHighlights: ["财报线索支持需求韧性"],
          unresolvedGaps: ["缺少结构化复盘"],
          searchQueries: ["Apple latest filing demand guidance"]
        }
      }
    ],
    reviewFindings: []
  };
  await page.route("**/api/research-iteration-workflow**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ history: [historyRun] })
      });
      return;
    }

    if (route.request().method() === "PATCH") {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      actionRequests.push(body);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          candidate: {
            ...currentRun.candidates[0],
            actionRoute: body.actionRoute,
            actionStatus: "Selected",
            actionNote: "补资料工作流已生成资料草稿：Apple 最新财报与 AI Capex 风险需要人工确认。",
            actionUpdatedAt: "2026-06-12T14:00:00.000Z"
          },
          actionWorkflow: {
            actionRoute: "CollectEvidence",
            runId: "AIRUN-2026-ACTION-001",
            finalSummary: "补资料工作流已生成资料草稿，等待用户确认后写入信息来源。",
            stages: [
              {
                id: "action-route",
                title: "行动路线 Agent",
                status: "completed",
                inputSummary: "candidate=CAND-2026-001",
                output: "将补资料拆解为财报、公告和风险资料搜索。",
                latencyMs: 0
              },
              {
                id: "evidence-search",
                title: "资料搜索 Agent",
                status: "completed",
                inputSummary: "Apple Inc.",
                output: "生成 Apple latest filing demand guidance 检索任务。",
                latencyMs: 0
              },
              {
                id: "source-draft",
                title: "信息草稿 Agent",
                status: "completed",
                inputSummary: "source draft",
                output: "整理为可确认的信息来源草稿。",
                latencyMs: 0
              },
              {
                id: "handoff",
                title: "下一步编排 Agent",
                status: "completed",
                inputSummary: "next route",
                output: "用户确认资料后进入建论点。",
                latencyMs: 0
              }
            ],
            sourceDraft: {
              mode: "local",
              reuseTargets: ["sources", "theses"],
              prompt: "collect evidence",
              notes: "Review before saving.",
              fields: {
                informationDate: "2026-06-12",
                obtainedDate: "2026-06-12",
                sourceName: "AI evidence workflow",
                sourceUrl: "",
                informationType: "Research",
                evidenceLevel: "C",
                keyFacts: "Apple 最新财报与 AI Capex 风险需要人工确认。",
                thesisImpact: "Pending",
                triggersReview: true
              }
            },
            candidate: {
              ...currentRun.candidates[0],
              actionRoute: body.actionRoute,
              actionStatus: "Selected",
              actionNote: "补资料工作流已生成资料草稿：Apple 最新财报与 AI Capex 风险需要人工确认。",
              actionUpdatedAt: "2026-06-12T14:00:00.000Z"
            },
            nextActionRoute: "CreateThesis"
          }
        })
      });
      return;
    }

    requests.push(route.request().postDataJSON() as Record<string, unknown>);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ result: currentRun })
    });
  });

  await page.goto("/research");
  await page.getByRole("tab", { name: "AI 自驱选股" }).click();
  const panel = page.getByTestId("ai-stock-picks-panel");

  await expect(panel.getByText("AI 自驱选股")).toBeVisible();
  await expect(panel.getByText("历史运行", { exact: true })).toBeVisible();
  await expect(panel.getByTestId("ai-stock-picks-history").getByText("上一轮策略运行已记录，可用于复盘。")).toBeVisible();
  await panel.getByRole("button", { name: "查看本次记录" }).click();
  await expect(panel.getByText("1. Microsoft Corp.")).toBeVisible();
  await expect(panel.getByRole("combobox", { name: "选股市场" })).toBeVisible();
  await expect(panel.getByRole("combobox", { name: "选股范围" })).toBeVisible();
  await expect(panel.getByRole("combobox", { name: "选股范围" })).toContainText("默认研究范围");
  await panel.getByRole("combobox", { name: "选股市场" }).click();
  await page.getByRole("option", { name: "美股" }).click();
  await panel.getByRole("combobox", { name: "参考标的" }).click();
  await page.getByRole("option", { name: /Apple Inc\./ }).click();
  await expect(panel.getByRole("button", { name: "清空参考标的" })).toBeVisible();
  await panel.getByRole("button", { name: "清空参考标的" }).click();
  await expect(panel.getByRole("combobox", { name: "参考标的" })).toContainText("不限定标的");
  await panel.getByRole("button", { name: "立即更新选股" }).click();
  expect(requests[0]).toMatchObject({ triggerType: "strategy-run", market: "US", universe: "active-research" });
  expect(requests[0]).not.toHaveProperty("securityId");
  await expect(panel.getByTestId("ai-stock-picks-progress").getByText("Agent 进度")).toBeVisible();
  const result = panel.getByTestId("ai-stock-picks-result");
  const summary = result.getByTestId("ai-stock-picks-summary");
  await expect(summary.getByText("运行摘要", { exact: true })).toBeVisible();
  await expect(summary.getByText("策略", { exact: true })).toBeVisible();
  await expect(summary.getByText("核心成长观察策略 · Active")).toBeVisible();
  await expect(summary.getByText("市场 / 范围", { exact: true })).toBeVisible();
  await expect(summary.getByText("美股 / 默认研究范围", { exact: true })).toBeVisible();
  await expect(summary.getByText("候选标的", { exact: true })).toBeVisible();
  await expect(summary.getByText("1 个", { exact: true })).toHaveCount(2);
  await expect(summary.getByText("可进草案", { exact: true })).toBeVisible();
  await expect(summary.getByText("模型研判", { exact: true })).toBeVisible();
  await expect(summary.getByText("1 已补充 / 0 未执行")).toBeVisible();
  await expect(summary.getByText("策略「核心成长观察策略」完成本地候选筛选")).toBeVisible();
  const appleCard = result.getByTestId("ai-stock-pick-card-CAND-2026-001");
  await expect(appleCard.getByText("1. Apple Inc.")).toBeVisible();
  await expect(appleCard.getByText("观察池")).toBeVisible();
  await expect(appleCard.getByText("可生成买入草案")).toBeVisible();
  await expect(appleCard.getByTestId("ai-stock-pick-score")).toContainText("80");
  await expect(appleCard.getByText("当前看好", { exact: true })).toBeVisible();
  await expect(appleCard.getByText("资料和论点基础较完整，可进入决策草案前检查。")).toBeVisible();
  const actionRoutes = appleCard.getByTestId("ai-stock-pick-actions");
  await expect(actionRoutes.getByRole("button", { name: "补资料" })).toBeVisible();
  const actionLayout = await actionRoutes.evaluate((element) => {
    const buttons = [...element.querySelectorAll("button")];
    return {
      columns: getComputedStyle(element).gridTemplateColumns.split(" ").length,
      firstClass: buttons[0]?.className ?? "",
      thirdClass: buttons[2]?.className ?? ""
    };
  });
  expect(actionLayout.columns).toBe(1);
  expect(actionLayout.firstClass).toContain("border-sky");
  expect(actionLayout.thirdClass).toContain("border-emerald");
  await expect(appleCard.getByText("模型搜索研判")).toBeVisible();
  await expect(appleCard.getByText("模型检索后认为仍需核对财报和复盘条件。")).toBeVisible();
  await expect(appleCard.getByText("缺少最近一次结构化复盘结论")).toBeVisible();
  const layoutOrder = await panel.evaluate((element) => {
    const resultElement = element.querySelector('[data-testid="ai-stock-picks-result"]');
    const historyElement = element.querySelector('[data-testid="ai-stock-picks-history"]');
    if (!resultElement || !historyElement) {
      throw new Error("AI stock picks result and history sections should both be rendered.");
    }

    return {
      resultTop: resultElement.getBoundingClientRect().top,
      historyTop: historyElement.getBoundingClientRect().top
    };
  });
  expect(layoutOrder.historyTop).toBeGreaterThan(layoutOrder.resultTop);
  await appleCard.getByRole("button", { name: "补资料" }).click();
  expect(actionRequests[0]).toMatchObject({ candidateId: "CAND-2026-001", actionRoute: "CollectEvidence" });
  await expect(appleCard.getByText("已选：补资料")).toBeVisible();
  const actionWorkflow = appleCard.getByTestId("candidate-action-workflow");
  await expect(actionWorkflow.getByText("补资料工作流", { exact: true })).toBeVisible();
  await expect(actionWorkflow.getByText("资料搜索 Agent")).toBeVisible();
  await expect(actionWorkflow.getByText("信息草稿 Agent")).toBeVisible();
  await expect(actionWorkflow.getByText("AI evidence workflow")).toBeVisible();
  await expect(actionWorkflow.getByText("Apple 最新财报与 AI Capex 风险需要人工确认。")).toBeVisible();
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

test("separates securities list by lifecycle buckets", async ({ page }) => {
  await page.goto("/securities");

  const lifecycleFilter = page.getByTestId("security-lifecycle-filter");
  await expect(lifecycleFilter.getByText("标的分层")).toBeVisible();
  await expect(lifecycleFilter.getByRole("button", { name: /持仓中\s+2/ })).toBeVisible();
  await expect(lifecycleFilter.getByRole("button", { name: /观察池\s+0/ })).toBeVisible();
  await expect(page.locator('tbody [data-column="name"]').filter({ hasText: "Apple Inc." })).toContainText("持仓中");

  await lifecycleFilter.getByRole("button", { name: /观察池\s+0/ }).click();

  await expect(page.getByText("Apple Inc.")).toBeHidden();
  await expect(page.getByText("沪深300ETF")).toBeHidden();
  await expect(page.getByText("暂无记录")).toBeVisible();
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

  const detailLink = page.getByRole("link", { name: "详情 Apple Inc." });
  await expect(detailLink).toHaveAttribute("href", "/securities/US-AAPL");
  await page.goto("/securities/US-AAPL");

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
  await Promise.all([
    page.waitForResponse((response) => response.url().includes("/api/modules/cashflows") && response.request().method() === "POST"),
    dialog.getByRole("button", { name: "保存" }).click()
  ]);
  await expect(dialog).toBeHidden({ timeout: 15_000 });

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

test("generates an information source draft and applies it to the source form", async ({ page }) => {
  await page.goto("/sources");

  const panel = page.getByTestId("source-intelligence-panel");
  await expect(panel.getByText("信息智能获取")).toBeVisible();
  await panel.getByRole("textbox", { name: "原始链接" }).fill("https://example.com/apple-demand");
  await panel.getByRole("textbox", { name: "资料正文" }).fill("Apple reported stronger iPhone demand and increased AI infrastructure spending.");
  await panel.getByRole("button", { name: "生成草稿" }).click();

  await expect(panel.getByText("Apple reported stronger iPhone demand")).toBeVisible();
  await panel.getByRole("button", { name: "应用到新建记录" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("textbox", { name: "来源名称" })).toHaveValue("example.com");
  await expect(dialog.getByRole("textbox", { name: "原始链接" })).toHaveValue("https://example.com/apple-demand");
  await expect(dialog.getByRole("textbox", { name: "关键事实" })).toHaveValue(/Apple reported stronger iPhone demand/);
});

test("exposes help affordances for page content and list columns", async ({ page }) => {
  await page.goto("/securities");

  await expect(page.getByRole("heading", { name: /标的/ }).getByRole("button", { name: "说明: 标的" })).toBeVisible();
  await expect(page.getByRole("button", { name: "说明: 资产类型" })).toBeVisible();
  await expect(page.getByRole("button", { name: "说明: 总记录" })).toBeVisible();
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

  await expect(page.getByRole("heading", { name: "账户", exact: true })).toBeVisible();
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
  await expect(page.getByTestId("account-calendar-grid-card")).toBeVisible();
  await expect(page.getByTestId("account-calendar-detail-card")).toBeVisible();
  await expect(page.getByTestId("account-calendar-grid-card").locator("table")).toHaveCount(0);
  await expect(page.getByTestId("account-calendar-detail-card").locator("table")).toHaveCount(1);

  await page.getByRole("combobox", { name: "账户", exact: true }).click();
  await page.getByRole("option", { name: /Demo CN Broker/ }).click();
  await expect(page.getByText("ACC-CN-001").first()).toBeVisible();

  await expect(page.getByRole("combobox", { name: "显示币种" })).toContainText("CNY");
  await expect(page.getByTestId("account-calendar-latest-nav")).toContainText("201,992.00");
  const cnyLatestNav = await page.getByTestId("account-calendar-latest-nav").textContent();
  await page.getByRole("combobox", { name: "显示币种" }).click();
  await page.getByRole("option", { name: "USD" }).click();
  await expect(page.getByTestId("account-calendar-grid-card")).toContainText("2026-06 · USD");
  await expect(page.getByTestId("account-calendar-detail-card")).toContainText("USD");
  await expect(page.getByTestId("account-calendar-latest-nav")).toHaveText(/^\d{1,3}(,\d{3})*\.\d{2}$/);
  await expect(page.getByTestId("account-calendar-latest-nav")).not.toHaveText(cnyLatestNav ?? "");
  await page.getByRole("combobox", { name: "显示币种" }).click();
  await page.getByRole("option", { name: "CNY" }).click();

  await page.getByLabel("校准日期").fill("2026-06-02");
  await page.getByRole("spinbutton", { name: "校准净值" }).fill("250000");
  const saveAnchorButton = page.getByRole("button", { name: /保存校准净值/ });
  await expect(saveAnchorButton).toBeEnabled();
  await Promise.all([
    page.waitForResponse((response) => response.url().includes("/api/account-nav-anchors") && response.request().method() === "POST" && response.ok()),
    saveAnchorButton.click()
  ]);

  await expect(page.getByText("250,000.00").first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("已校准").first()).toBeVisible({ timeout: 15_000 });
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
