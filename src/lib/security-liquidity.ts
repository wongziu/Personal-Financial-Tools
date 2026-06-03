export type LiquidityLevel = "High" | "Medium" | "Low";

const assetTypesWithLockup = new Set(["ActiveFund", "Bond"]);

export function assetTypeRequiresLockup(assetType: unknown): boolean {
  return assetTypesWithLockup.has(String(assetType));
}

export function normalizeLockupDays(assetType: unknown, value: unknown): number | null {
  if (!assetTypeRequiresLockup(assetType)) {
    return null;
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return 0;
  }

  return Math.floor(numericValue);
}

export function deriveLiquidityLevel(assetType: unknown, lockupDays: unknown): LiquidityLevel {
  if (!assetTypeRequiresLockup(assetType)) {
    return "High";
  }

  const normalizedDays = normalizeLockupDays(assetType, lockupDays) ?? 0;
  if (normalizedDays > 180) {
    return "Low";
  }

  if (normalizedDays > 7) {
    return "Medium";
  }

  return "High";
}
