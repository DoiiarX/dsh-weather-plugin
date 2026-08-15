# dsh-weather-plugin

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
