import { describe, expect, test } from "vitest";
import { marketChangeArrowLabel, marketChangeClassName, marketChangeDirection } from "@/lib/market-change";

describe("market change display helpers", () => {
  test("uses green for gains and red for losses in the conventional mode", () => {
    expect(marketChangeDirection(12)).toBe("up");
    expect(marketChangeArrowLabel(12)).toBe("up");
    expect(marketChangeClassName(12, "green-up-red-down")).toContain("text-emerald-600");

    expect(marketChangeDirection(-8)).toBe("down");
    expect(marketChangeArrowLabel(-8)).toBe("down");
    expect(marketChangeClassName(-8, "green-up-red-down")).toContain("text-red-600");
  });

  test("uses red for gains and green for losses in the reverse mode", () => {
    expect(marketChangeClassName(12, "red-up-green-down")).toContain("text-red-600");
    expect(marketChangeClassName(-8, "red-up-green-down")).toContain("text-emerald-600");
  });

  test("keeps zero values neutral", () => {
    expect(marketChangeDirection(0)).toBe("flat");
    expect(marketChangeArrowLabel(0)).toBeNull();
    expect(marketChangeClassName(0, "green-up-red-down")).toBe("");
  });
});
