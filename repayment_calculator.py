from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal, ROUND_CEILING, ROUND_FLOOR, ROUND_HALF_UP, localcontext
import calendar
from typing import List, Optional


class CalcError(ValueError):
    """业务计算错误。"""


class RoundingMode:
    HALF_UP = 1
    DOWN = 2
    UP = 3


class PaymentAlgorithm:
    PMT = 1
    ANNUITY_DISCOUNT = 2
    FIRST_PERIOD_EXTRA_INTEREST = 3


class RepaymentDayAlgorithm:
    BASED_ON_START_DATE = 1
    FIXED_DATE = 2


class MonthEndRepaymentConfig:
    FIXED_25 = 1
    ALIGN_MONTH_END = 2
    FIXED_28 = 3


class InterestDaysMode:
    ACTUAL_DAYS = 1
    FIXED_30 = 2


@dataclass
class RateConfig:
    daily_rate_precision: int
    rounding_mode: int
    days_in_year: int


@dataclass
class PeriodPaymentConfig:
    payment_algorithm: int
    rounding_mode: int
    interest_days_mode: int


@dataclass
class RepaymentDateConfig:
    repayment_day_algorithm: int
    month_end_repayment_config: int
    fixed_repayment_day: Optional[int]
    min_cycle_days: Optional[int]
    max_cycle_days: Optional[int]


@dataclass
class LoanInfo:
    nominal_rate: int
    periods: int
    principal: int
    loan_date: date


@dataclass
class SystemConfig:
    rate_config: RateConfig
    period_payment_config: PeriodPaymentConfig
    repayment_date_config: RepaymentDateConfig


@dataclass
class ScheduleRow:
    period_no: int
    planned_repayment_date: date
    interest_days: int
    remaining_principal: Decimal
    principal_payment: Decimal
    interest_payment: Decimal
    period_payment: Decimal


@dataclass
class ScheduleSummary:
    total_receivable: Decimal
    total_interest_fee: Decimal
    annualized_irr: Decimal
    total_interest_days: int
    apr: Decimal
    total_principal_paid: Decimal
    avg_period_payment: Decimal
    min_period_payment: Decimal
    max_period_payment: Decimal


def quantize_by_mode(value: Decimal, digits: int, rounding_mode: int) -> Decimal:
    quant = Decimal("1").scaleb(-digits)
    if rounding_mode == RoundingMode.HALF_UP:
        rounding = ROUND_HALF_UP
    elif rounding_mode == RoundingMode.DOWN:
        rounding = ROUND_FLOOR
    elif rounding_mode == RoundingMode.UP:
        rounding = ROUND_CEILING
    else:
        raise CalcError(f"未知取整方式: {rounding_mode}")
    return value.quantize(quant, rounding=rounding)


def add_months(dt: date, months: int) -> date:
    y = dt.year + (dt.month - 1 + months) // 12
    m = (dt.month - 1 + months) % 12 + 1
    d = min(dt.day, calendar.monthrange(y, m)[1])
    return date(y, m, d)


def change_day_keep_month(dt: date, day: int) -> date:
    if day < 1:
        raise CalcError(f"固定还款日不合法: {day}")
    max_day = calendar.monthrange(dt.year, dt.month)[1]
    return dt.replace(day=min(day, max_day))


def pmt(rate: Decimal, nper: int, pv: Decimal) -> Decimal:
    """Excel PMT 对齐：返回负值。"""
    if nper <= 0:
        raise CalcError("期数必须大于 0")
    if rate == 0:
        return -(pv / Decimal(nper))

    with localcontext() as ctx:
        ctx.prec = 40
        one = Decimal("1")
        factor = (one + rate) ** nper
        result = -(pv * rate * factor / (factor - one))
    return result


