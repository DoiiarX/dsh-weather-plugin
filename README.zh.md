# dsh-weather-plugin

> [English](README.md) | 中文

> 本插件属于 [dsh-plugins](https://github.com/DoiiarX/dsh-plugins) 合集，完整的自研插件索引见该仓库。

封装 wttr.in 天气 API 的持久化 DeepSeek Harness 插件包。

## 提供的功能

- **`weather_query`** 工具 — 并行查询一个或多个地区（例如
  `["chengdu"]` 或 `["chengdu","shanghai"]`），可选 `lang`（zh/en）。
- **`weather_history`** 工具 — 按地区列出历史查询记录
  （查询次数、最近查询时间、最近天气摘要）。

## 设计说明

- 网络能力**可选地**从代理插件消费：
  `ctx.get('proxyFetch')`；当代理插件不存在时，回退到
  原生 `fetch`。代理的缺失绝不会破坏本插件。
- 查询历史通过 `fs` 服务持久化到 `weather-history.json`
  （默认位于会话工作区；可用 `config.historyFile` 覆盖）。
