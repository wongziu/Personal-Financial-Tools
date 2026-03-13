from __future__ import annotations

import argparse
import json
import os
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from itertools import product
from pathlib import Path
from typing import Any, Iterable, List

import pandas as pd

from repayment_calculator import (
    CalcError,
    LoanInfo,
    PeriodPaymentConfig,
    RateConfig,
    RepaymentDateConfig,
    SystemConfig,
    calculate_repayment_plan,
)


@dataclass
class AlgorithmCase:
    name: str
    config: SystemConfig


def get_required(d: dict[str, Any], keys: list[str], field_name: str) -> Any:
    for k in keys:
        if k in d:
            return d[k]
    raise CalcError(f"配置缺失字段: {field_name}，可选键: {keys}")


def get_optional(d: dict[str, Any], keys: list[str], default: Any = None) -> Any:
    for k in keys:
        if k in d:
            return d[k]
    return default


def parse_system_config(raw: dict[str, Any]) -> SystemConfig:
    rate = get_required(raw, ["rate_config", "利率配置"], "利率配置")
    pay = get_required(raw, ["period_payment_config", "期供配置"], "期供配置")
    repay = get_required(raw, ["repayment_date_config", "还款日配置"], "还款日配置")

    return SystemConfig(
        rate_config=RateConfig(
            daily_rate_precision=int(get_required(rate, ["daily_rate_precision", "日利率精度"], "日利率精度")),
            rounding_mode=int(get_required(rate, ["rounding_mode", "取整方式"], "利率配置.取整方式")),
            days_in_year=int(get_required(rate, ["days_in_year", "年天数"], "年天数")),
        ),
        period_payment_config=PeriodPaymentConfig(
            payment_algorithm=int(get_required(pay, ["payment_algorithm", "期供算法"], "期供算法")),
            rounding_mode=int(get_required(pay, ["rounding_mode", "取整方式"], "期供配置.取整方式")),
            interest_days_mode=int(get_required(pay, ["interest_days_mode", "计息天数"], "计息天数")),
            interest_rounding_mode=int(
                get_optional(pay, ["interest_rounding_mode", "利息取整方式"], get_required(pay, ["rounding_mode", "取整方式"], "期供配置.取整方式"))
            ),
            interest_calc_mode=int(get_optional(pay, ["interest_calc_mode", "利息计算方式"], 1)),
            first_last_algo_mode=int(get_optional(pay, ["first_last_algo_mode", "首末期算法配置"], 1)),
        ),
        repayment_date_config=RepaymentDateConfig(
            repayment_day_algorithm=int(
                get_required(repay, ["repayment_day_algorithm", "还款日算法"], "还款日算法")
            ),
            month_end_repayment_config=int(
                get_required(repay, ["month_end_repayment_config", "月末还款日配置"], "月末还款日配置")
            ),
            fixed_repayment_day=get_optional(repay, ["fixed_repayment_day", "固定还款日"], None),
            min_cycle_days=get_optional(repay, ["min_cycle_days", "最小周期"], None),
            max_cycle_days=get_optional(repay, ["max_cycle_days", "最大周期"], None),
        ),
    )


