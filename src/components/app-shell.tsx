"use client";

import {
  AlertTriangleIcon,
  BanknoteIcon,
  BarChart3Icon,
  CalendarDaysIcon,
  BookOpenIcon,
  CalendarClockIcon,
  DatabaseIcon,
  DownloadIcon,
  FileTextIcon,
  GaugeIcon,
  GlobeIcon,
  LandmarkIcon,
  LineChartIcon,
  ReceiptTextIcon,
  ShieldAlertIcon
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HelpTooltip } from "@/components/help-tooltip";
import { ThemeToggle } from "@/components/theme-toggle";
import { useLanguage } from "@/components/language-provider";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { languageOptions, translateText, translateUiHelp, type Language } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", labelZh: "仪表盘", labelEn: "Dashboard", icon: GaugeIcon },
  { href: "/accounts", labelZh: "账户", labelEn: "Accounts", icon: LandmarkIcon },
  { href: "/account-calendar", labelZh: "账户日历", labelEn: "Account Calendar", icon: CalendarDaysIcon },
  { href: "/securities", labelZh: "标的", labelEn: "Securities", icon: DatabaseIcon },
  { href: "/transactions", labelZh: "交易流水", labelEn: "Transactions", icon: ReceiptTextIcon },
  { href: "/cashflows", labelZh: "现金流/公司行为", labelEn: "Cashflows", icon: BanknoteIcon },
  { href: "/prices", labelZh: "价格", labelEn: "Prices", icon: LineChartIcon },
  { href: "/fx-rates", labelZh: "汇率", labelEn: "FX Rates", icon: GlobeIcon },
  { href: "/sources", labelZh: "信息来源", labelEn: "Sources", icon: FileTextIcon },
  { href: "/theses", labelZh: "投资论点", labelEn: "Theses", icon: BookOpenIcon },
  { href: "/review-events", labelZh: "复核日历", labelEn: "Review Events", icon: CalendarClockIcon },
  { href: "/trade-decisions", labelZh: "交易决策", labelEn: "Trade Decisions", icon: BarChart3Icon },
  { href: "/risk-rules", labelZh: "风险规则", labelEn: "Risk Rules", icon: ShieldAlertIcon },
  { href: "/exceptions", labelZh: "例外/违规", labelEn: "Exceptions", icon: AlertTriangleIcon },
  { href: "/export", labelZh: "导出", labelEn: "Export", icon: DownloadIcon }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { language, setLanguage, t } = useLanguage();
  const localize = (zh: string, en: string) => (language === "en-US" ? en : translateText(zh, language));

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
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                href={item.href}
                key={item.href}
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
          </div>
        </header>
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
