from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from pathlib import Path
from typing import Iterable, List, Optional

import pandas as pd

from repayment_calculator import (
    CalcError,
    InterestDaysMode,
    LoanInfo,
    MonthEndRepaymentConfig,
    PaymentAlgorithm,
    PeriodPaymentConfig,
    RateConfig,
    RepaymentDateConfig,
    RepaymentDayAlgorithm,
    RoundingMode,
    SystemConfig,
    calculate_repayment_plan,
    calc_planned_repayment_date,
)


@dataclass(frozen=True)
class ConfigCandidate:
    rate_config: RateConfig
    period_payment_config: PeriodPaymentConfig
    repayment_date_config: RepaymentDateConfig

    def to_dict(self) -> dict:
        return {
            "日利率精度": self.rate_config.daily_rate_precision,
            "利率取整方式": self.rate_config.rounding_mode,
            "利率取整方式名称": ROUNDING_CN.get(self.rate_config.rounding_mode, ""),
            "年天数": self.rate_config.days_in_year,
            "期供算法": self.period_payment_config.payment_algorithm,
            "期供算法名称": PAYMENT_ALGO_CN.get(self.period_payment_config.payment_algorithm, ""),
            "期供取整方式": self.period_payment_config.rounding_mode,
            "期供取整方式名称": ROUNDING_CN.get(self.period_payment_config.rounding_mode, ""),
            "利息取整方式": self.period_payment_config.interest_rounding_mode,
            "利息取整方式名称": ROUNDING_CN.get(self.period_payment_config.interest_rounding_mode, ""),
            "利息计算方式": self.period_payment_config.interest_calc_mode,
            "利息计算方式名称": INTEREST_CALC_CN.get(self.period_payment_config.interest_calc_mode, ""),
            "首末期算法配置": self.period_payment_config.first_last_algo_mode,
            "首末期算法配置名称": FIRST_LAST_CN.get(self.period_payment_config.first_last_algo_mode, ""),
            "计息天数类型": self.period_payment_config.interest_days_mode,
            "计息天数类型名称": INTEREST_DAYS_CN.get(self.period_payment_config.interest_days_mode, ""),
            "还款日算法": self.repayment_date_config.repayment_day_algorithm,
            "还款日算法名称": REPAYMENT_DAY_ALGO_CN.get(
                self.repayment_date_config.repayment_day_algorithm, ""
            ),
            "月末还款日配置": self.repayment_date_config.month_end_repayment_config,
            "月末还款日配置名称": MONTH_END_CN.get(
                self.repayment_date_config.month_end_repayment_config, ""
            ),
            "固定还款日": self.repayment_date_config.fixed_repayment_day,
            "最小周期": self.repayment_date_config.min_cycle_days,
        }


ROUNDING_CN = {
    RoundingMode.HALF_UP: "四舍五入",
    RoundingMode.DOWN: "向下取整",
    RoundingMode.UP: "向上取整",
}

PAYMENT_ALGO_CN = {
    PaymentAlgorithm.PMT: "PMT",
    PaymentAlgorithm.ANNUITY_DISCOUNT: "等额年金贴现",
}

INTEREST_DAYS_CN = {
    InterestDaysMode.ACTUAL_DAYS: "实际天数",
    InterestDaysMode.FIXED_30: "固定30天",
    InterestDaysMode.SPECIAL_FIRST_ACTUAL_FEB_28: "特殊首实际2月28",
    InterestDaysMode.SPECIAL_FIRST_ACTUAL_OTHER_30: "特殊首实际其它30",
    InterestDaysMode.SPECIAL_LAST_ACTUAL_OTHER_30: "特殊末实际其它30",
}

INTEREST_CALC_CN = {
    1: "日利率计算",
    2: "月利率计算",
}

FIRST_LAST_CN = {
    1: "末期调整",
    2: "全部相等",
    3: "首末期调整",
}

REPAYMENT_DAY_ALGO_CN = {
    RepaymentDayAlgorithm.BASED_ON_START_DATE: "根据起息日计算",
    RepaymentDayAlgorithm.FIXED_DATE: "固定日期",
}

MONTH_END_CN = {
    MonthEndRepaymentConfig.FIXED_25: "固定25号",
}


