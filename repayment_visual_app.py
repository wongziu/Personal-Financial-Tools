from __future__ import annotations

from datetime import date
import altair as alt
import pandas as pd
import streamlit as st

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
)


ROUNDING_OPTIONS = {
    "四舍五入": RoundingMode.HALF_UP,
    "向下取整": RoundingMode.DOWN,
    "向上取整": RoundingMode.UP,
}

PAYMENT_ALGO_OPTIONS = {
    "PMT(已支持)": PaymentAlgorithm.PMT,
    "等额年金贴现": PaymentAlgorithm.ANNUITY_DISCOUNT,
    "首期额外计息": PaymentAlgorithm.FIRST_PERIOD_EXTRA_INTEREST,
}

INTEREST_DAYS_OPTIONS = {
    "实际天数": InterestDaysMode.ACTUAL_DAYS,
    "固定30天": InterestDaysMode.FIXED_30,
    "特殊首实际其它30": InterestDaysMode.SPECIAL_FIRST_ACTUAL_OTHER_30,
    "特殊末实际其它30": InterestDaysMode.SPECIAL_LAST_ACTUAL_OTHER_30,
}

INTEREST_CALC_OPTIONS = {
    "日利率计算": 1,
    "月利率计算": 2,
}

FIRST_LAST_OPTIONS = {
    "末期调整": 1,
    "全部相等": 2,
    "首末期调整": 3,
}

REPAYMENT_DAY_ALGO_OPTIONS = {
    "根据起息日计算": RepaymentDayAlgorithm.BASED_ON_START_DATE,
    "固定日期": RepaymentDayAlgorithm.FIXED_DATE,
}

MONTH_END_OPTIONS = {
    "固定25号": MonthEndRepaymentConfig.FIXED_25,
    "对齐月末": MonthEndRepaymentConfig.ALIGN_MONTH_END,
    "固定28号": MonthEndRepaymentConfig.FIXED_28,
}


def rows_to_dataframe(rows) -> pd.DataFrame:
    data = []
    for r in rows:
        data.append(
            {
                "期序": r.period_no,
                "计划还款日": r.planned_repayment_date.isoformat(),
                "计息天数": r.interest_days,
                "剩余本金": float(r.remaining_principal),
                "本金": float(r.principal_payment),
                "利息": float(r.interest_payment),
                "期供": float(r.period_payment),
            }
        )
    return pd.DataFrame(data)


def build_config_panel() -> tuple[SystemConfig, LoanInfo]:
    st.sidebar.header("借款信息")
    principal = st.sidebar.number_input("借款本金(分)", min_value=1, value=10000, step=100)
    periods = st.sidebar.number_input("期数", min_value=1, max_value=600, value=12, step=1)
    nominal_rate = st.sidebar.number_input("名义利率(万分比)", min_value=0, value=3600, step=1)
    loan_date = st.sidebar.date_input("借款日期", value=date(2026, 2, 1))

    with st.sidebar.expander("还款日配置", expanded=True):
        repayment_algo_label = st.selectbox("还款日算法", list(REPAYMENT_DAY_ALGO_OPTIONS.keys()), index=0)
        month_end_label = st.selectbox("月末还款日配置", list(MONTH_END_OPTIONS.keys()), index=0)
        fixed_repayment_day = st.number_input("固定还款日(仅固定日期时有效)", min_value=1, max_value=31, value=25)
        min_cycle_days = st.number_input("最小周期(天, 仅固定日期时有效)", min_value=1, max_value=100, value=15)
        max_cycle_days = st.number_input("最大周期(天, 预留)", min_value=1, max_value=366, value=60)

    st.sidebar.header("系统设置变量")
    with st.sidebar.expander("期供配置", expanded=True):
        payment_algo_label = st.selectbox("期供算法", list(PAYMENT_ALGO_OPTIONS.keys()), index=0)
        payment_rounding_label = st.selectbox("期供取整方式", list(ROUNDING_OPTIONS.keys()), index=0)
        interest_rounding_label = st.selectbox("利息取整方式", list(ROUNDING_OPTIONS.keys()), index=0)
        interest_days_label = st.selectbox("计息天数", list(INTEREST_DAYS_OPTIONS.keys()), index=1)
        interest_calc_label = st.selectbox("利息计算方式", list(INTEREST_CALC_OPTIONS.keys()), index=0)
        first_last_label = st.selectbox("首末期算法配置", list(FIRST_LAST_OPTIONS.keys()), index=0)

    with st.sidebar.expander("利率配置", expanded=True):
        daily_rate_precision = st.number_input("日利率精度", min_value=0, max_value=18, value=8, step=1)
        rate_rounding_label = st.selectbox("取整方式(利率)", list(ROUNDING_OPTIONS.keys()), index=0)
        days_in_year = st.number_input("年天数", min_value=1, max_value=366, value=360, step=1)

    repayment_algo = REPAYMENT_DAY_ALGO_OPTIONS[repayment_algo_label]
    fixed_day = int(fixed_repayment_day) if repayment_algo == RepaymentDayAlgorithm.FIXED_DATE else None
    min_cycle = int(min_cycle_days) if repayment_algo == RepaymentDayAlgorithm.FIXED_DATE else None
    max_cycle = int(max_cycle_days) if repayment_algo == RepaymentDayAlgorithm.FIXED_DATE else None

    config = SystemConfig(
        rate_config=RateConfig(
            daily_rate_precision=int(daily_rate_precision),
            rounding_mode=ROUNDING_OPTIONS[rate_rounding_label],
            days_in_year=int(days_in_year),
        ),
        period_payment_config=PeriodPaymentConfig(
            payment_algorithm=PAYMENT_ALGO_OPTIONS[payment_algo_label],
            rounding_mode=ROUNDING_OPTIONS[payment_rounding_label],
            interest_days_mode=INTEREST_DAYS_OPTIONS[interest_days_label],
            interest_rounding_mode=ROUNDING_OPTIONS[interest_rounding_label],
            interest_calc_mode=INTEREST_CALC_OPTIONS[interest_calc_label],
            first_last_algo_mode=FIRST_LAST_OPTIONS[first_last_label],
        ),
        repayment_date_config=RepaymentDateConfig(
            repayment_day_algorithm=repayment_algo,
            month_end_repayment_config=MONTH_END_OPTIONS[month_end_label],
            fixed_repayment_day=fixed_day,
            min_cycle_days=min_cycle,
            max_cycle_days=max_cycle,
        ),
    )

    loan = LoanInfo(
        nominal_rate=int(nominal_rate),
        periods=int(periods),
        principal=int(principal),
        loan_date=loan_date,
    )

    return config, loan