def validate_input(config: SystemConfig, loan: LoanInfo) -> None:
    if loan.periods <= 0:
        raise CalcError("借款期数必须大于 0")
    if loan.principal <= 0:
        raise CalcError("借款本金必须大于 0")
    if config.rate_config.days_in_year <= 0:
        raise CalcError("年天数必须大于 0")
    if config.rate_config.daily_rate_precision < 0:
        raise CalcError("日利率精度不能小于 0")
    if config.period_payment_config.payment_algorithm != PaymentAlgorithm.PMT:
        raise CalcError(
            f"当前仅支持期供算法=1(PMT)，收到: {config.period_payment_config.payment_algorithm}"
        )
    if config.repayment_date_config.repayment_day_algorithm == RepaymentDayAlgorithm.FIXED_DATE:
        if config.repayment_date_config.fixed_repayment_day is None:
            raise CalcError("还款日算法=固定日期 时，固定还款日不能为空")
        if config.repayment_date_config.min_cycle_days is None:
            raise CalcError("还款日算法=固定日期 时，最小周期不能为空")


def calc_daily_rate(config: SystemConfig, loan: LoanInfo) -> Decimal:
    raw = Decimal(loan.nominal_rate) / Decimal(10000) / Decimal(config.rate_config.days_in_year)
    return quantize_by_mode(
        raw, config.rate_config.daily_rate_precision, config.rate_config.rounding_mode
    )


def calc_initial_period_payment(config: SystemConfig, loan: LoanInfo, daily_rate: Decimal) -> Decimal:
    monthly_rate = daily_rate * Decimal(30)
    pv = Decimal(loan.principal) / Decimal(100)
    pmt_val = pmt(monthly_rate, loan.periods, pv)
    # Excel PMT 返回负值，这里按你的公式取负后再保留两位
    return quantize_by_mode(-pmt_val, 2, config.period_payment_config.rounding_mode)


def calc_planned_repayment_date(
    period_no: int, loan: LoanInfo, config: RepaymentDateConfig
) -> date:
    start = loan.loan_date
    if config.repayment_day_algorithm == RepaymentDayAlgorithm.FIXED_DATE:
        fixed_day = config.fixed_repayment_day
        min_cycle = config.min_cycle_days
        assert fixed_day is not None
        assert min_cycle is not None

        next_month_day = change_day_keep_month(add_months(start, 1), fixed_day)
        if (next_month_day - start).days < min_cycle:
            return change_day_keep_month(add_months(start, period_no + 1), fixed_day)
        return change_day_keep_month(add_months(start, period_no), fixed_day)

    if config.month_end_repayment_config == MonthEndRepaymentConfig.FIXED_25:
        if start.day >= 25:
            return change_day_keep_month(add_months(start, period_no), 25)
        return add_months(start, period_no)
    if config.month_end_repayment_config == MonthEndRepaymentConfig.FIXED_28:
        if start.day >= 28:
            return change_day_keep_month(add_months(start, period_no), 28)
        return add_months(start, period_no)
    if config.month_end_repayment_config == MonthEndRepaymentConfig.ALIGN_MONTH_END:
        return add_months(start, period_no)
    raise CalcError(f"未知月末还款日配置: {config.month_end_repayment_config}")


def calc_interest_days(
    period_no: int, planned_date: date, prev_planned_date: Optional[date], loan: LoanInfo, config: SystemConfig
) -> int:
    mode = config.period_payment_config.interest_days_mode
    if mode == InterestDaysMode.FIXED_30:
        return 30
    if mode == InterestDaysMode.ACTUAL_DAYS:
        if period_no == 1:
            return (planned_date - loan.loan_date).days
        if prev_planned_date is None:
            raise CalcError("第2期及以后必须提供上期还款日")
        return (planned_date - prev_planned_date).days
    raise CalcError(f"未知计息天数配置: {mode}")


