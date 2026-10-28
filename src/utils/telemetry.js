// Set only when the production image is built. Without it (local development,
// tests and CI builds) the SDK is never loaded and nothing is sent.
const connectionString = import.meta.env.VITE_APPINSIGHTS_CONNECTION_STRING

let appInsights
const pendingTelemetry = []

function sendTelemetry(operation) {
  if (!connectionString) return

  if (appInsights) {
    operation(appInsights)
  } else {
    pendingTelemetry.push(operation)
  }
}

export async function initTelemetry() {
  if (!connectionString) return

  // Loaded on demand, so the SDK stays out of the main bundle.
  const { ApplicationInsights } =
    await import('@microsoft/applicationinsights-web')

  appInsights = new ApplicationInsights({
    config: {
      connectionString,
      // Without cookies, visitors don't need to consent to tracking (LGPD).
      disableCookiesUsage: true,
    },
  })
  appInsights.loadAppInsights()

  for (const operation of pendingTelemetry.splice(0)) {
    operation(appInsights)
  }
}

export function trackPageView(pageView) {
  sendTelemetry((sdk) => sdk.trackPageView(pageView))
}

export function trackEvent(name, properties) {
  sendTelemetry((sdk) => sdk.trackEvent({ name, properties }))
}
