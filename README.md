# dsh-weather-plugin

> [English](README.md) | [中文](README.zh.md)

> 本插件属于 [dsh-plugins](https://github.com/DoiiarX/dsh-plugins) 合集，完整的自研插件索引见该仓库。

Persistent DeepSeek Harness bundle wrapping the wttr.in weather API.

## What it provides

- **`weather_query`** tool — query one or more locations in parallel (e.g.
  `["chengdu"]` or `["chengdu","shanghai"]`), optional `lang` (zh/en).
- **`weather_history`** tool — list previously queried locations aggregated by
  location (query count, last query time, last weather summary).

## Design notes

- Network capability is consumed **optionally** from the proxy plugin:
  `ctx.get('proxyFetch')`; when the proxy plugin is absent, falls back to
  native `fetch`. Absence of the proxy never breaks this plugin.
- Query history persists to `weather-history.json` through the `fs` service
  (in the session workspace by default; override with `config.historyFile`).

## Installation

复制下面的指令块给你的 DSH agent，它会自动完成安装：

```text
请安装 weather 插件（@doiiarx/dsh-weather-plugin）：

1. 前置：本机已有 deepseek-harness 源码（本插件 link 依赖其中的 dsh-tools 包，
   位于 <deepseek-harness>/packages/core/tools）。
2. 克隆仓库：
   git clone https://github.com/DoiiarX/dsh-weather-plugin
   cd dsh-weather-plugin
3. 安装依赖：pnpm install
   （如果 package.json 里 dsh-tools 的 link 路径与你机器不符，改成你的
   deepseek-harness 实际路径后再装。）
4. 挂进 web profile：编辑 $HOME/.dsh/profiles/web/package.json，
   在 dependencies 加 "@doiiarx/dsh-weather-plugin": "link:<本插件目录绝对路径>"，
   在 dsh.profile.bundles 加 "@doiiarx/dsh-weather-plugin"。
5. 在 profile 目录执行 pnpm install。
6. 暴露设置页：在 <deepseek-harness>/packages/host/apiproxy/src/api-proxy.ts
   的 WEB_SETTINGS_NAMESPACES 数组加 "local-weather"。
7. 重 build host（pnpm run build:lib:host）并重启 web 进程。
8. 验证：工具列表出现 weather_query / weather_history，设置页出现 Weather 小节。
```

weather 可选消费 proxy 插件的 `proxyFetch`（无 proxy 时回退原生 fetch），
不强制安装 proxy 插件。