def iter_repayment_date_candidates() -> Iterable[RepaymentDateConfig]:
    # repayment_day_algorithm: 1 then 2
    # month_end_repayment_config: 1,2,3
    # fixed_repayment_day: 10-20
    # min_cycle_days: 15,14,16,17
    month_end_order = [
        MonthEndRepaymentConfig.FIXED_25,
        MonthEndRepaymentConfig.ALIGN_MONTH_END,
        MonthEndRepaymentConfig.FIXED_28,
    ]
    for algo in [RepaymentDayAlgorithm.BASED_ON_START_DATE, RepaymentDayAlgorithm.FIXED_DATE]:
        if algo == RepaymentDayAlgorithm.BASED_ON_START_DATE:
            for mec in month_end_order:
                yield RepaymentDateConfig(
                    repayment_day_algorithm=algo,
                    month_end_repayment_config=mec,
                    fixed_repayment_day=None,
                    min_cycle_days=None,
                    max_cycle_days=None,
                )
        else:
            for fixed_day in range(10, 21):
                for min_cycle in [15, 14, 16, 17]:
                    yield RepaymentDateConfig(
                        repayment_day_algorithm=algo,
                        month_end_repayment_config=MonthEndRepaymentConfig.FIXED_25,
                        fixed_repayment_day=fixed_day,
                        min_cycle_days=min_cycle,
                        max_cycle_days=None,
                    )


def iter_rate_candidates() -> Iterable[RateConfig]:
    # daily_rate_precision: 8 -> 7 -> 6 -> 9
    # rounding: 1,2,3
    # days_in_year: 360 -> 365
    for precision in [8, 7, 6, 9]:
        for rounding in [RoundingMode.HALF_UP, RoundingMode.DOWN, RoundingMode.UP]:
            for days_in_year in [360, 365]:
                yield RateConfig(
                    daily_rate_precision=precision,
                    rounding_mode=rounding,
                    days_in_year=days_in_year,
                )


def iter_payment_candidates() -> Iterable[PeriodPaymentConfig]:
    # algorithm: 1,2
    # rounding: 1,2,3
    # interest rounding: 1,2,3
    # interest days: 2,1,3
    for algo in [PaymentAlgorithm.PMT, PaymentAlgorithm.ANNUITY_DISCOUNT]:
        for rounding in [RoundingMode.HALF_UP, RoundingMode.DOWN, RoundingMode.UP]:
            for interest_rounding in [
                RoundingMode.HALF_UP,
                RoundingMode.DOWN,
                RoundingMode.UP,
            ]:
                for interest_calc in [2, 1]:
                    for first_last in [1, 2, 3]:
                        for interest_days in [
                            InterestDaysMode.FIXED_30,
                            InterestDaysMode.ACTUAL_DAYS,
                            InterestDaysMode.SPECIAL_FIRST_ACTUAL_FEB_28,
                            InterestDaysMode.SPECIAL_FIRST_ACTUAL_OTHER_30,
                            InterestDaysMode.SPECIAL_LAST_ACTUAL_OTHER_30,
                        ]:
                            yield PeriodPaymentConfig(
                                payment_algorithm=algo,
                                rounding_mode=rounding,
                                interest_days_mode=interest_days,
                                interest_rounding_mode=interest_rounding,
                                interest_calc_mode=interest_calc,
                                first_last_algo_mode=first_last,
                            )


def parse_date(value) -> date:
    return pd.to_datetime(value).date()


def build_planned_dates(loan: LoanInfo, repay_cfg: RepaymentDateConfig) -> List[date]:
    return [calc_planned_repayment_date(i, loan, repay_cfg) for i in range(1, loan.periods + 1)]


