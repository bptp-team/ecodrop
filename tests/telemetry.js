import { expect } from './fixtures.js'

export async function interceptTelemetry(page) {
  const events = []
  let ingestionRequests = 0

  await page.route('https://dc.services.visualstudio.com/**', async (route) => {
    ingestionRequests += 1
    const body = route.request().postData()

    if (body) {
      const envelopes = JSON.parse(body)
      for (const envelope of Array.isArray(envelopes)
        ? envelopes
        : [envelopes]) {
        if (envelope.data?.baseType === 'EventData') {
          events.push(envelope.data.baseData)
        }
      }
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{}',
    })
  })

  return {
    events,
    waitForIngestion: () =>
      expect.poll(() => ingestionRequests).toBeGreaterThan(0),
    waitForEvent: (name, count = 1) =>
      expect
        .poll(() => events.filter((event) => event.name === name), {
          timeout: 20_000,
        })
        .toHaveLength(count),
  }
}