def load_compare_config(config_path: Path) -> tuple[list[int], list[int], list[int], list[int], AlgorithmCase, AlgorithmCase, str, str]:
    with config_path.open("r", encoding="utf-8") as f:
        raw = json.load(f)

    loan_grid = get_required(raw, ["loan_grid", "借款信息比对列表"], "借款信息比对列表")
    principals = [int(x) for x in get_required(loan_grid, ["principals", "借款本金"], "借款本金")]
    periods = [int(x) for x in get_required(loan_grid, ["periods", "期数"], "期数")]
    rates = [int(x) for x in get_required(loan_grid, ["rates", "利率"], "利率")]
    months = [int(x) for x in get_required(loan_grid, ["months", "月份"], "月份")]

    algorithms = get_required(raw, ["algorithms", "算法配置"], "算法配置")
    if not isinstance(algorithms, list) or len(algorithms) != 2:
        raise CalcError("算法配置必须为长度为2的列表")

    algo1_raw = algorithms[0]
    algo2_raw = algorithms[1]

    algo1 = AlgorithmCase(
        name=str(get_required(algo1_raw, ["name", "名称"], "算法1名称")),
        config=parse_system_config(get_required(algo1_raw, ["config", "配置信息"], "算法1配置")),
    )
    algo2 = AlgorithmCase(
        name=str(get_required(algo2_raw, ["name", "名称"], "算法2名称")),
        config=parse_system_config(get_required(algo2_raw, ["config", "配置信息"], "算法2配置")),
    )

    output = get_optional(raw, ["output", "输出"], {})
    output_dir = str(get_optional(output, ["dir", "目录"], "."))
    filename_prefix = str(get_optional(output, ["filename_prefix", "文件名前缀"], "algorithm_compare"))

    return principals, periods, rates, months, algo1, algo2, output_dir, filename_prefix


def build_loan_cases(
    principals: Iterable[int], periods: Iterable[int], rates: Iterable[int], months: Iterable[int]
) -> List[LoanInfo]:
    loan_cases: List[LoanInfo] = []
    for principal, period, rate, month in product(principals, periods, rates, months):
        if month < 1 or month > 12:
            raise CalcError(f"月份非法: {month}，必须在1-12")
        loan_cases.append(
            LoanInfo(
                nominal_rate=rate,
                periods=period,
                principal=principal,
                loan_date=date(2026, month, 1),
            )
        )
    return loan_cases


def dec_to_float(v: Decimal) -> float:
    return float(v)


def compare_algorithms(
    loan_cases: List[LoanInfo], algorithm_1: AlgorithmCase, algorithm_2: AlgorithmCase
) -> pd.DataFrame:
    rows = []
    for loan in loan_cases:
        _, _, _, summary1 = calculate_repayment_plan(algorithm_1.config, loan)
        _, _, _, summary2 = calculate_repayment_plan(algorithm_2.config, loan)

        apr_delta = summary2.apr - summary1.apr
        fee_delta = summary2.total_interest_fee - summary1.total_interest_fee

        rows.append(
            {
                "金额": loan.principal,
                "金额(元)": loan.principal / 100,
                "期数": loan.periods,
                "利率": loan.nominal_rate,
                "借款日期": loan.loan_date.isoformat(),
                f"{algorithm_1.name}APR": dec_to_float(summary1.apr),
                f"{algorithm_2.name}APR": dec_to_float(summary2.apr),
                "APR差值(算法2-算法1)": dec_to_float(apr_delta),
                "总息费差值(算法2-算法1)": dec_to_float(fee_delta),
                "算法2是否更高APR": 1 if apr_delta > 0 else 0,
                "算法2是否更高总息费": 1 if fee_delta > 0 else 0,
            }
        )
    df = pd.DataFrame(rows)
    df["月份"] = pd.to_datetime(df["借款日期"]).dt.month
    return df