def generate_schedule(config: SystemConfig, loan: LoanInfo) -> tuple[Decimal, Decimal, List[ScheduleRow]]:
    validate_input(config, loan)
    daily_rate = calc_daily_rate(config, loan)
    initial_payment = calc_initial_period_payment(config, loan, daily_rate)

    rows: List[ScheduleRow] = []
    prev_repayment_date: Optional[date] = None
    remaining_principal = Decimal(loan.principal) / Decimal(100)

    for i in range(1, loan.periods + 1):
        planned_date = calc_planned_repayment_date(i, loan, config.repayment_date_config)
        interest_days = calc_interest_days(i, planned_date, prev_repayment_date, loan, config)
        interest = quantize_by_mode(
            remaining_principal * Decimal(interest_days) * daily_rate,
            2,
            config.period_payment_config.rounding_mode,
        )

        if i < loan.periods:
            principal_payment = quantize_by_mode(
                initial_payment - interest, 2, config.period_payment_config.rounding_mode
            )
            period_payment = initial_payment
        else:
            principal_payment = quantize_by_mode(
                remaining_principal, 2, config.period_payment_config.rounding_mode
            )
            period_payment = quantize_by_mode(
                principal_payment + interest, 2, config.period_payment_config.rounding_mode
            )

        rows.append(
            ScheduleRow(
                period_no=i,
                planned_repayment_date=planned_date,
                interest_days=interest_days,
                remaining_principal=remaining_principal,
                principal_payment=principal_payment,
                interest_payment=interest,
                period_payment=period_payment,
            )
        )

        remaining_principal = quantize_by_mode(
            remaining_principal - principal_payment, 2, config.period_payment_config.rounding_mode
        )
        prev_repayment_date = planned_date

    return daily_rate, initial_payment, rows


def calculate_repayment_plan(
    config: SystemConfig, loan: LoanInfo
) -> tuple[Decimal, Decimal, List[ScheduleRow], ScheduleSummary]:
    """
    对外复用入口：
    返回（日利率, 初始期供, 还款计划明细, 统计结果）
    """
    daily_rate, initial_payment, rows = generate_schedule(config, loan)
    summary = calculate_summary(rows, loan, config.period_payment_config.rounding_mode)
    return daily_rate, initial_payment, rows, summary


def irr_periodic(cash_flows: List[Decimal], guess: Decimal = Decimal("0.1")) -> Decimal:
    """反算周期 IRR（与 Excel IRR 同口径，按期）。"""
    if len(cash_flows) < 2:
        raise CalcError("IRR 现金流至少需要 2 期")
    if not (any(cf > 0 for cf in cash_flows) and any(cf < 0 for cf in cash_flows)):
        raise CalcError("IRR 现金流必须同时包含流出(负)和流入(正)")

    def npv(rate: Decimal) -> Decimal:
        if rate <= Decimal("-1"):
            raise CalcError("IRR 计算失败：贴现率 <= -100%")
        with localcontext() as ctx:
            ctx.prec = 50
            one = Decimal("1")
            total = Decimal("0")
            for t, cf in enumerate(cash_flows):
                total += cf / ((one + rate) ** t)
            return total

    def d_npv(rate: Decimal) -> Decimal:
        with localcontext() as ctx:
            ctx.prec = 50
            one = Decimal("1")
            total = Decimal("0")
            for t, cf in enumerate(cash_flows):
                if t == 0:
                    continue
                total -= (Decimal(t) * cf) / ((one + rate) ** (t + 1))
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
        if abs(x_new - x) < Decimal("1e-14"):
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
        raise CalcError("IRR 计算失败：未找到有效根区间")

    for _ in range(200):
        mid = (low + high) / 2
        f_mid = npv(mid)
        if abs(f_mid) < Decimal("1e-18") or abs(high - low) < Decimal("1e-14"):
            return mid
        if f_low * f_mid <= 0:
            high = mid
            f_high = f_mid
        else:
            low = mid
            f_low = f_mid
    return (low + high) / 2


