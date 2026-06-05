"use client";

import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";
import type { ReactNode } from "react";
import { marketChangeClassName, marketChangeDirection, type MarketChangeColorMode } from "@/lib/market-change";
import { cn } from "@/lib/utils";

export function MarketChangeValue({
  value,
  colorMode,
  children,
  className,
  iconClassName
}: {
  value: number;
  colorMode: MarketChangeColorMode;
  children: ReactNode;
  className?: string;
  iconClassName?: string;
}) {
  const direction = marketChangeDirection(value);
  const ArrowIcon = direction === "up" ? ArrowUpIcon : direction === "down" ? ArrowDownIcon : null;

  return (
    <span
      data-market-change={direction}
      data-market-change-color-mode={colorMode}
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap tabular-nums",
        marketChangeClassName(value, colorMode),
        className
      )}
    >
      {ArrowIcon ? <ArrowIcon aria-hidden className={cn("size-3.5 shrink-0", iconClassName)} /> : null}
      <span>{children}</span>
    </span>
  );
}
