import { test as base } from '@playwright/test'

export { expect } from '@playwright/test'
export const test = base.extend({
  page: async ({ page }, fixtureUse) => {
    await page.route('https://dc.services.visualstudio.com/**', (route) =>
      route.fulfill({ status: 200, body: '{}' }),
    )
    await fixtureUse(page)
  },
})
