import type { RiskEvaluationResult, RiskRuleInput, RiskWarning, TradeDecisionRiskInput } from "@/lib/domain";

function warningFor(rule: RiskRuleInput, actual: number): RiskWarning {
  return {
    ruleCode: rule.code,
    severity: rule.severity,
    threshold: rule.threshold,
    actual,
    message: `${rule.code} breached: ${actual.toFixed(4)} > ${rule.threshold.toFixed(4)}`
  };
}

export function evaluateTradeDecisionRisk(input: TradeDecisionRiskInput): RiskEvaluationResult {
  const warnings: RiskWarning[] = [];

  for (const rule of input.rules) {
    if (rule.code.includes("single_active_stock") && input.strategyType === "Active") {
      if (input.postTradeSecurityWeight > rule.threshold) {
        warnings.push(warningFor(rule, input.postTradeSecurityWeight));
      }
      continue;
    }

    if (rule.code.includes("single_theme")) {
      const maxThemeWeight = Math.max(0, ...input.postTradeThemeWeights.values());
      if (maxThemeWeight > rule.threshold) {
        warnings.push(warningFor(rule, maxThemeWeight));
      }
      continue;
    }

    if (rule.code.includes("planned_trade_risk")) {
      const actual = input.portfolioNetValue === 0 ? 0 : input.plannedAmountBase / input.portfolioNetValue;
      if (actual > rule.threshold) {
        warnings.push(warningFor(rule, actual));
      }
    }
  }

  return {
    canExecute: true,
    requiresExceptionDraft: warnings.some((warning) => warning.severity === "Hard"),
    warnings
  };
}
