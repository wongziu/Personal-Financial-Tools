#!/usr/bin/env python3
import argparse
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Tuple
from urllib.error import URLError, HTTPError
from urllib.request import urlopen


@dataclass
class ConversionStep:
    from_ccy: str
    to_ccy: str
    rate: float
    fee_rate: float
    fee_fixed: float
    slippage_bps: float


def load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)


def fetch_live_rates(base: str, symbols: List[str]) -> Dict[str, float]:
    symbols_csv = ",".join(symbols)
    url = f"https://api.exchangerate.host/latest?base={base}&symbols={symbols_csv}"
    with urlopen(url, timeout=8) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    if "rates" not in data:
        raise ValueError("Live rate response missing 'rates'")
    return {k.upper(): float(v) for k, v in data["rates"].items()}


def merge_rates(config_rates: dict, realtime_cfg: dict) -> Tuple[dict, dict]:
    rates = dict(config_rates)
    realtime_used = {"enabled": False, "status": "disabled", "updated": []}
    if not realtime_cfg.get("enabled", False):
        return rates, realtime_used

    try:
        base = realtime_cfg["base"].upper()
        symbols = [s.upper() for s in realtime_cfg["symbols"]]
        live = fetch_live_rates(base, symbols)
        for symbol, value in live.items():
            rates[f"{base}_{symbol}"] = value
        realtime_used = {
            "enabled": True,
            "status": "ok",
            "base": base,
            "symbols": symbols,
            "updated": sorted([f"{base}_{k}" for k in live.keys()]),
            "fetched_at_utc": datetime.now(timezone.utc).isoformat(),
        }
    except (URLError, HTTPError, ValueError, TimeoutError) as e:
        realtime_used = {
            "enabled": True,
            "status": "fallback_to_local",
            "reason": str(e),
        }
    return rates, realtime_used


def build_steps(step_defs: List[dict], rates: dict) -> List[ConversionStep]:
    steps: List[ConversionStep] = []
    for item in step_defs:
        key = item["rate_key"]
        if key not in rates:
            raise KeyError(f"Missing rate key: {key}")
        steps.append(
            ConversionStep(
                from_ccy=item["from"],
                to_ccy=item["to"],
                rate=float(rates[key]),
                fee_rate=float(item.get("fee_rate", 0.0)),
                fee_fixed=float(item.get("fee_fixed", 0.0)),
                slippage_bps=float(item.get("slippage_bps", 0.0)),
            )
        )
    return steps


def run_conversion(amount: float, steps: List[ConversionStep]) -> Tuple[float, List[dict]]:
    trace: List[dict] = []
    current = amount
    for idx, s in enumerate(steps, start=1):
        gross = current * s.rate
        slip = gross * s.slippage_bps / 10000.0
        fee = gross * s.fee_rate + s.fee_fixed
        net = gross - slip - fee
        trace.append(
            {
                "step": idx,
                "pair": f"{s.from_ccy}->{s.to_ccy}",
                "input_amount": round(current, 8),
                "rate": s.rate,
                "gross_output": round(gross, 8),
                "slippage_cost": round(slip, 8),
                "fee_cost": round(fee, 8),
                "net_output": round(net, 8),
            }
        )
        current = net
    return current, trace


def apply_deposit(amount: float, annual_rate: float, days: int, compound: str) -> Tuple[float, dict]:
    if compound == "simple":
        final = amount * (1.0 + annual_rate * days / 365.0)
    elif compound == "daily":
        final = amount * ((1.0 + annual_rate / 365.0) ** days)
    else:
        raise ValueError("compound must be 'simple' or 'daily'")
    return final, {
        "principal_in_deposit_ccy": round(amount, 8),
        "annual_rate": annual_rate,
        "days": days,
        "compound": compound,
        "after_deposit": round(final, 8),
        "deposit_profit": round(final - amount, 8),
    }


def analyze(config: dict, scenario_name: str, principal_cny: float) -> dict:
    rates, realtime_meta = merge_rates(config["rates"], config.get("realtime", {}))
    scenario = config["scenarios"][scenario_name]

    entry_steps = build_steps(scenario["entry_conversion_steps"], rates)
    exit_steps = build_steps(scenario["exit_conversion_steps"], rates)

    entry_amount, entry_trace = run_conversion(principal_cny, entry_steps)
    deposit_cfg = scenario["deposit"]
    after_deposit, deposit_trace = apply_deposit(
        amount=entry_amount,
        annual_rate=float(deposit_cfg["annual_rate"]),
        days=int(deposit_cfg["days"]),
        compound=deposit_cfg.get("compound", "simple"),
    )
    final_cny, exit_trace = run_conversion(after_deposit, exit_steps)

    days = int(deposit_cfg["days"])
    time_cost_rate = float(scenario.get("time_cost_annual_rate", 0.0))
    time_cost_cny = principal_cny * time_cost_rate * days / 365.0
    net_final_cny = final_cny - time_cost_cny
    net_profit = net_final_cny - principal_cny
    period_return = net_profit / principal_cny
    annualized_return = period_return * 365.0 / days if days > 0 else 0.0

    return {
        "run_id": datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ"),
        "run_at_utc": datetime.now(timezone.utc).isoformat(),
        "scenario": scenario_name,
        "principal_cny": principal_cny,
        "realtime": realtime_meta,
        "input_snapshot": {
            "deposit": deposit_cfg,
            "time_cost_annual_rate": time_cost_rate,
            "entry_conversion_steps": scenario["entry_conversion_steps"],
            "exit_conversion_steps": scenario["exit_conversion_steps"],
        },
        "process_trace": {
            "entry_conversion": entry_trace,
            "deposit": deposit_trace,
            "exit_conversion": exit_trace,
        },
        "result": {
            "final_cny_before_time_cost": round(final_cny, 8),
            "time_cost_cny": round(time_cost_cny, 8),
            "final_cny_after_time_cost": round(net_final_cny, 8),
            "net_profit_cny": round(net_profit, 8),
            "period_return": round(period_return, 8),
            "annualized_return": round(annualized_return, 8),
        },
    }


def persist_result(base_dir: Path, result: dict) -> None:
    out_dir = base_dir / "data"
    out_dir.mkdir(parents=True, exist_ok=True)
    latest = out_dir / "latest_result.json"
    history = out_dir / "history.jsonl"
    save_json(latest, result)
    with history.open("a", encoding="utf-8") as f:
        f.write(json.dumps(result, ensure_ascii=False) + "\n")


def main() -> None:
    parser = argparse.ArgumentParser(description="CNY offshore deposit arbitrage analyzer")
    parser.add_argument("--config", default="data/config.json", help="Path to config json")
    parser.add_argument("--scenario", required=True, help="Scenario key in config")
    parser.add_argument("--principal", type=float, required=True, help="Principal in CNY")
    args = parser.parse_args()

    config_path = Path(args.config).resolve()
    config = load_json(config_path)
    result = analyze(config=config, scenario_name=args.scenario, principal_cny=args.principal)
    persist_result(config_path.parent.parent, result)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