def compare_schedule(rows, plan_df: pd.DataFrame, tolerance: Decimal) -> tuple[bool, dict]:
    # assume plan_df sorted by fuiperiod asc
    max_principal_err = Decimal("0")
    max_interest_err = Decimal("0")
    max_total_err = Decimal("0")
    date_mismatch = False

    for row, (_, plan_row) in zip(rows, plan_df.iterrows()):
        plan_date = parse_date(plan_row["plan_repay_date"])
        if row.planned_repayment_date != plan_date:
            date_mismatch = True
        plan_principal = Decimal(str(plan_row["fuiplanprincipal"])) / Decimal("100")
        plan_interest = Decimal(str(plan_row["fuiplaninterest"])) / Decimal("100")
        plan_total = Decimal(str(plan_row["plan_invest_total"])) / Decimal("100")

        principal_err = abs(row.principal_payment - plan_principal)
        interest_err = abs(row.interest_payment - plan_interest)
        total_err = abs(row.period_payment - plan_total)

        if principal_err > max_principal_err:
            max_principal_err = principal_err
        if interest_err > max_interest_err:
            max_interest_err = interest_err
        if total_err > max_total_err:
            max_total_err = total_err

        if date_mismatch or (
            principal_err > tolerance
            or interest_err > tolerance
            or total_err > tolerance
        ):
            return False, {
                "max_principal_err": max_principal_err,
                "max_interest_err": max_interest_err,
                "max_total_err": max_total_err,
                "日期是否匹配": "否" if date_mismatch else "是",
            }

    return True, {
        "max_principal_err": max_principal_err,
        "max_interest_err": max_interest_err,
        "max_total_err": max_total_err,
        "日期是否匹配": "是",
    }


def xirr(cash_flows: List[Decimal], dates: List[date], guess: Decimal = Decimal("0.1")) -> Decimal:
    if len(cash_flows) != len(dates):
        raise CalcError("XIRR 现金流与日期数量不一致")
    if len(cash_flows) < 2:
        raise CalcError("XIRR 现金流至少需要 2 期")
    if not (any(cf > 0 for cf in cash_flows) and any(cf < 0 for cf in cash_flows)):
        raise CalcError("XIRR 现金流必须同时包含流出(负)和流入(正)")

    base_date = dates[0]

    def years_since(d: date) -> Decimal:
        return Decimal((d - base_date).days) / Decimal(365)

    def npv(rate: Decimal) -> Decimal:
        if rate <= Decimal("-1"):
            raise CalcError("XIRR 计算失败：贴现率 <= -100%")
        total = Decimal("0")
        for cf, d in zip(cash_flows, dates):
            t = years_since(d)
            total += cf / ((Decimal("1") + rate) ** t)
        return total

    def d_npv(rate: Decimal) -> Decimal:
        total = Decimal("0")
        for cf, d in zip(cash_flows, dates):
            t = years_since(d)
            if t == 0:
                continue
            total -= (t * cf) / ((Decimal("1") + rate) ** (t + 1))
        return total

    x = guess
    for _ in range(100):
        fx = npv(x)
        dfx = d_npv(x)
        if dfx == 0:
            break
        x_new = x - fx / dfx
        if x_new <= Decimal("-0.999999999"):
            break
        if abs(x_new - x) < Decimal("1e-12"):
            return x_new
        x = x_new

    low = Decimal("-0.9999")
    high = Decimal("10")
    f_low = npv(low)
    f_high = npv(high)
    expand_count = 0
    while f_low * f_high > 0 and expand_count < 20:
        high *= 2
        f_high = npv(high)
        expand_count += 1
    if f_low * f_high > 0:
        raise CalcError("XIRR 计算失败：未找到有效根区间")

    for _ in range(200):
        mid = (low + high) / 2
        f_mid = npv(mid)
        if abs(f_mid) < Decimal("1e-18") or abs(high - low) < Decimal("1e-12"):
            return mid
        if f_low * f_mid <= 0:
            high = mid
            f_high = f_mid
        else:
            low = mid
            f_low = f_mid
    return (low + high) / 2

