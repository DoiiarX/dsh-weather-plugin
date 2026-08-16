/**
 * wttr.in weather plugin (persistent bundle, host composition row).
 *
 * Registers weather_query / weather_history tools. Network capability is
 * consumed OPTIONALLY from the proxy plugin via ctx.get('proxyFetch'): when the
 * proxy plugin is absent, the weather plugin falls back to native fetch —
 * absence of a provider never breaks this plugin.
 *
 * Query history persists to a JSON file through the `fs` service.
 */
import { defineTool } from '@deepseek-ai/dsh-tools'

const MAX_HISTORY = 200
const HISTORY_FILE = 'weather-history.json'

function positiveNumber(name, value, fallback, maximum = Number.POSITIVE_INFINITY) {
  const resolved = value ?? fallback
  if (!Number.isFinite(resolved) || resolved <= 0) {
    throw new Error(`invalid ${name}: expected a positive number, got ${JSON.stringify(resolved)}`)
  }
  return Math.min(resolved, maximum)
}

/** Safe URL-encode a path segment. */
function enc(s) {
  const str = String(s)
  if (typeof encodeURIComponent === 'function') return encodeURIComponent(str)
  let out = ''
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i)
    if ((c >= 0x30 && c <= 0x39) || (c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a)) out += str[i]
    else out += '%' + c.toString(16).toUpperCase()
  }
  return out
}

const objectOutput = {
  schema: { type: 'object', additionalProperties: true },
  render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
}

export function applyWeather(ctx, config = {}, report = () => {}) {
  const fsSvc = ctx.get('fs')
  const historyFile = config.historyFile ?? HISTORY_FILE
  const maxHistory = positiveNumber('maxHistory', config.maxHistory, MAX_HISTORY, 5000)
  let history = {}

  async function loadHistory() {
    if (fsSvc === undefined) return
    try {
      const target = await fsSvc.resolve(historyFile)
      const info = await fsSvc.stat(target)
      if (info === undefined) return
      const text = await fsSvc.readText(target)
      const parsed = JSON.parse(text)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) history = parsed
    } catch (error) {
      console.error('[dsh-weather] load history failed', error instanceof Error ? error.message : String(error))
    }
  }

  async function saveHistory() {
    if (fsSvc === undefined) return
    try {
      const target = await fsSvc.resolve(historyFile)
      await fsSvc.writeText(target, JSON.stringify(history, null, 2))
    } catch (error) {
      console.error('[dsh-weather] save history failed', error instanceof Error ? error.message : String(error))
    }
  }

  function record(location, summary) {
    const key = String(location).toLowerCase()
    const prev = history[key] || { count: 0, lastAt: 0 }
    history[key] = { count: prev.count + 1, lastAt: Date.now(), lastSummary: summary }
    const keys = Object.keys(history)
    if (keys.length > maxHistory) {
      keys.sort((a, b) => (history[b].lastAt || 0) - (history[a].lastAt || 0))
      for (const k of keys.slice(maxHistory)) delete history[k]
    }
    saveHistory().catch(() => {})
  }

  /** Fetch text: proxyFetch service (if present) -> native fetch. */
  async function fetchText(url, timeoutMs) {
    const proxy = ctx.get('proxyFetch')
    if (proxy !== undefined) {
      const r = await proxy.fetch(url, { timeoutMs })
      return r.text
    }
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(url, { signal: controller.signal })
      if (response.status < 200 || response.status >= 300) {
        throw new Error(`HTTP ${response.status}`)
      }
      return await response.text()
    } finally {
      clearTimeout(timer)
    }
  }

  function parseWeather(location, json) {
    const cur = json.current_condition && json.current_condition[0]
    const today = json.weather && json.weather[0]
    const area = json.nearest_area && json.nearest_area[0]
    const name = area && area.areaName && area.areaName[0] ? area.areaName[0].value : location
    const region = area && area.region && area.region[0] ? area.region[0].value : ''
    const country = area && area.country && area.country[0] ? area.country[0].value : ''
    const hourly = today && today.hourly ? today.hourly.map((h) => ({
      time: h.time,
      tempC: h.tempC,
      chanceOfRain: h.chanceofrain,
      desc: h.weatherDesc && h.weatherDesc[0] ? h.weatherDesc[0].value : '',
    })) : []
    return {
      location,
      name,
      region,
      country,
      current: cur ? {
        tempC: cur.temp_C,
        feelsLikeC: cur.FeelsLikeC,
        humidity: cur.humidity,
        windKmph: cur.windspeedKmph,
        windDir: cur.winddir16Point,
        pressure: cur.pressure,
        cloudcover: cur.cloudcover,
        desc: cur.weatherDesc && cur.weatherDesc[0] ? cur.weatherDesc[0].value : '',
      } : null,
      today: today ? {
        maxTempC: today.maxtempC,
        minTempC: today.mintempC,
        avgTempC: today.avgtempC,
        hourly,
      } : null,
    }
  }

  async function queryOne(location, lang, timeoutMs) {
    const url = `https://wttr.in/${enc(location)}?format=j1` + (lang ? `&lang=${enc(lang)}` : '')
    const text = await fetchText(url, timeoutMs)
    return parseWeather(location, JSON.parse(text))
  }

  const registered = []
  const failed = []

  try {
    ctx.tools.register(defineTool({
      name: 'weather_query',
      description: '查询一个或多个地区的实时天气（数据源 wttr.in；若存在 proxyFetch 代理能力则自动走代理，否则直连）。',
      parameters: {
        locations: {
          type: 'array', items: { type: 'string' }, required: true,
          description: '要查询的地区列表，例如 ["chengdu"] 或 ["chengdu","shanghai"]',
        },
        lang: { type: 'string', description: '天气描述语言，如 zh 或 en；缺省 en' },
      },
      output: objectOutput,
      async execute(args) {
        const locations = Array.isArray(args && args.locations) ? args.locations.map(String) : []
        if (locations.length === 0) throw new Error('locations 至少需要一个地区')
        const lang = args && args.lang ? String(args.lang) : undefined
        const timeoutMs = positiveNumber('timeoutMs', 30000, 30000, 120000)
        const results = await Promise.all(locations.map(async (loc) => {
          try {
            const w = await queryOne(loc, lang, timeoutMs)
            const summary = w.current ? `${w.current.tempC}°C ${w.current.desc}`.trim() : ''
            record(loc, summary)
            return w
          } catch (error) {
            return { location: loc, error: error instanceof Error ? error.message : String(error) }
          }
        }))
        return { ok: true, count: results.length, results }
      },
    }))
    registered.push('weather_query')
  } catch (error) {
    failed.push('weather_query')
    report('weather_query', error)
  }

  try {
    ctx.tools.register(defineTool({
      name: 'weather_history',
      description: '查看历史查询过的地区（按地区聚合：查询次数、最近查询时间与最近天气摘要）。',
      parameters: {},
      output: objectOutput,
      async execute() {
        const entries = Object.keys(history)
          .map((k) => ({ location: k, ...history[k] }))
          .sort((a, b) => (b.lastAt || 0) - (a.lastAt || 0))
        return { ok: true, count: entries.length, entries }
      },
    }))
    registered.push('weather_history')
  } catch (error) {
    failed.push('weather_history')
    report('weather_history', error)
  }

  loadHistory().catch(() => {})

  return { registered, failed }
}