def build_analysis_frames(df: pd.DataFrame) -> dict[str, pd.DataFrame]:
    apr_col = "APR差值(算法2-算法1)"
    fee_col = "总息费差值(算法2-算法1)"

    overall = pd.DataFrame(
        {
            "指标": [
                "样本数",
                "算法2 APR更高占比",
                "算法2 总息费更高占比",
                "APR差值均值(算法2-算法1)",
                "APR差值中位数",
                "APR差值最小值",
                "APR差值最大值",
                "总息费差值均值(算法2-算法1)",
                "总息费差值中位数",
                "总息费差值最小值",
                "总息费差值最大值",
            ],
            "值": [
                int(len(df)),
                float((df[apr_col] > 0).mean()),
                float((df[fee_col] > 0).mean()),
                float(df[apr_col].mean()),
                float(df[apr_col].median()),
                float(df[apr_col].min()),
                float(df[apr_col].max()),
                float(df[fee_col].mean()),
                float(df[fee_col].median()),
                float(df[fee_col].min()),
                float(df[fee_col].max()),
            ],
        }
    )

    by_period = (
        df.groupby("期数", as_index=False)
        .agg(
            样本数=("期数", "count"),
            APR差值均值=(apr_col, "mean"),
            APR差值中位数=(apr_col, "median"),
            总息费差值均值=(fee_col, "mean"),
            总息费差值中位数=(fee_col, "median"),
            算法2_APR更高占比=(apr_col, lambda x: (x > 0).mean()),
            算法2_总息费更高占比=(fee_col, lambda x: (x > 0).mean()),
        )
        .sort_values("期数")
    )

    by_rate = (
        df.groupby("利率", as_index=False)
        .agg(
            样本数=("利率", "count"),
            APR差值均值=(apr_col, "mean"),
            总息费差值均值=(fee_col, "mean"),
            算法2_APR更高占比=(apr_col, lambda x: (x > 0).mean()),
        )
        .sort_values("利率", ascending=False)
    )

    by_month = (
        df.groupby("月份", as_index=False)
        .agg(
            样本数=("月份", "count"),
            APR差值均值=(apr_col, "mean"),
            总息费差值均值=(fee_col, "mean"),
            算法2_APR更高占比=(apr_col, lambda x: (x > 0).mean()),
        )
        .sort_values("月份")
    )

    chart_data = (
        df.groupby(["月份", "期数"], as_index=False)
        .agg(
            APR差值均值=(apr_col, "mean"),
            总息费差值均值=(fee_col, "mean"),
        )
        .sort_values(["月份", "期数"])
    )

    return {
        "总体统计": overall,
        "按期数统计": by_period,
        "按利率统计": by_rate,
        "按月份统计": by_month,
        "图表数据": chart_data,
    }


def export_to_excel(
    detail_df: pd.DataFrame,
    analysis_frames: dict[str, pd.DataFrame],
    output_dir: str = ".",
    filename_prefix: str = "algorithm_compare",
) -> Path:
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_path = Path(output_dir) / f"{filename_prefix}_{ts}.xlsx"

    with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
        detail_df.to_excel(writer, index=False, sheet_name="明细")
        for sheet_name, frame in analysis_frames.items():
            frame.to_excel(writer, index=False, sheet_name=sheet_name)

    return output_path


def export_optional_charts(analysis_frames: dict[str, pd.DataFrame], output_dir: str, prefix: str) -> list[Path]:
    os.environ.setdefault("MPLCONFIGDIR", "/tmp/mplconfig")
    try:
        import matplotlib.pyplot as plt
    except Exception:
        return []

    output_paths: list[Path] = []
    by_month = analysis_frames["按月份统计"]
    by_period = analysis_frames["按期数统计"]

    p1 = Path(output_dir) / f"{prefix}_month_apr_delta.png"
    plt.figure(figsize=(9, 4.5))
    plt.plot(by_month["月份"], by_month["APR差值均值"], marker="o")
    plt.axhline(0, color="gray", linestyle="--", linewidth=1)
    plt.title("APR Delta Mean by Month (Algo2 - Algo1)")
    plt.xlabel("Month")
    plt.ylabel("APR Delta Mean")
    plt.grid(alpha=0.2)
    plt.tight_layout()
    plt.savefig(p1, dpi=140)
    plt.close()
    output_paths.append(p1)

    p2 = Path(output_dir) / f"{prefix}_period_fee_delta.png"
    plt.figure(figsize=(8, 4.5))
    plt.bar(by_period["期数"].astype(str), by_period["总息费差值均值"])
    plt.axhline(0, color="gray", linestyle="--", linewidth=1)
    plt.title("Interest Fee Delta Mean by Tenor (Algo2 - Algo1)")
    plt.xlabel("Tenor")
    plt.ylabel("Interest Fee Delta Mean")
    plt.tight_layout()
    plt.savefig(p2, dpi=140)
    plt.close()
    output_paths.append(p2)

    return output_paths