def fit_one_loan(
    project_id: int,
    loan_id: int,
    loan: LoanInfo,
    plan_df: pd.DataFrame,
    tolerance: Decimal,
) -> tuple[Optional[ConfigCandidate], List[dict]]:
    attempts: List[dict] = []

    # Step 1: fit repayment date config by exact date match
    repayment_candidates = []
    plan_dates = list(plan_df["plan_repay_date"].apply(parse_date))

    for repay_cfg in iter_repayment_date_candidates():
        try:
            calc_dates = build_planned_dates(loan, repay_cfg)
        except Exception as exc:
            attempts.append(
                {
                    "FuiFundsProjectId": project_id,
                    "example_loan_id": loan_id,
                    "阶段": "还款日拟合",
                    "成功": False,
                    "原因": f"date_calc_error: {exc}",
                    **ConfigCandidate(
                        rate_config=RateConfig(0, 0, 0),
                        period_payment_config=PeriodPaymentConfig(0, 0, 0, 0, 0, 0),
                        repayment_date_config=repay_cfg,
                    ).to_dict(),
                }
            )
            continue

        if calc_dates == plan_dates:
            repayment_candidates.append(repay_cfg)
            attempts.append(
                {
                    "FuiFundsProjectId": project_id,
                    "example_loan_id": loan_id,
                    "阶段": "还款日拟合",
                    "成功": True,
                    "原因": "date_match",
                    **ConfigCandidate(
                        rate_config=RateConfig(0, 0, 0),
                        period_payment_config=PeriodPaymentConfig(0, 0, 0, 0, 0, 0),
                        repayment_date_config=repay_cfg,
                    ).to_dict(),
                }
            )
        else:
            attempts.append(
                {
                    "FuiFundsProjectId": project_id,
                    "example_loan_id": loan_id,
                    "阶段": "还款日拟合",
                    "成功": False,
                    "原因": "date_mismatch",
                    **ConfigCandidate(
                        rate_config=RateConfig(0, 0, 0),
                        period_payment_config=PeriodPaymentConfig(0, 0, 0, 0, 0, 0),
                        repayment_date_config=repay_cfg,
                    ).to_dict(),
                }
            )

    if not repayment_candidates:
        return None, attempts

    # Step 2: fit other configs
    for repay_cfg in repayment_candidates:
        for rate_cfg in iter_rate_candidates():
            for pay_cfg in iter_payment_candidates():
                cfg = SystemConfig(
                    rate_config=rate_cfg,
                    period_payment_config=pay_cfg,
                    repayment_date_config=repay_cfg,
                )
                try:
                    _, _, rows, _ = calculate_repayment_plan(cfg, loan)
                except CalcError as exc:
                    attempts.append(
                        {
                            "FuiFundsProjectId": project_id,
                            "example_loan_id": loan_id,
                            "阶段": "全量拟合",
                            "成功": False,
                            "原因": f"calc_error: {exc}",
                            **ConfigCandidate(
                                rate_config=rate_cfg,
                                period_payment_config=pay_cfg,
                                repayment_date_config=repay_cfg,
                            ).to_dict(),
                        }
                    )
                    continue

                ok, err_info = compare_schedule(rows, plan_df, tolerance)
                attempts.append(
                    {
                        "FuiFundsProjectId": project_id,
                        "example_loan_id": loan_id,
                        "阶段": "全量拟合",
                        "成功": ok,
                        "原因": "fit" if ok else "mismatch",
                        **err_info,
                        **ConfigCandidate(
                            rate_config=rate_cfg,
                            period_payment_config=pay_cfg,
                            repayment_date_config=repay_cfg,
                        ).to_dict(),
                    }
                )
                if ok:
                    return (
                        ConfigCandidate(
                            rate_config=rate_cfg,
                            period_payment_config=pay_cfg,
                            repayment_date_config=repay_cfg,
                        ),
                        attempts,
                    )

    return None, attempts


