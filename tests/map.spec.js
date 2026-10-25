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
        page.getByRole('link', { name: /Prefeitura de Caçapava/ }),
      ).toHaveAttribute(
        'href',
        'https://cacapava.sp.gov.br/coleta-certa-pev-reabre-no-dia-19-de-maio-em-cacapava',
      )
      const popup = page.locator('.leaflet-popup')
      const sourceLink = popup.getByRole('link', {
        name: /Prefeitura de Caçapava/,
      })
      await expect(sourceLink).toHaveAttribute('target', '_blank')
      await expect(sourceLink).toHaveAttribute('rel', 'noreferrer')
      await expect(
        popup.getByRole('link', { name: /OpenStreetMap/ }),
      ).toHaveCount(0)
      await expect(
        page.getByText('Segunda a sexta, das 8h às 15h'),
      ).toBeVisible()
      await expect(page.getByText('Pilhas e baterias')).toBeVisible()
      await expect(page.getByText('Eletrônicos')).toBeVisible()
      await expect(page.getByText('Óleo de cozinha usado')).toBeVisible()
      const hiddenNotice = sourceLink.locator('.visually-hidden')
      await expect(hiddenNotice).toHaveText(' (abre em nova aba)')
      await expect(hiddenNotice).toHaveCSS('position', 'absolute')
      await expect(hiddenNotice).toHaveCSS('width', '1px')
      await expect(hiddenNotice).toHaveCSS('height', '1px')
      await expect(hiddenNotice).toHaveCSS('overflow', 'hidden')
      await expect(hiddenNotice).toHaveCSS('clip-path', 'inset(50%)')
      await expect(hiddenNotice).toHaveCSS('white-space', 'nowrap')
      await expect(sourceLink).toHaveAccessibleName(
        /Prefeitura de Caçapava \(abre em nova aba\)/,
      )
    })
  })
}

for (const { name, width } of viewports.filter(({ width }) =>
  [375, 1440].includes(width),
)) {
  test(`${name} popup keeps the Carrefour details inside the viewport`, async ({
    page,
  }) => {
    test.setTimeout(30_000)
    await page.setViewportSize({ width, height: 900 })
    await page.route('https://tile.openstreetmap.org/**', (route) =>
      route.abort(),
    )
    await page.goto('/')

    const marker = page.getByRole('button', {
      name: 'Carrefour Bairro Caçapava',
    })
    await marker.focus()
    await marker.press('Enter')

    const popup = page.locator('.leaflet-popup')
    await expect(popup).toBeVisible()
    await expect(
      popup.getByRole('heading', { name: 'Carrefour Bairro Caçapava' }),
    ).toBeVisible()
    await expect(
      popup.getByText('Avenida Brasil, 401, Centro, Caçapava'),
    ).toBeVisible()
    await expect(popup.getByText('Pilhas', { exact: true })).toBeVisible()
    await expect(
      popup.getByText('Verificação presencial (outubro de 2026)'),
    ).toBeVisible()

    const osmLink = popup.getByRole('link', {
      name: /Ver no OpenStreetMap/,
    })
    await expect(osmLink).toHaveAttribute(
      'href',
      'https://www.openstreetmap.org/way/558135447',
    )
    await expect(osmLink).toHaveAttribute('target', '_blank')
    await expect(osmLink).toHaveAttribute('rel', 'noreferrer')

    const readBounds = () =>
      popup.evaluate((element) => {
        const {
          left,
          right,
          width: popupWidth,
        } = element.getBoundingClientRect()

        return {
          left,
          right,
          popupWidth,
          viewportWidth: window.innerWidth,
          documentWidth: document.documentElement.scrollWidth,
        }
      })
    const fitsViewport = async () => {
      const bounds = await readBounds()

      return (
        bounds.left >= 0 &&
        bounds.right <= bounds.viewportWidth &&
        bounds.documentWidth <= bounds.viewportWidth
      )
    }
    await expect.poll(fitsViewport, { timeout: 5_000 }).toBe(true)

    const bounds = await readBounds()
    expect(bounds.left).toBeGreaterThanOrEqual(0)
    expect(bounds.right).toBeLessThanOrEqual(bounds.viewportWidth)
    expect(bounds.documentWidth).toBeLessThanOrEqual(bounds.viewportWidth)

    const sourceLink = popup.locator('.point-popup-source a')
    await expect(sourceLink).toHaveAttribute(
      'href',
      'https://www.openstreetmap.org/way/558135447',
    )
    await expect(sourceLink).toHaveAttribute('target', '_blank')
    await expect(sourceLink).toHaveAttribute('rel', 'noreferrer')
    await expect(sourceLink).toHaveAccessibleName(
      /OpenStreetMap \(abre em nova aba\)/,
    )
  })
}

