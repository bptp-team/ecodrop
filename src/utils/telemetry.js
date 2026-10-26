// Set only when the production image is built. Without it (local development,
// tests and CI builds) the SDK is never loaded and nothing is sent.
const connectionString = import.meta.env.VITE_APPINSIGHTS_CONNECTION_STRING

let appInsights

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
  appInsights.trackPageView()
}

// Events sent before the SDK finishes loading are dropped.
export function trackEvent(name, properties) {
  appInsights?.trackEvent({ name, properties })
}
