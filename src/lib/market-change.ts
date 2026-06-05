export type MarketChangeColorMode = "green-up-red-down" | "red-up-green-down";
export type MarketChangeDirection = "up" | "down" | "flat";

const upGreenClasses = "text-emerald-600 dark:text-emerald-400";
const downRedClasses = "text-red-600 dark:text-red-400";

export function normalizeMarketChangeColorMode(value: unknown): MarketChangeColorMode {
  return value === "red-up-green-down" ? "red-up-green-down" : "green-up-red-down";
}

export function marketChangeDirection(value: number): MarketChangeDirection {
  if (value > 0) {
    return "up";
  }

  if (value < 0) {
    return "down";
  }

  return "flat";
}

export function marketChangeClassName(value: number, colorMode: MarketChangeColorMode): string {
  const direction = marketChangeDirection(value);
  if (direction === "flat") {
    return "";
  }

  const positiveClassName = colorMode === "green-up-red-down" ? upGreenClasses : downRedClasses;
  const negativeClassName = colorMode === "green-up-red-down" ? downRedClasses : upGreenClasses;
  return direction === "up" ? positiveClassName : negativeClassName;
}

export function marketChangeArrowLabel(value: number): "up" | "down" | null {
  const direction = marketChangeDirection(value);
  return direction === "flat" ? null : direction;
}