test('searches by name or synonym and keeps the query in browser history', async ({
  page,
}) => {
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.abort(),
  )
  await page.goto('/')

  const search = page.getByRole('searchbox', {
    name: 'O que você quer descartar?',
  })
  await search.fill('PILHAS')
  await search.press('Enter')

  await expect(page).toHaveURL(/\/\?busca=PILHAS$/)
  await expect(
    page.getByRole('heading', { name: 'Resultado para “PILHAS”' }),
  ).toBeVisible()
  await expect(
    page.getByText('Tipo de resíduo: Pilhas e baterias'),
  ).toBeVisible()

  await search.fill('smartphone')
  await page.getByRole('button', { name: 'Buscar' }).click()
  await expect(page).toHaveURL(/\/\?busca=smartphone$/)
  await expect(page.getByRole('button', { name: 'Buscar' })).toBeFocused()
  await expect(
    page.getByRole('heading', { name: 'Resultado para “smartphone”' }),
  ).toBeVisible()
  await expect(page.getByText('Tipo de resíduo: Eletrônicos')).toBeVisible()

  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Resultado para “smartphone”' }),
  ).toBeVisible()
  await expect(search).toHaveValue('smartphone')

  await page.goBack()
  await expect(page).toHaveURL(/\/\?busca=PILHAS$/)
  await expect(search).toHaveValue('PILHAS')
  await expect(
    page.getByRole('heading', { name: 'Resultado para “PILHAS”' }),
  ).toBeVisible()
})

test('keeps an unmatched query visible and allows clearing it', async ({
  page,
}) => {
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.abort(),
  )
  await page.goto('/?busca=pilah')

  await expect(
    page.getByRole('heading', { name: 'Não encontramos “pilah”.' }),
  ).toBeVisible()
  await expect(
    page.getByText('Confira a grafia ou tente outro nome.'),
  ).toBeVisible()
  await expect(
    page.getByRole('searchbox', { name: 'O que você quer descartar?' }),
  ).toHaveValue('pilah')
  await expect(
    page.getByText('Tipo de resíduo:', { exact: false }),
  ).toHaveCount(0)

  await page.getByRole('button', { name: 'Limpar busca' }).click()
  await expect(page).toHaveURL('/')
  await expect(
    page.getByText(
      'Digite o nome de um item para descobrir seu tipo de resíduo.',
    ),
  ).toBeVisible()
})

test('places the search panel left of the map on desktop and above it on mobile', async ({
  page,
}) => {
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.abort(),
  )

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  const sidebar = page.locator('.search-sidebar')
  const map = page.locator('.leaflet-container')
  const desktopSidebar = await sidebar.boundingBox()
  const desktopMap = await map.boundingBox()
  expect(desktopSidebar).not.toBeNull()
  expect(desktopMap).not.toBeNull()
  expect(desktopSidebar.width).toBe(340)
  expect(desktopSidebar.x + desktopSidebar.width).toBeLessThanOrEqual(
    desktopMap.x,
  )
  const desktopSearchInput = await page.getByRole('searchbox').boundingBox()
  const desktopSearchButton = await page
    .getByRole('button', { name: 'Buscar' })
    .boundingBox()
  expect(desktopSearchInput.x - desktopSidebar.x).toBe(24)
  expect(
    desktopSidebar.x +
      desktopSidebar.width -
      desktopSearchButton.x -
      desktopSearchButton.width,
  ).toBe(24)

  await page.setViewportSize({ width: 1024, height: 900 })
  await page.reload()
  const breakpointSidebar = await sidebar.boundingBox()
  const breakpointMap = await map.boundingBox()
  expect(breakpointSidebar.width).toBe(340)
  expect(breakpointSidebar.x + breakpointSidebar.width).toBeLessThanOrEqual(
    breakpointMap.x,
  )

  await page.setViewportSize({ width: 375, height: 900 })
  await page.reload()
  const mobileSidebar = await sidebar.boundingBox()
  const mobileMap = await map.boundingBox()
  expect(mobileSidebar).not.toBeNull()
  expect(mobileMap).not.toBeNull()
  expect(mobileSidebar.y + mobileSidebar.height).toBeLessThanOrEqual(
    mobileMap.y,
  )
})