def calculate_summary(
    rows: List[ScheduleRow], loan: LoanInfo, rounding_mode: int
) -> ScheduleSummary:
    if not rows:
        raise CalcError("还款计划为空，无法统计")

    total_receivable = quantize_by_mode(
        sum((r.period_payment for r in rows), Decimal("0")), 2, rounding_mode
    )
    principal_yuan = Decimal(loan.principal) / Decimal(100)
    total_interest_fee = quantize_by_mode(total_receivable - principal_yuan, 2, rounding_mode)

    cash_flows = [-principal_yuan] + [r.period_payment for r in rows]
    periodic_irr = irr_periodic(cash_flows)
    annualized_irr = quantize_by_mode(periodic_irr * Decimal(12), 8, rounding_mode)

    total_interest_days = (rows[-1].planned_repayment_date - loan.loan_date).days
    if loan.periods <= 0:
        raise CalcError("期数必须大于 0")
    apr = quantize_by_mode(
        total_interest_fee * Decimal(12) / principal_yuan / Decimal(loan.periods),
        8,
        rounding_mode,
    )

    total_principal_paid = quantize_by_mode(
        sum((r.principal_payment for r in rows), Decimal("0")), 2, rounding_mode
    )
    avg_period_payment = quantize_by_mode(total_receivable / Decimal(len(rows)), 2, rounding_mode)
    min_period_payment = min(r.period_payment for r in rows)
    max_period_payment = max(r.period_payment for r in rows)

    return ScheduleSummary(
        total_receivable=total_receivable,
        total_interest_fee=total_interest_fee,
        annualized_irr=annualized_irr,
        total_interest_days=total_interest_days,
        apr=apr,
        total_principal_paid=total_principal_paid,
        avg_period_payment=avg_period_payment,
        min_period_payment=min_period_payment,
        max_period_payment=max_period_payment,
    )


def print_schedule(
    daily_rate: Decimal,
    initial_payment: Decimal,
    rows: List[ScheduleRow],
    summary: ScheduleSummary,
) -> None:
    print("===== 还款计划结果 =====")
    print(f"日利率: {daily_rate}")
    print(f"初始期供: {initial_payment}")
    print("-" * 88)
    print(
        f"{'期序':>4} {'计划还款日':>12} {'计息天数':>8} {'剩余本金':>10} {'本金':>10} {'利息':>10} {'期供':>10}"
    )
    for r in rows:
        print(
            f"{r.period_no:>4} {r.planned_repayment_date.isoformat():>12} {r.interest_days:>8} "
            f"{r.remaining_principal:>10} {r.principal_payment:>10} {r.interest_payment:>10} {r.period_payment:>10}"
        )
    print("-" * 88)
    print("===== 统计结果（步骤五）=====")
    print(f"总应收: {summary.total_receivable}")
    print(f"总息费: {summary.total_interest_fee}")
    print(f"IRR反算(年化, IRR*12): {summary.annualized_irr}")
    print(f"总计息天数: {summary.total_interest_days}")
    print(f"APR: {summary.apr}")
    print(f"总还本金: {summary.total_principal_paid}")
    print(f"平均期供: {summary.avg_period_payment}")
    print(f"最低期供: {summary.min_period_payment}")
    print(f"最高期供: {summary.max_period_payment}")


def demo() -> None:
    config = SystemConfig(
        rate_config=RateConfig(
            daily_rate_precision=8,
            rounding_mode=RoundingMode.HALF_UP,
            days_in_year=360,
        ),
        period_payment_config=PeriodPaymentConfig(
            payment_algorithm=PaymentAlgorithm.PMT,
            rounding_mode=RoundingMode.HALF_UP,
            interest_days_mode=InterestDaysMode.FIXED_30,
        ),
        repayment_date_config=RepaymentDateConfig(
            repayment_day_algorithm=RepaymentDayAlgorithm.BASED_ON_START_DATE,
            month_end_repayment_config=MonthEndRepaymentConfig.FIXED_25,
            fixed_repayment_day=None,
            min_cycle_days=None,
            max_cycle_days=None,
        ),
    )
    loan = LoanInfo(
        nominal_rate=3600,
        periods=3,
        principal=1000000,
        loan_date=date(2026, 2, 1),
    )
    daily_rate, initial_payment, rows = generate_schedule(config, loan)
    summary = calculate_summary(rows, loan, config.period_payment_config.rounding_mode)
    print_schedule(daily_rate, initial_payment, rows, summary)


if __name__ == "__main__":
    try:
        demo()
    except CalcError as e:
        print(f"[业务错误] {e}")
    except Exception as e:
        print(f"[系统错误] {e}")
