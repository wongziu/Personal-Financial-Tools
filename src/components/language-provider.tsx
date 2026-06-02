"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Language = "zh-CN" | "en-US";

type Dictionary = {
  appName: string;
  dashboard: string;
  tradeDecisions: string;
  export: string;
  newRecord: string;
  save: string;
  cancel: string;
  search: string;
  noRecords: string;
  language: string;
  theme: string;
  light: string;
  dark: string;
  metrics: string;
  riskWarnings: string;
  recentDecisions: string;
  pendingExceptions: string;
  reviewEvents: string;
  downloadWorkbook: string;
  createDecision: string;
  riskCheck: string;
  submitDecision: string;
  formSaved: string;
  formError: string;
  portfolioNetValue: string;
  cashValue: string;
  largestHolding: string;
  maxTheme: string;
};

const dictionaries: Record<Language, Dictionary> = {
  "zh-CN": {
    appName: "投资决策系统",
    dashboard: "仪表盘",
    tradeDecisions: "交易决策",
    export: "导出",
    newRecord: "新建记录",
    save: "保存",
    cancel: "取消",
    search: "筛选",
    noRecords: "暂无记录",
    language: "语言",
    theme: "主题",
    light: "浅色",
    dark: "深色",
    metrics: "关键指标",
    riskWarnings: "风险警告",
    recentDecisions: "最近决策",
    pendingExceptions: "待处理例外",
    reviewEvents: "待复核事件",
    downloadWorkbook: "下载 Excel 工作簿",
    createDecision: "新建交易决策",
    riskCheck: "风险校验",
    submitDecision: "提交决策",
    formSaved: "记录已保存",
    formError: "保存失败",
    portfolioNetValue: "组合净值",
    cashValue: "现金价值",
    largestHolding: "最大持仓",
    maxTheme: "最大主题暴露"
  },
  "en-US": {
    appName: "Investment Decision System",
    dashboard: "Dashboard",
    tradeDecisions: "Trade Decisions",
    export: "Export",
    newRecord: "New Record",
    save: "Save",
    cancel: "Cancel",
    search: "Filter",
    noRecords: "No records",
    language: "Language",
    theme: "Theme",
    light: "Light",
    dark: "Dark",
    metrics: "Key Metrics",
    riskWarnings: "Risk Warnings",
    recentDecisions: "Recent Decisions",
    pendingExceptions: "Pending Exceptions",
    reviewEvents: "Review Events",
    downloadWorkbook: "Download Excel Workbook",
    createDecision: "Create Trade Decision",
    riskCheck: "Risk Check",
    submitDecision: "Submit Decision",
    formSaved: "Record saved",
    formError: "Save failed",
    portfolioNetValue: "Portfolio Net Value",
    cashValue: "Cash Value",
    largestHolding: "Largest Holding",
    maxTheme: "Max Theme Exposure"
  }
} as const;

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: Dictionary;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("zh-CN");

  useEffect(() => {
    const stored = window.localStorage.getItem("investment-system-language") as Language | null;
    if (stored === "zh-CN" || stored === "en-US") {
      setLanguageState(stored);
    }
  }, []);

  const setLanguage = (nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    window.localStorage.setItem("investment-system-language", nextLanguage);
  };

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: dictionaries[language]
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }
  return context;
}
