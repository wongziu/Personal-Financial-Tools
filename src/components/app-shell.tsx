"use client";

import { useEffect } from "react";
import {
  BanknoteIcon,
  BookOpenIcon,
  ChartCandlestickIcon,
  GaugeIcon,
  GlobeIcon,
  ReceiptTextIcon,
  ShieldAlertIcon,
  TargetIcon,
  WalletCardsIcon
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppSettingsDialog } from "@/components/app-settings-dialog";
import { HelpTooltip } from "@/components/help-tooltip";
import { ThemeToggle } from "@/components/theme-toggle";
import { useLanguage } from "@/components/language-provider";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { languageOptions, translateText, translateUiHelp, type Language } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", labelZh: "仪表盘", labelEn: "Dashboard", icon: GaugeIcon },
  { href: "/accounts", labelZh: "账户", labelEn: "Accounts", icon: WalletCardsIcon },
  { href: "/securities", labelZh: "标的", labelEn: "Securities", icon: TargetIcon },
  { href: "/transactions", labelZh: "标的交易流水", labelEn: "Security Transactions", icon: ReceiptTextIcon },
  { href: "/cashflows", labelZh: "账户现金流", labelEn: "Account Cashflows", icon: BanknoteIcon },
  { href: "/market-data", labelZh: "行情数据", labelEn: "Market Data", icon: ChartCandlestickIcon },
  { href: "/research", labelZh: "研究工作台", labelEn: "Research Workspace", icon: BookOpenIcon },
  { href: "/governance", labelZh: "风控与导出", labelEn: "Governance & Export", icon: ShieldAlertIcon }
];

const legacyRouteGroups: Record<string, string> = {
  "/portfolio": "/accounts",
  "/account-calendar": "/accounts",
  "/ledger": "/transactions",
  "/prices": "/market-data",
  "/fx-rates": "/market-data",
  "/sources": "/research",
  "/theses": "/research",
  "/review-events": "/research",
  "/trade-decisions": "/research",
  "/risk-rules": "/governance",
  "/exceptions": "/governance",
  "/export": "/governance"
};

function activeNavigationPath(pathname: string) {
  if (pathname.startsWith("/securities")) {
    return "/securities";
  }

  return legacyRouteGroups[pathname] ?? pathname;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { language, setLanguage, t } = useLanguage();
  const localize = (zh: string, en: string) => (language === "en-US" ? en : translateText(zh, language));
  const activePath = activeNavigationPath(pathname);

  useEffect(() => {
    if (window.sessionStorage.getItem("investment-system-fx-auto-refresh") === "1") {
      return;
    }
    window.sessionStorage.setItem("investment-system-fx-auto-refresh", "1");
    fetch("/api/fx-refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "auto" })
    }).catch(() => undefined);
  }, []);

  return (
    <div className="min-h-screen bg-muted/30">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-background md:flex md:flex-col">
        <div className="flex h-16 items-center px-5">
          <div>
            <div className="text-sm font-semibold">{t.appName}</div>
            <div className="text-xs text-muted-foreground">SQLite / Local</div>
          </div>
        </div>
        <Separator />
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {navItems.map((item) => {
            const active = activePath === item.href;
            const Icon = item.icon;
            return (
              <Link
                href={item.href}
                key={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                  active && "bg-accent text-foreground"
                )}
              >
                <Icon className="size-4" />
                {localize(item.labelZh, item.labelEn)}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="md:pl-64">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:px-6">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{t.appName}</div>
            <div className="text-xs text-muted-foreground">V1 Trading Loop</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <GlobeIcon className="size-4 text-muted-foreground" />
              <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
                <SelectTrigger aria-label={t.language} className="h-9 w-[128px]">
                  <SelectValue>{languageOptions.find((option) => option.value === language)?.label ?? language}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {languageOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <HelpTooltip content={translateUiHelp("app.language", language)} label={t.language} />
            </div>
            <ThemeToggle />
            <AppSettingsDialog />
          </div>
        </header>
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