def show_summary(summary, daily_rate, initial_payment) -> None:
    st.subheader("统计结果")
    summary_df = pd.DataFrame(
        [
            {"指标": "日利率", "数值": f"{daily_rate}"},
            {"指标": "初始期供", "数值": f"{initial_payment}"},
            {"指标": "总应收", "数值": f"{summary.total_receivable}"},
            {"指标": "总息费", "数值": f"{summary.total_interest_fee}"},
            {"指标": "IRR反算(年化)", "数值": f"{summary.annualized_irr}"},
            {"指标": "APR", "数值": f"{summary.apr}"},
            {"指标": "总计息天数", "数值": f"{summary.total_interest_days}"},
            {"指标": "平均期供", "数值": f"{summary.avg_period_payment}"},
            {"指标": "总还本金", "数值": f"{summary.total_principal_paid}"},
        ]
    )
    st.dataframe(summary_df, use_container_width=True, hide_index=True)


def show_charts(df: pd.DataFrame) -> None:
    st.subheader("可视化结果")
    max_period = int(df["期序"].max())
    max_value = float(df[["本金", "利息", "期供", "剩余本金"]].max().max())
    y_domain = [0, max_value * 1.05]
    x_domain = [1, max_period]

    principal_interest_long = df.melt(
        id_vars=["期序"], value_vars=["本金", "利息"], var_name="类型", value_name="金额"
    )
    principal_interest_chart = (
        alt.Chart(principal_interest_long)
        .mark_bar()
        .encode(
            x=alt.X("期序:Q", scale=alt.Scale(domain=x_domain), axis=alt.Axis(tickMinStep=1)),
            y=alt.Y("金额:Q", scale=alt.Scale(domain=y_domain)),
            color="类型:N",
            xOffset="类型:N",
            tooltip=["期序", "类型", alt.Tooltip("金额:Q", format=",.2f")],
        )
        .properties(height=300)
    )
    st.caption("每期 本金/利息 结构")
    st.altair_chart(principal_interest_chart, use_container_width=True)

    payment_trend_chart = (
        alt.Chart(df)
        .mark_line(point=True)
        .encode(
            x=alt.X("期序:Q", scale=alt.Scale(domain=x_domain), axis=alt.Axis(tickMinStep=1)),
            y=alt.Y("期供:Q", scale=alt.Scale(domain=y_domain)),
            tooltip=["期序", alt.Tooltip("期供:Q", format=",.2f")],
        )
        .properties(height=300)
    )
    st.caption("每期期供走势")
    st.altair_chart(payment_trend_chart, use_container_width=True)

    remaining_chart = (
        alt.Chart(df)
        .mark_line(point=True)
        .encode(
            x=alt.X("期序:Q", scale=alt.Scale(domain=x_domain), axis=alt.Axis(tickMinStep=1)),
            y=alt.Y("剩余本金:Q", scale=alt.Scale(domain=y_domain)),
            tooltip=["期序", alt.Tooltip("剩余本金:Q", format=",.2f")],
        )
        .properties(height=300)
    )
    st.caption("剩余本金下降曲线")
    st.altair_chart(remaining_chart, use_container_width=True)


def app() -> None:
    st.set_page_config(page_title="还款计划计算器", page_icon="📊", layout="wide")
    st.title("还款计划计算器 - 可视化配置与结果")
    st.write("在左侧填写配置和借款信息，点击“生成还款计划”查看明细、统计和图表。")

    config, loan = build_config_panel()

    if st.button("生成还款计划", type="primary"):
        try:
            daily_rate, initial_payment, rows, summary = calculate_repayment_plan(config, loan)
            df = rows_to_dataframe(rows)
            display_df = df.copy()

            st.subheader("还款计划明细")
            st.dataframe(
                display_df.style.format({"剩余本金": "{:,.2f}", "利息": "{:,.2f}", "期供": "{:,.2f}"}),
                use_container_width=True,
                hide_index=True,
            )

            show_summary(summary, daily_rate, initial_payment)

            csv_bytes = df.to_csv(index=False).encode("utf-8-sig")
            st.download_button(
                label="下载明细CSV",
                data=csv_bytes,
                file_name="repayment_schedule.csv",
                mime="text/csv",
            )

            show_charts(df)

        except CalcError as e:
            st.error(f"业务错误: {e}")
        except Exception as e:
            st.error(f"系统错误: {e}")


if __name__ == "__main__":
    app()
