"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { BrainCircuitIcon, RefreshCcwIcon, SaveIcon, SettingsIcon, SparklesIcon, TestTube2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAppSettings } from "@/components/app-settings-provider";
import { useLanguage } from "@/components/language-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { AppSettings } from "@/lib/app-settings";
import { translateText, type Language } from "@/lib/i18n";

function localize(language: Language, zh: string, en: string): string {
  return language === "en-US" ? en : translateText(zh, language);
}

function textToList(value: string): string[] {
  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function listToText(value: string[]): string {
  return value.join(", ");
}

function SettingRow({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-3 rounded-md border bg-background p-3 md:grid-cols-[1fr_260px] md:items-center">
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <div>{children}</div>
    </div>
  );
}

const agentMarketOptions: Array<{ value: AppSettings["agentWorkflow"]["defaultMarket"]; zh: string; en: string }> = [
  { value: "all", zh: "全部", en: "All" },
  { value: "A-Share", zh: "A股", en: "A-Shares" },
  { value: "HK", zh: "港股", en: "Hong Kong" },
  { value: "US", zh: "美股", en: "U.S." }
];

const agentUniverseOptions: Array<{ value: AppSettings["agentWorkflow"]["defaultUniverse"]; zh: string; en: string }> = [
  { value: "active-research", zh: "默认研究范围", en: "Default Research" },
  { value: "observed", zh: "观察池", en: "Watchlist" },
  { value: "holding", zh: "持仓中", en: "Holdings" },
  { value: "candidate", zh: "候选池", en: "Candidate Pool" },
  { value: "exited", zh: "已退出复盘", en: "Exited Review" },
  { value: "researchable", zh: "全部可研究", en: "All Researchable" }
];

export function AppSettingsDialog() {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const { settings: appSettings, setSettings: commitSettings, reloadSettings } = useAppSettings();
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(appSettings);
  const [isPending, startTransition] = useTransition();
  const [refreshStatus, setRefreshStatus] = useState<string | null>(null);
  const [modelTestStatus, setModelTestStatus] = useState<string | null>(null);

  const pairsText = useMemo(() => listToText(settings.fx.pairs), [settings.fx.pairs]);
  const domainsText = useMemo(() => listToText(settings.sourceIntelligence.defaultDomains), [settings.sourceIntelligence.defaultDomains]);
  const reuseTargetsText = useMemo(() => listToText(settings.sourceIntelligence.reuseTargets), [settings.sourceIntelligence.reuseTargets]);

  useEffect(() => {
    if (!open) {
      setSettings(appSettings);
    }
  }, [appSettings, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    reloadSettings()
      .then(setSettings)
      .catch(() => toast.error(t.formError));
  }, [open, reloadSettings, t.formError]);

  const updateSettings = (updater: (current: AppSettings) => AppSettings) => {
    setSettings((current) => updater(current));
  };

  const save = () => {
    startTransition(async () => {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });

      const payload = (await response.json()) as { settings?: AppSettings };

      if (!response.ok || !payload.settings) {
        toast.error(t.formError);
        return;
      }

      setSettings(payload.settings);
      commitSettings(payload.settings);
      setLanguage(payload.settings.uiLanguage);
      router.refresh();
      toast.success(t.formSaved);
    });
  };

  const refreshFx = () => {
    startTransition(async () => {
      const response = await fetch("/api/fx-refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "manual" })
      });
      const payload = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) {
        const message = payload.error ?? t.formError;
        setRefreshStatus(message);
        toast.error(message);
        return;
      }

      setRefreshStatus(payload.message ?? "OK");
      toast.success(payload.message ?? t.formSaved);
    });
  };

  const testModel = () => {
    startTransition(async () => {
      const response = await fetch("/api/model-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const payload = (await response.json()) as { result?: { message?: string; latencyMs?: number }; error?: string };
      const message = payload.result?.message ?? payload.error ?? t.formError;

      if (!response.ok) {
        setModelTestStatus(message);
        toast.error(message);
        return;
      }

      const suffix = payload.result?.latencyMs === undefined ? "" : ` (${Math.round(payload.result.latencyMs)}ms)`;
      setModelTestStatus(`${message}${suffix}`);
      toast.success(localize(language, "模型连接成功", "Model connection succeeded"));
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" aria-label={localize(language, "系统配置", "System Settings")}>
          <SettingsIcon />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SettingsIcon className="size-4" />
            {localize(language, "系统配置", "System Settings")}
          </DialogTitle>
          <DialogDescription>
            {localize(language, "统一维护估值、汇率、模型 API 和信息智能获取配置。", "Manage valuation, FX, model API, and source-intelligence settings in one place.")}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="grid gap-4 md:grid-cols-[180px_1fr]">
          <TabsList className="grid h-fit gap-1 bg-muted/40 p-1 md:sticky md:top-0">
            <TabsTrigger value="general">{localize(language, "通用", "General")}</TabsTrigger>
            <TabsTrigger value="fx">{localize(language, "汇率", "FX")}</TabsTrigger>
            <TabsTrigger value="model">{localize(language, "模型 API", "Model API")}</TabsTrigger>
            <TabsTrigger value="agent">
              <BrainCircuitIcon className="mr-1 size-3" />
              {localize(language, "Agent 工作流", "Agent Workflow")}
            </TabsTrigger>
            <TabsTrigger value="source">
              <SparklesIcon className="mr-1 size-3" />
              {localize(language, "信息智能", "Source AI")}
            </TabsTrigger>
          </TabsList>

          <div className="min-w-0">
            <TabsContent value="general" className="mt-0 flex flex-col gap-3">
              <SettingRow
                title={localize(language, "基准货币", "Base Currency")}
                description={localize(language, "组合净值、日盈亏和导出金额的默认折算币种。", "Default currency for NAV, daily P&L, and export amounts.")}
              >
                <Select value={settings.baseCurrency} onValueChange={(value) => updateSettings((current) => ({ ...current, baseCurrency: value as AppSettings["baseCurrency"] }))}>
                  <SelectTrigger aria-label={localize(language, "基准货币", "Base Currency")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["CNY", "HKD", "USD"].map((currency) => (
                      <SelectItem key={currency} value={currency}>{currency}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SettingRow>
              <SettingRow
                title={localize(language, "默认语言", "Default Language")}
                description={localize(language, "保存后会同步当前界面语言；代码和数据库字段仍保持英文。", "Saving also updates the current UI language; code and database fields stay English.")}
              >
                <Select value={settings.uiLanguage} onValueChange={(value) => updateSettings((current) => ({ ...current, uiLanguage: value as AppSettings["uiLanguage"] }))}>
                  <SelectTrigger aria-label={localize(language, "默认语言", "Default Language")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zh-CN">简体中文</SelectItem>
                    <SelectItem value="zh-TW">繁體中文</SelectItem>
                    <SelectItem value="en-US">English</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>
              <SettingRow
                title={localize(language, "涨跌颜色", "Gain/Loss Colors")}
                description={localize(language, "用于日盈亏、汇兑重估等金额变动；保存后相关页面会按该模式显示颜色和箭头。", "Used for daily P&L, FX revaluation, and other amount changes; related pages show matching colors and arrows after saving.")}
              >
                <Select
                  value={settings.marketChange.colorMode}
                  onValueChange={(value) =>
                    updateSettings((current) => ({
                      ...current,
                      marketChange: {
                        ...current.marketChange,
                        colorMode: value as AppSettings["marketChange"]["colorMode"]
                      }
                    }))
                  }
                >
                  <SelectTrigger aria-label={localize(language, "涨跌颜色", "Gain/Loss Colors")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="green-up-red-down">{localize(language, "绿涨 / 红跌", "Green Up / Red Down")}</SelectItem>
                    <SelectItem value="red-up-green-down">{localize(language, "红涨 / 绿跌", "Red Up / Green Down")}</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>
            </TabsContent>

            <TabsContent value="fx" className="mt-0 flex flex-col gap-3">
              <SettingRow
                title={localize(language, "汇率数据源", "FX Provider")}
                description={localize(language, "默认使用 Frankfurter 免费公开汇率 API；当前支持配置币种对和刷新频率。", "Uses the free public Frankfurter FX API by default; currency pairs and refresh cadence are configurable.")}
              >
                <Select value={settings.fx.provider} onValueChange={(value) => updateSettings((current) => ({ ...current, fx: { ...current.fx, provider: value as AppSettings["fx"]["provider"] } }))}>
                  <SelectTrigger aria-label={localize(language, "汇率数据源", "FX Provider")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="frankfurter">Frankfurter</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>
              <SettingRow
                title={localize(language, "启用自动刷新", "Enable Auto Refresh")}
                description={localize(language, "本地应用打开后会按刷新间隔尝试更新汇率；失败不会阻断手工录入。", "The local app can refresh FX after the interval elapses; failures do not block manual entry.")}
              >
                <Switch
                  aria-label={localize(language, "启用自动刷新", "Enable Auto Refresh")}
                  checked={settings.fx.autoRefreshEnabled}
                  onCheckedChange={(checked) => updateSettings((current) => ({ ...current, fx: { ...current.fx, autoRefreshEnabled: checked } }))}
                />
              </SettingRow>
              <SettingRow
                title={localize(language, "刷新频率（小时）", "Refresh Interval (hours)")}
                description={localize(language, "自动刷新判断是否过期时使用。", "Used to decide whether auto refresh is stale.")}
              >
                <Input
                  aria-label={localize(language, "刷新频率（小时）", "Refresh Interval (hours)")}
                  type="number"
                  min={1}
                  value={settings.fx.refreshIntervalHours}
                  onChange={(event) => updateSettings((current) => ({ ...current, fx: { ...current.fx, refreshIntervalHours: Number(event.target.value) || 24 } }))}
                />
              </SettingRow>
              <SettingRow
                title={localize(language, "币种对", "Currency Pairs")}
                description={localize(language, "用逗号分隔，例如 USD/CNY, HKD/CNY。", "Comma-separated, for example USD/CNY, HKD/CNY.")}
              >
                <Textarea
                  value={pairsText}
                  onChange={(event) => updateSettings((current) => ({ ...current, fx: { ...current.fx, pairs: textToList(event.target.value) } }))}
                  rows={3}
                />
              </SettingRow>
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 p-3">
                <div className="text-sm">
                  <div className="font-medium">{localize(language, "最近刷新", "Last Refresh")}</div>
                  <div className="text-xs text-muted-foreground">{settings.fx.lastRefreshAt ?? "N/A"} · {settings.fx.lastRefreshStatus ?? refreshStatus ?? "N/A"}</div>
                </div>
                <Button variant="outline" onClick={refreshFx} disabled={isPending}>
                  <RefreshCcwIcon data-icon="inline-start" />
                  {localize(language, "立即刷新汇率", "Refresh FX Now")}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="model" className="mt-0 flex flex-col gap-3">
              <SettingRow
                title={localize(language, "执行模式", "Execution Mode")}
                description={localize(language, "参考 open-design 的配置方式：可在本地规则模式和模型 API 模式之间切换。", "Switch between local rule mode and model API mode, following the open-design execution configuration pattern.")}
              >
                <Select
                  value={settings.modelApi.executionMode}
                  onValueChange={(value) =>
                    updateSettings((current) => ({
                      ...current,
                      modelApi: {
                        ...current.modelApi,
                        executionMode: value as AppSettings["modelApi"]["executionMode"]
                      }
                    }))
                  }
                >
                  <SelectTrigger aria-label={localize(language, "执行模式", "Execution Mode")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="model">{localize(language, "模型 API", "Model API")}</SelectItem>
                    <SelectItem value="local">{localize(language, "本地规则", "Local Rules")}</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>
              <SettingRow
                title={localize(language, "模型服务", "Model Provider")}
                description={localize(language, "支持 OpenAI-compatible Chat Completions；密钥默认从环境变量读取。", "Supports OpenAI-compatible Chat Completions; API keys are read from environment variables by default.")}
              >
                <Select value={settings.modelApi.provider} onValueChange={(value) => updateSettings((current) => ({ ...current, modelApi: { ...current.modelApi, provider: value as AppSettings["modelApi"]["provider"] } }))}>
                  <SelectTrigger aria-label={localize(language, "模型服务", "Model Provider")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai-compatible">OpenAI-compatible</SelectItem>
                    <SelectItem value="disabled">{localize(language, "禁用", "Disabled")}</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>
              <SettingRow title="Base URL" description={localize(language, "模型 API 的基础地址。", "Base URL for the model API.")}>
                <Input value={settings.modelApi.baseUrl} onChange={(event) => updateSettings((current) => ({ ...current, modelApi: { ...current.modelApi, baseUrl: event.target.value } }))} />
              </SettingRow>
              <SettingRow title="Model" description={localize(language, "用于信息抽取、论点辅助和后续决策智能能力的模型名称。", "Model used for information extraction, thesis assistance, and later decision intelligence.")}>
                <Input aria-label="Model" value={settings.modelApi.model} onChange={(event) => updateSettings((current) => ({ ...current, modelApi: { ...current.modelApi, model: event.target.value } }))} />
              </SettingRow>
              <SettingRow title="API Key Env" description={localize(language, "不在 SQLite 保存明文密钥，只保存环境变量名。", "Plain API keys are not stored in SQLite; only the environment variable name is stored.")}>
                <Input aria-label="API Key Env" value={settings.modelApi.apiKeyEnvVar} onChange={(event) => updateSettings((current) => ({ ...current, modelApi: { ...current.modelApi, apiKeyEnvVar: event.target.value } }))} />
              </SettingRow>
              <SettingRow title="Temperature" description={localize(language, "信息抽取建议保持低温度，以减少格式波动。", "Use a low temperature for stable information extraction output.")}>
                <Input aria-label="Temperature" type="number" step="0.1" min={0} max={1} value={settings.modelApi.temperature} onChange={(event) => updateSettings((current) => ({ ...current, modelApi: { ...current.modelApi, temperature: Number(event.target.value) || 0 } }))} />
              </SettingRow>
              <SettingRow title="Max Tokens" description={localize(language, "限制单次模型响应长度，研究分析需要比抽取略宽。", "Limits one model response; research analysis needs a wider budget than extraction.")}>
                <Input aria-label="Max Tokens" type="number" min={1} value={settings.modelApi.maxTokens} onChange={(event) => updateSettings((current) => ({ ...current, modelApi: { ...current.modelApi, maxTokens: Number(event.target.value) || 1600 } }))} />
              </SettingRow>
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 p-3">
                <div className="text-sm">
                  <div className="font-medium">{localize(language, "模型连接测试", "Model Connection Test")}</div>
                  <div className="text-xs text-muted-foreground">{modelTestStatus ?? localize(language, "保存配置后测试当前服务、模型和环境变量。", "Save settings, then test the current service, model, and environment variable.")}</div>
                </div>
                <Button variant="outline" onClick={testModel} disabled={isPending || settings.modelApi.executionMode !== "model"}>
                  <TestTube2Icon data-icon="inline-start" />
                  {localize(language, "测试模型连接", "Test Model")}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="agent" className="mt-0 flex flex-col gap-3">
              <SettingRow
                title={localize(language, "启用 Agent 工作流", "Enable Agent Workflow")}
                description={localize(language, "控制研究工作台是否优先使用可审计的 Agent 阶段、运行记录和下一步编排。", "Controls whether the research workspace prioritizes auditable agent stages, run records, and next-step orchestration.")}
              >
                <Switch
                  aria-label={localize(language, "启用 Agent 工作流", "Enable Agent Workflow")}
                  checked={settings.agentWorkflow.enabled}
                  onCheckedChange={(checked) => updateSettings((current) => ({ ...current, agentWorkflow: { ...current.agentWorkflow, enabled: checked } }))}
                />
              </SettingRow>
              <SettingRow
                title={localize(language, "默认选股市场", "Default Stock Market")}
                description={localize(language, "AI 自驱选股打开时的默认市场范围；仍可在页面上临时切换。", "Default market for AI stock picking; it can still be changed on the page.")}
              >
                <Select
                  value={settings.agentWorkflow.defaultMarket}
                  onValueChange={(value) =>
                    updateSettings((current) => ({
                      ...current,
                      agentWorkflow: {
                        ...current.agentWorkflow,
                        defaultMarket: value as AppSettings["agentWorkflow"]["defaultMarket"]
                      }
                    }))
                  }
                >
                  <SelectTrigger aria-label={localize(language, "默认选股市场", "Default Stock Market")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {agentMarketOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{localize(language, option.zh, option.en)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SettingRow>
              <SettingRow
                title={localize(language, "默认选股范围", "Default Stock Universe")}
                description={localize(language, "决定策略运行默认先看持仓、观察、候选或全部可研究标的。", "Controls whether strategy runs start from holdings, watchlist, candidates, or all researchable securities.")}
              >
                <Select
                  value={settings.agentWorkflow.defaultUniverse}
                  onValueChange={(value) =>
                    updateSettings((current) => ({
                      ...current,
                      agentWorkflow: {
                        ...current.agentWorkflow,
                        defaultUniverse: value as AppSettings["agentWorkflow"]["defaultUniverse"]
                      }
                    }))
                  }
                >
                  <SelectTrigger aria-label={localize(language, "默认选股范围", "Default Stock Universe")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {agentUniverseOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{localize(language, option.zh, option.en)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SettingRow>
              <SettingRow
                title={localize(language, "模型研判候选上限", "Max Model-Assessed Candidates")}
                description={localize(language, "每次策略运行最多调用模型补充多少个候选，避免一次运行过慢或费用不可控。", "Maximum candidates assessed by the model in one strategy run, limiting latency and cost.")}
              >
                <Input
                  aria-label={localize(language, "模型研判候选上限", "Max Model-Assessed Candidates")}
                  type="number"
                  min={1}
                  value={settings.agentWorkflow.maxModelCandidates}
                  onChange={(event) => updateSettings((current) => ({ ...current, agentWorkflow: { ...current.agentWorkflow, maxModelCandidates: Number(event.target.value) || 1 } }))}
                />
              </SettingRow>
              <SettingRow
                title={localize(language, "人工确认门禁", "Human Approval Gate")}
                description={localize(language, "模型生成的资料草稿先进入待确认状态，不自动写入正式信息来源或交易决策。", "Model-generated drafts stay pending and are not automatically saved as formal sources or trade decisions.")}
              >
                <Switch
                  aria-label={localize(language, "人工确认门禁", "Human Approval Gate")}
                  checked={settings.agentWorkflow.requireHumanApproval}
                  onCheckedChange={(checked) => updateSettings((current) => ({ ...current, agentWorkflow: { ...current.agentWorkflow, requireHumanApproval: checked } }))}
                />
              </SettingRow>
              <SettingRow
                title={localize(language, "记录历史操作", "Record Operation History")}
                description={localize(language, "保留每次运行、候选行动和阶段输出，用于复盘为什么走到某个结论。", "Keep every run, candidate action, and stage output for later review.")}
              >
                <Switch
                  aria-label={localize(language, "记录历史操作", "Record Operation History")}
                  checked={settings.agentWorkflow.recordHistory}
                  onCheckedChange={(checked) => updateSettings((current) => ({ ...current, agentWorkflow: { ...current.agentWorkflow, recordHistory: checked } }))}
                />
              </SettingRow>
            </TabsContent>

            <TabsContent value="source" className="mt-0 flex flex-col gap-3">
              <SettingRow
                title={localize(language, "启用信息智能获取", "Enable Source Intelligence")}
                description={localize(language, "为信息来源、投资论点、交易决策和复核事件复用同一抽取结果。", "Reuse one extraction result across sources, theses, trade decisions, and review events.")}
              >
                <Switch
                  aria-label={localize(language, "启用信息智能获取", "Enable Source Intelligence")}
                  checked={settings.sourceIntelligence.enabled}
                  onCheckedChange={(checked) => updateSettings((current) => ({ ...current, sourceIntelligence: { ...current.sourceIntelligence, enabled: checked } }))}
                />
              </SettingRow>
              <SettingRow title={localize(language, "默认可信域名", "Default Trusted Domains")} description={localize(language, "后续外部接口抓取和排序时作为优先源。", "Preferred sources for future external retrieval and ranking.")}>
                <Textarea value={domainsText} onChange={(event) => updateSettings((current) => ({ ...current, sourceIntelligence: { ...current.sourceIntelligence, defaultDomains: textToList(event.target.value) } }))} rows={3} />
              </SettingRow>
              <SettingRow title={localize(language, "最大候选来源数", "Max Candidate Sources")} description={localize(language, "控制一次智能获取保留多少候选来源。", "Controls how many candidate sources one retrieval keeps.")}>
                <Input aria-label={localize(language, "最大候选来源数", "Max Candidate Sources")} type="number" min={1} value={settings.sourceIntelligence.maxSources} onChange={(event) => updateSettings((current) => ({ ...current, sourceIntelligence: { ...current.sourceIntelligence, maxSources: Number(event.target.value) || 5 } }))} />
              </SettingRow>
              <SettingRow title={localize(language, "复用目标", "Reuse Targets")} description={localize(language, "用于提示模型将结构化结果服务于哪些模块。", "Tells the model which modules should reuse the structured result.")}>
                <Input value={reuseTargetsText} onChange={(event) => updateSettings((current) => ({ ...current, sourceIntelligence: { ...current.sourceIntelligence, reuseTargets: textToList(event.target.value) } }))} />
              </SettingRow>
              <SettingRow title={localize(language, "抽取提示词", "Extraction Prompt")} description={localize(language, "全局信息抽取策略，后续论点和决策模块复用。", "Global extraction policy reused by thesis and decision modules.")}>
                <Textarea value={settings.sourceIntelligence.extractionPrompt} onChange={(event) => updateSettings((current) => ({ ...current, sourceIntelligence: { ...current.sourceIntelligence, extractionPrompt: event.target.value } }))} rows={4} />
              </SettingRow>
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex items-center justify-between gap-2 border-t pt-4">
          <Badge variant="outline">{localize(language, "本地配置", "Local Settings")}</Badge>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>{t.cancel}</Button>
            <Button onClick={save} disabled={isPending}>
              <SaveIcon data-icon="inline-start" />
              {t.save}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
