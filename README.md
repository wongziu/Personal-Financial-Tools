# 人民币换汇存款套利分析工具

## 功能
- 支持多次换汇折损测算（手续费、滑点、汇率差）
- 支持实时汇率拉取（失败自动回退本地 JSON 汇率）
- 支持存款年化收益测算（单利/按日复利）
- 支持时间成本（资金占用机会成本）扣减
- 过程数据自动存储（每次运行都落盘）

## 运行方式
```bash
python3 src/arbitrage_tool.py --scenario usd_hkd_deposit --principal 100000
```

## 配置说明
所有参数都在：
- `data/config.json`

关键字段：
- `realtime`: 是否启用实时汇率与抓取参数
- `rates`: 本地汇率（支持人工覆盖）
- `scenarios`: 套利场景定义
  - `entry_conversion_steps`: 转出路径（可多步）
  - `deposit`: 存款参数（币种、年化、天数、计息方式）
  - `exit_conversion_steps`: 换回 CNY 路径（可多步）
  - `time_cost_annual_rate`: 年化时间成本

## 输出文件
- `data/latest_result.json`: 最近一次完整结果
- `data/history.jsonl`: 历史过程日志（每行一次运行）