def fit_from_excel(
    excel_path: Path,
    tolerance: Decimal = Decimal("0.02"),
    output_path: Optional[Path] = None,
) -> Path:
    df = pd.read_excel(excel_path)
    required_cols = {
        "FuiFundsProjectId",
        "example_loan_id",
        "total_period",
        "lend_date",
        "fuiloanrate",
        "FuiLoanAmount",
        "fuiperiod",
        "fuiplanprincipal",
        "fuiplaninterest",
        "plan_repay_date",
        "plan_invest_total",
    }
    missing = required_cols - set(df.columns)
    if missing:
        raise CalcError(f"缺少必要字段: {sorted(missing)}")

    results = []
    project_cache: dict[int, tuple[bool, Optional[ConfigCandidate]]] = {}

    for loan_id, g in df.groupby("example_loan_id"):
        g_sorted = g.sort_values("fuiperiod")
        project_id = int(g_sorted.iloc[0]["FuiFundsProjectId"])
        loan = LoanInfo(
            nominal_rate=int(g_sorted.iloc[0]["fuiloanrate"]),
            periods=int(g_sorted.iloc[0]["total_period"]),
            principal=int(g_sorted.iloc[0]["FuiLoanAmount"]),
            loan_date=parse_date(g_sorted.iloc[0]["lend_date"]),
        )

        cached = project_cache.get(project_id)
        best: Optional[ConfigCandidate] = None
        attempts: List[dict] = []

        if cached is not None and cached[0] and cached[1] is not None:
            cfg = SystemConfig(
                rate_config=cached[1].rate_config,
                period_payment_config=cached[1].period_payment_config,
                repayment_date_config=cached[1].repayment_date_config,
            )
            try:
                _, _, rows, _ = calculate_repayment_plan(cfg, loan)
                ok, err_info = compare_schedule(rows, g_sorted, tolerance)
            except CalcError as exc:
                ok = False
                err_info = {"max_principal_err": None, "max_interest_err": None, "max_total_err": None, "日期是否匹配": "否"}
                attempts.append(
                    {
                        "FuiFundsProjectId": project_id,
                        "example_loan_id": loan_id,
                        "阶段": "沿用配置",
                        "成功": False,
                        "原因": f"calc_error: {exc}",
                        **cached[1].to_dict(),
                    }
                )
            else:
                attempts.append(
                    {
                        "FuiFundsProjectId": project_id,
                        "example_loan_id": loan_id,
                        "阶段": "沿用配置",
                        "成功": ok,
                        "原因": "fit" if ok else "mismatch",
                        **err_info,
                        **cached[1].to_dict(),
                    }
                )
            if ok:
                best = cached[1]
            else:
                best, extra_attempts = fit_one_loan(project_id, loan_id, loan, g_sorted, tolerance)
                attempts.extend(extra_attempts)
        else:
            best, attempts = fit_one_loan(project_id, loan_id, loan, g_sorted, tolerance)

        if best is None:
            results.append(
                {
                    "FuiFundsProjectId": project_id,
                    "example_loan_id": loan_id,
                    "拟合成功": False,
                    "失败原因": "no_config_matched",
                }
            )
            project_cache[project_id] = (False, None)
        else:
            cfg = SystemConfig(
                rate_config=best.rate_config,
                period_payment_config=best.period_payment_config,
                repayment_date_config=best.repayment_date_config,
            )
            _, _, rows, summary = calculate_repayment_plan(cfg, loan)
            cash_flows = [-Decimal(loan.principal) / Decimal("100")]
            cash_flows.extend([r.period_payment for r in rows])
            dates = [loan.loan_date] + [r.planned_repayment_date for r in rows]
            try:
                xirr_value = xirr(cash_flows, dates)
            except CalcError:
                xirr_value = None
            results.append(
                {
                    "FuiFundsProjectId": project_id,
                    "example_loan_id": loan_id,
                    "拟合成功": True,
                    "标的计息天数": summary.total_interest_days,
                    "APR": summary.apr,
                    "IRR反算": summary.annualized_irr,
                    "XIRR": xirr_value,
                    **best.to_dict(),
                }
            )
            project_cache[project_id] = (True, best)

    result_df = pd.DataFrame(results)
    # Ensure example_loan_id is stored as text to preserve long IDs in Excel.
    if "example_loan_id" in result_df.columns:
        result_df["example_loan_id"] = result_df["example_loan_id"].astype(str)

    summary_df = (
        result_df.groupby("FuiFundsProjectId", as_index=False)
        .agg(
            拟合总数=("example_loan_id", "count"),
            拟合成功数=("拟合成功", "sum"),
        )
    )
    summary_df["拟合失败数"] = summary_df["拟合总数"] - summary_df["拟合成功数"]
    summary_df["拟合成功率"] = summary_df["拟合成功数"] / summary_df["拟合总数"]

    if output_path is None:
        output_path = excel_path.with_name("还款计划拟合结果-4.xlsx")

    with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
        result_df.to_excel(writer, index=False, sheet_name="拟合结果")
        summary_df.to_excel(writer, index=False, sheet_name="项目汇总")

    return output_path


def main() -> None:
    excel_path = Path("/Users/ziu.huang/Documents/GitHub/mortgage/还款计划数据-4.xlsx")
    output = fit_from_excel(excel_path)
    print(f"输出: {output}")


if __name__ == "__main__":
    try:
        main()
    except CalcError as exc:
        print(f"[业务错误] {exc}")
    except Exception as exc:
        print(f"[系统错误] {exc}")
