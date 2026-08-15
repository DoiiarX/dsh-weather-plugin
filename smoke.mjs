/**
 * Smoke test: load the weather implementation with a mock ctx and verify tool
 * registration works.
 */
import { applyWeather } from './implementation.js'

const registered = []
const tools = {
  register(tool) {
    registered.push(tool.name)
    return () => {}
  },
}
const mockCtx = {
  tools,
  get(name) {
    if (name === 'tools') return tools
    if (name === 'fs') return undefined
    return undefined
  },
}

const result = applyWeather(mockCtx, {}, (scope, err) => {
  console.error(`[report] ${scope}: ${err.message}`)
})
console.log('registered:', result.registered)
console.log('failed:', result.failed)
if (result.registered.length !== 2 || result.failed.length !== 0) {
  console.error('SMOKE FAIL')
  process.exit(1)
}
console.log('SMOKE OK')