def build_sample_defaults() -> tuple[list[int], list[int], list[int], list[int], AlgorithmCase, AlgorithmCase, str, str]:
    principals = [1000000]
    periods = [3, 6, 12]
    rates = [3598, 3300, 2400, 2100, 1800, 720]
    months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

    algo1 = AlgorithmCase(
        name="固定30天",
        config=SystemConfig(
            rate_config=RateConfig(daily_rate_precision=8, rounding_mode=1, days_in_year=360),
            period_payment_config=PeriodPaymentConfig(
                payment_algorithm=1,
                rounding_mode=1,
                interest_days_mode=2,
                interest_rounding_mode=1,
                interest_calc_mode=1,
                first_last_algo_mode=1,
            ),
            repayment_date_config=RepaymentDateConfig(
                repayment_day_algorithm=1,
                month_end_repayment_config=1,
                fixed_repayment_day=None,
                min_cycle_days=None,
                max_cycle_days=None,
            ),
        ),
    )
    algo2 = AlgorithmCase(
        name="按实际占用天数",
        config=SystemConfig(
            rate_config=RateConfig(daily_rate_precision=8, rounding_mode=1, days_in_year=360),
            period_payment_config=PeriodPaymentConfig(
                payment_algorithm=1,
                rounding_mode=1,
                interest_days_mode=1,
                interest_rounding_mode=1,
                interest_calc_mode=1,
                first_last_algo_mode=1,
            ),
            repayment_date_config=RepaymentDateConfig(
                repayment_day_algorithm=1,
                month_end_repayment_config=1,
                fixed_repayment_day=None,
                min_cycle_days=None,
                max_cycle_days=None,
            ),
        ),
    )
    return principals, periods, rates, months, algo1, algo2, ".", "algorithm_compare"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="还款算法比对工具")
    parser.add_argument(
        "--config",
        type=str,
        default="compare_config.sample.json",
        help="JSON配置文件路径；默认读取 compare_config.sample.json，不存在时回退内置示例",
    )
    parser.add_argument(
        "--no-chart",
        action="store_true",
        help="仅导出Excel，不生成PNG图",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.config:
        cfg_path = Path(args.config)
        if cfg_path.exists():
            principals, periods, rates, months, algo1, algo2, output_dir, prefix = load_compare_config(cfg_path)
        elif args.config == "compare_config.sample.json":
            principals, periods, rates, months, algo1, algo2, output_dir, prefix = build_sample_defaults()
            print(f"提示: 未找到默认配置文件 {cfg_path}，已回退到内置示例数据。")
        else:
            raise CalcError(f"配置文件不存在: {cfg_path}")
    else:
        principals, periods, rates, months, algo1, algo2, output_dir, prefix = build_sample_defaults()

    loan_cases = build_loan_cases(principals, periods, rates, months)
    detail_df = compare_algorithms(loan_cases, algo1, algo2)
    analysis_frames = build_analysis_frames(detail_df)
    output_path = export_to_excel(detail_df, analysis_frames, output_dir=output_dir, filename_prefix=prefix)

    chart_paths: list[Path] = []
    if not args.no_chart:
        chart_paths = export_optional_charts(analysis_frames, output_dir=output_dir, prefix=prefix)

    print(f"组合数量: {len(loan_cases)}")
    print(f"算法1: {algo1.name}")
    print(f"算法2: {algo2.name}")
    print(f"导出Excel: {output_path.resolve()}")
    if chart_paths:
        for p in chart_paths:
            print(f"导出图表: {p.resolve()}")
    else:
        print("图表导出: 跳过（未安装matplotlib或使用了--no-chart）")
    print("结果预览(前10行):")
    print(detail_df.head(10).to_string(index=False))


if __name__ == "__main__":
    try:
        main()
    except CalcError as e:
        print(f"[业务错误] {e}")
    except Exception as e:
        print(f"[系统错误] {e}")
