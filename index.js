/**
 * Failure-isolating Loader entry for the wttr.in weather plugin.
 *
 * Keep this file dependency-free: the root Cordis Loader imports only this
 * supervisor. The implementation and all of its package/native dependencies
 * are imported inside apply(), where failures become diagnostics instead of
 * rejecting the Loader entry and taking down the DSH profile.
 */
export const name = 'pn-weather-supervisor'
export const inject = ['tools', 'fs', 'settings']
const SETTINGS_NS = 'local-weather'
const DEFAULT_HISTORY_FILE = 'weather-history.json'
const DEFAULT_MAX_HISTORY = 200

function diagnostic(scope, error) {
  const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  return `[pn-weather] ${scope} unavailable: ${detail}`
}

function report(ctx, scope, error) {
  const message = diagnostic(scope, error)
  const logger = ctx.root?.logger?.('pn-weather')
  if (logger?.error) logger.error('%s', message)
  console.error(message)
}

export async function applyIsolated(ctx, config = {}, importer = () => import('./implementation.js')) {
  try {
    const implementation = await importer()
    implementation.applyWeather(ctx, config, (scope, error) => { report(ctx, scope, error) })
  } catch (error) {
    report(ctx, 'implementation', error)
  }
}

export async function apply(ctx, config = {}) {
  try {
    // `schemastery` is a CommonJS-style module: under ESM interop the usable
    // entry is the `default` export (Schema.object etc.); destructuring
    // `{ Schema }` yields undefined and every schema build fails.
    const { default: Schema } = await import('schemastery')
    const base = {
      historyFile: config.historyFile ?? DEFAULT_HISTORY_FILE,
      maxHistory: config.maxHistory ?? DEFAULT_MAX_HISTORY,
    }
    const scope = ctx.settings.register(SETTINGS_NS, Schema.object({
      historyFile: Schema.string().default(base.historyFile),
      maxHistory: Schema.number().min(1).max(5000).default(base.maxHistory),
    }), { base })
    await applyIsolated(ctx, {
      ...config,
      historyFile: scope.get().historyFile,
      maxHistory: scope.get().maxHistory,
    })
    return undefined
  } catch (error) {
    report(ctx, 'settings', error)
    await applyIsolated(ctx, config)
    return undefined
  }
}
