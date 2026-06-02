import { z } from "zod";

export const tradeDecisionInputSchema = z.object({
  securityId: z.string().min(1),
  thesisId: z.string().optional().nullable(),
  strategyType: z.enum(["Core", "Active", "Trading", "Experimental"]),
  action: z.enum(["Buy", "Add", "Reduce", "Exit", "NoAction"]),
  currentPrice: z.coerce.number().positive(),
  plannedPriceMin: z.coerce.number().nonnegative(),
  plannedPriceMax: z.coerce.number().nonnegative(),
  plannedAmountBase: z.coerce.number().nonnegative(),
  preTradeWeight: z.coerce.number().min(0),
  postTradeWeight: z.coerce.number().min(0),
  maxAllowedWeight: z.coerce.number().min(0),
  trigger: z.string().min(1),
  expectedReturnSource: z.string().min(1),
  mainRisks: z.string().min(1),
  downsideLossBase: z.coerce.number().min(0),
  stopLossOrInvalidation: z.string().min(1),
  hasSimilarThemeExposure: z.coerce.boolean(),
  similarThemeExposure: z.coerce.number().min(0),
  touchesLimits: z.coerce.boolean(),
  isRuleException: z.coerce.boolean(),
  emotionTag: z.string().min(1),
  finalDecision: z.enum(["Execute", "Abandon", "Delay"]),
  sourceIds: z.array(z.string()).default([])
});

export type TradeDecisionInput = z.infer<typeof tradeDecisionInputSchema>;
