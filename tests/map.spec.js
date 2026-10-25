import { expect, test } from '@playwright/test'

const viewports = [
  { name: 'mobile', width: 375 },
  { name: 'tablet', width: 768 },
  { name: 'desktop', width: 1440 },
]

for (const { name, width } of viewports) {
  test.describe(`${name} viewport (${width}px)`, () => {
    test.use({ viewport: { width, height: 900 } })

    test('shows the map, its attribution, and all four point markers', async ({
      page,
    }) => {
      await page.route('https://tile.openstreetmap.org/**', (route) =>
        route.abort(),
      )
      await page.goto('/')

      await expect(page.getByRole('heading', { name: 'EcoDrop' })).toBeVisible()
      await expect(page.locator('.app-logo')).toBeVisible()
      await expect(page.locator('.app-header')).toHaveCSS(
        'background-color',
        'rgb(23, 75, 50)',
      )

      const map = page.locator('.leaflet-container')
      await expect(map).toBeVisible()
      await expect(map).toHaveCSS('min-height', '420px')
      await expect(map.locator('img.leaflet-marker-icon')).toHaveCount(4)
      await expect(map.locator('.leaflet-control-attribution')).toContainText(
        '© OpenStreetMap contributors',
      )
    })

    test('shows the existing point details when a marker is opened', async ({
      page,
    }) => {
      await page.route('https://tile.openstreetmap.org/**', (route) =>
        route.abort(),
      )
      await page.goto('/')
      const marker = page.getByRole('button', { name: 'PEV Vila Santos' })
      await marker.focus()
      await marker.press('Enter')

      await expect(page.locator('.leaflet-popup')).toBeVisible()
      await expect(page.getByText('PEV Vila Santos')).toBeVisible()
      await expect(
        page.getByText(
          'Rua Regente Feijó, 18 (pátio da Secretaria de Obras), Caçapava',
        ),
      ).toBeVisible()
      await expect(page.getByText('Materiais recicláveis')).toBeVisible()
      await expect(
        page.getByRole('link', { name: 'Prefeitura de Caçapava' }),
      ).toHaveAttribute(
        'href',
        'https://cacapava.sp.gov.br/coleta-certa-pev-reabre-no-dia-19-de-maio-em-cacapava',
      )
    })
  })
}
