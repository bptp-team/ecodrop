import { afterEach, describe, expect, it, vi } from 'vitest'

const sdk = vi.hoisted(() => ({
  config: undefined,
  loadAppInsights: vi.fn(),
  trackEvent: vi.fn(),
  trackPageView: vi.fn(),
}))

vi.mock('@microsoft/applicationinsights-web', () => ({
  ApplicationInsights: class {
    constructor({ config }) {
      sdk.config = config
      this.loadAppInsights = sdk.loadAppInsights
      this.trackEvent = sdk.trackEvent
      this.trackPageView = sdk.trackPageView
    }
  },
}))

async function loadTelemetry(connectionString) {
  vi.resetModules()
  vi.stubEnv('VITE_APPINSIGHTS_CONNECTION_STRING', connectionString)
  return import('./telemetry.js')
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
  sdk.config = undefined
})

describe('telemetry', () => {
  it('loads nothing and sends nothing without a connection string', async () => {
    const telemetry = await loadTelemetry('')

    await telemetry.initTelemetry()
    telemetry.trackEvent('Search', { term: 'pilha' })

    expect(sdk.loadAppInsights).not.toHaveBeenCalled()
    expect(sdk.trackEvent).not.toHaveBeenCalled()
  })

  it('starts the SDK without cookies', async () => {
    const telemetry = await loadTelemetry('InstrumentationKey=test')

    await telemetry.initTelemetry()

    expect(sdk.config).toEqual({
      connectionString: 'InstrumentationKey=test',
      disableCookiesUsage: true,
    })
    expect(sdk.loadAppInsights).toHaveBeenCalledOnce()
    expect(sdk.trackPageView).not.toHaveBeenCalled()
  })

  it('queues page views and events until the SDK is ready', async () => {
    const telemetry = await loadTelemetry('InstrumentationKey=test')
    const initialization = telemetry.initTelemetry()

    telemetry.trackPageView({ name: '/aprenda', uri: '/aprenda' })
    telemetry.trackEvent('Search', { term: 'pilha' })
    await initialization

    expect(sdk.trackPageView).toHaveBeenCalledWith({
      name: '/aprenda',
      uri: '/aprenda',
    })
    expect(sdk.trackEvent).toHaveBeenCalledWith({
      name: 'Search',
      properties: { term: 'pilha' },
    })
  })

  it('forwards custom events once the SDK is loaded', async () => {
    const telemetry = await loadTelemetry('InstrumentationKey=test')

    await telemetry.initTelemetry()
    telemetry.trackEvent('Search', { term: 'pilha', results: 1, points: 2 })

    expect(sdk.trackEvent).toHaveBeenCalledWith({
      name: 'Search',
      properties: { term: 'pilha', results: 1, points: 2 },
    })
  })
})
