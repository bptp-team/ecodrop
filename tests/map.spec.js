import { expect, test } from './fixtures.js'
import { interceptTelemetry } from './telemetry.js'
import collectionPoints from '../src/data/collectionPoints.json' with { type: 'json' }
import searchableItems from '../src/data/searchableItems.json' with { type: 'json' }
import wasteTypeDetails from '../src/data/wasteTypeDetails.json' with { type: 'json' }

const collectionPointCount = collectionPoints.length

const viewports = [
  { name: 'mobile', width: 375 },
  { name: 'tablet', width: 768 },
  { name: 'desktop', width: 1440 },
]

const learnPageTypes = [
  ...new Set(searchableItems.map(({ wasteType }) => wasteType)),
]

async function expectSecureBlankLinks(page) {
  const links = page.locator('a[target="_blank"]')
  const count = await links.count()
  const insecureHrefs = await links.evaluateAll((anchors) =>
    anchors
      .filter(
        (anchor) =>
          !anchor.relList.contains('noopener') ||
          !anchor.relList.contains('noreferrer'),
      )
      .map((anchor) => anchor.href),
  )

  expect(insecureHrefs).toEqual([])
  return count
}

test('secures every link that opens in a new tab', async ({ page }) => {
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.abort(),
  )
  await page.goto('/')
  let checkedLinks = await expectSecureBlankLinks(page)

  await page.goto('/aprenda')
  checkedLinks += await expectSecureBlankLinks(page)

  for (const { id } of Object.values(wasteTypeDetails)) {
    await page.goto(`/aprenda/${id}`)
    checkedLinks += await expectSecureBlankLinks(page)
  }

  await page.goto('/')
  for (const point of collectionPoints) {
    const marker = page.getByRole('button', { name: point.name })
    await marker.focus()
    await marker.press('Enter')
    await expect(
      page.locator('.leaflet-popup h2', { hasText: point.name }),
    ).toBeVisible()
    checkedLinks += await expectSecureBlankLinks(page)
  }

  expect(checkedLinks).toBeGreaterThan(0)
})

for (const wasteType of learnPageTypes) {
  test(`opens the learning page for ${wasteType}`, async ({ page }) => {
    await page.goto(`/aprenda/${encodeURIComponent(wasteType)}`)

    await expect(
      page.getByRole('heading', { name: wasteType, level: 1 }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', {
        name: 'Por que descartar corretamente',
      }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Como descartar' }),
    ).toBeVisible()
    await expect(
      page.getByText(wasteTypeDetails[wasteType].disposalGuide[0]),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Fontes oficiais' }),
    ).toBeVisible()
    const breadcrumbLink = page
      .getByRole('navigation', { name: 'Trilha de navegação' })
      .getByRole('link', { name: 'Aprenda' })
    await breadcrumbLink.hover()
    await expect(breadcrumbLink).toHaveCSS('text-decoration-line', 'underline')

    const sourceLink = page.getByRole('link', {
      name: wasteTypeDetails[wasteType].sources[0].label,
    })
    await expect(sourceLink).toHaveAttribute(
      'href',
      wasteTypeDetails[wasteType].sources[0].url,
    )
    await sourceLink.hover()
    await expect(sourceLink).toHaveCSS('text-decoration-line', 'underline')
  })
}

for (const { name, width } of viewports.filter(
  ({ width }) => width === 375 || width === 1440,
)) {
  test(`${name} learning content scrolls independently from the header`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 500 })
    await page.goto('/aprenda/pilhas-e-baterias')

    const header = page.locator('.app-header')
    const content = page.locator('.app-content--learn')

    expect(
      await content.evaluate((element) => element.scrollHeight),
    ).toBeGreaterThan(await content.evaluate((element) => element.clientHeight))

    await expect(page.locator('html')).toHaveCSS('overflow', 'hidden')
    const contentBounds = await content.boundingBox()
    await page.mouse.move(
      contentBounds.x + contentBounds.width / 2,
      contentBounds.y + contentBounds.height / 2,
    )
    await page.mouse.wheel(0, 500)

    await expect
      .poll(() =>
        header.evaluate((element) => element.getBoundingClientRect().top),
      )
      .toBe(0)
    await expect
      .poll(() => content.evaluate((element) => element.scrollTop))
      .toBeGreaterThan(0)
    expect(await page.evaluate(() => window.scrollY)).toBe(0)
  })
}

for (const { name, width } of viewports) {
  test.describe(`${name} viewport (${width}px)`, () => {
    test.use({ viewport: { width, height: 900 } })

    test('shows the map, its attribution, and all point markers', async ({
      page,
    }) => {
      await page.route('https://tile.openstreetmap.org/**', (route) =>
        route.abort(),
      )
      await page.goto('/')

      await expect(page.getByRole('heading', { name: 'EcoDrop' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Mapa' })).toHaveAttribute(
        'aria-current',
        'page',
      )
      await expect(
        page.getByRole('link', { name: 'Aprenda' }),
      ).not.toHaveAttribute('aria-current', 'page')
      await expect(page.locator('.app-logo')).toBeVisible()
      await expect(page.locator('.app-header')).toHaveCSS(
        'background-color',
        'rgb(23, 75, 50)',
      )

      const map = page.locator('.leaflet-container')
      await expect(map).toBeVisible()
      const mapBounds = await map.boundingBox()
      expect(mapBounds.height).toBeGreaterThan(0)
      expect(mapBounds.y + mapBounds.height).toBeLessThanOrEqual(900)
      expect(
        await page.evaluate(() => document.documentElement.scrollHeight),
      ).toBeLessThanOrEqual(900)
      await expect(map.locator('.collection-point-marker')).toHaveCount(
        collectionPointCount,
      )
      const markerColors = await map
        .locator('.collection-point-marker')
        .first()
        .evaluate((marker) => {
          const colorProbe = document.createElement('span')
          colorProbe.style.color = 'var(--color-primary)'
          document.body.append(colorProbe)
          const primaryColor = getComputedStyle(colorProbe).color
          colorProbe.remove()
          return {
            markerColor: getComputedStyle(marker).backgroundColor,
            primaryColor,
          }
        })
      expect(markerColors.markerColor).toBe(markerColors.primaryColor)
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
      await expect(sourceLink).toHaveAttribute('rel', 'noopener noreferrer')
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

for (const { name, width } of viewports.filter(({ width }) => width < 1024)) {
  test(`${name} search panel stays compact until results and can be closed and reopened`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')

    const main = page.locator('.app-main')
    const sidebar = page.locator('.search-sidebar')
    const mainBounds = await main.boundingBox()
    const sidebarBounds = await sidebar.boundingBox()

    expect(sidebarBounds).not.toBeNull()
    expect(sidebarBounds.x).toBe(mainBounds.x)
    expect(sidebarBounds.y).toBe(mainBounds.y)
    expect(sidebarBounds.width).toBe(mainBounds.width)
    expect(sidebarBounds.height).toBeLessThan(mainBounds.height)
    await expect(
      page.getByText(
        'Digite o nome de um item para descobrir onde e como descartá-lo',
      ),
    ).toBeVisible()
    const promptBounds = await page
      .getByText(
        'Digite o nome de um item para descobrir onde e como descartá-lo',
      )
      .boundingBox()
    expect(sidebarBounds.y + sidebarBounds.height).toBeGreaterThanOrEqual(
      promptBounds.y + promptBounds.height,
    )
    expect(
      await page.evaluate(() => document.documentElement.scrollHeight),
    ).toBeLessThanOrEqual(900)
    const zoomControl = page.locator('.leaflet-control-zoom-in')
    const zoomBounds = await zoomControl.boundingBox()
    const isZoomControlCovered = await page.evaluate(
      ({ x, y }) => {
        const topElement = document.elementFromPoint(x, y)
        return document.querySelector('.search-sidebar').contains(topElement)
      },
      {
        x: zoomBounds.x + zoomBounds.width / 2,
        y: zoomBounds.y + zoomBounds.height / 2,
      },
    )
    expect(isZoomControlCovered).toBe(true)

    const search = page.getByRole('searchbox', {
      name: 'O que você quer descartar?',
    })
    await search.fill('medicamento')
    await page.getByRole('button', { name: 'Buscar' }).click()
    await expect(page.locator('.leaflet-marker-icon')).toHaveCount(2)
    const resultsSidebarBounds = await sidebar.boundingBox()
    expect(resultsSidebarBounds.height).toBe(mainBounds.height)

    const closeSearch = page.getByRole('button', { name: 'Fechar busca' })
    const clearSearch = page.getByRole('button', { name: 'Limpar busca' })
    await expect(closeSearch).toBeVisible()
    await expect(closeSearch).toHaveCSS('padding', '8px 12px')
    await expect(closeSearch).toHaveCSS('border-top-width', '0px')
    await expect(closeSearch).toHaveCSS('border-top-style', 'none')
    await expect(closeSearch).toHaveCSS('border-radius', '4px')
    await closeSearch.hover()
    await expect(closeSearch).toHaveCSS(
      'background-color',
      'rgb(243, 248, 243)',
    )
    await clearSearch.hover()
    const clearSearchHoverColor = await clearSearch.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    )
    await closeSearch.hover()
    await expect(closeSearch).toHaveCSS(
      'background-color',
      clearSearchHoverColor,
    )

    await page.getByRole('button', { name: 'Buscar' }).focus()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Shift+Tab')
    await expect(closeSearch).toBeFocused()
    await expect(closeSearch).toHaveCSS(
      'background-color',
      'rgb(243, 248, 243)',
    )

    await closeSearch.click()
    await expect(sidebar).toBeHidden()
    await expect(zoomControl).toBeVisible()
    const isZoomControlClickable = await page.evaluate(
      ({ x, y }) => {
        const topElement = document.elementFromPoint(x, y)
        return topElement.closest('.leaflet-control-zoom-in') !== null
      },
      {
        x: zoomBounds.x + zoomBounds.width / 2,
        y: zoomBounds.y + zoomBounds.height / 2,
      },
    )
    expect(isZoomControlClickable).toBe(true)
    await expect(
      page.getByRole('button', { name: 'Abrir busca' }),
    ).toBeVisible()
    await expect(page.locator('.leaflet-container')).toBeVisible()
    expect(
      await page.evaluate(() => document.documentElement.scrollHeight),
    ).toBeLessThanOrEqual(900)

    await page.getByRole('button', { name: 'Abrir busca' }).click()
    await expect(sidebar).toBeVisible()
  })
}

test('orders each result point list by distance when location is allowed', async ({
  page,
}) => {
  await page.context().grantPermissions(['geolocation'])
  await page.context().setGeolocation({
    latitude: -23.10089,
    longitude: -45.70462,
  })
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.abort(),
  )
  await page.goto('/?busca=medicamento')

  await expect(page.locator('.user-location-marker')).toHaveCount(1)
  const locationMarkerColors = await page
    .locator('.user-location-marker')
    .evaluate((marker) => {
      const colorProbe = document.createElement('span')
      colorProbe.style.color = 'var(--color-location)'
      document.body.append(colorProbe)
      const locationColor = getComputedStyle(colorProbe).color
      colorProbe.remove()
      return (
        getComputedStyle(marker, '::before').backgroundColor === locationColor
      )
    })
  expect(locationMarkerColors).toBe(true)

  await expect(page.locator('.search-result-points li strong')).toHaveText([
    'Drogaria São Paulo',
    'Droga Raia',
  ])
  await expect(page.locator('.search-result-distance')).toHaveText([
    ' · 0 m',
    ' · 147 m',
  ])
})

test('keeps received result order silently when location is denied', async ({
  page,
}) => {
  await page.context().grantPermissions([], {
    origin: 'http://127.0.0.1:4173',
  })
  await page.goto('/?busca=medicamento')

  await expect(page.locator('.search-result-points li strong')).toHaveText([
    'Droga Raia',
    'Drogaria São Paulo',
  ])
  await expect(page.locator('.search-result-distance')).toHaveCount(0)
  await expect(page.locator('.user-location-marker')).toHaveCount(0)
  await expect(page.locator('.search-feedback')).not.toContainText(
    /distância|localização/i,
  )
})

test('does not show a user marker when geolocation reports an error', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.__geolocationErrorCalled = false
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition(_success, error) {
          window.__geolocationErrorCalled = true
          error({ code: 2, message: 'Position unavailable' })
        },
      },
    })
  })
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.abort(),
  )
  await page.goto('/')
  await page.waitForFunction(() => window.__geolocationErrorCalled)

  await expect(page.locator('.user-location-marker')).toHaveCount(0)
})

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
    await expect(osmLink).toHaveAttribute('rel', 'noopener noreferrer')

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
    await expect(sourceLink).toHaveAttribute('rel', 'noopener noreferrer')
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
    page.getByRole('heading', { name: 'Resultados para “PILHAS”' }),
  ).toBeVisible()
  await expect(
    page.getByText('Tipo de resíduo: Pilhas e baterias'),
  ).toBeVisible()

  await search.fill('smartphone')
  await page.getByRole('button', { name: 'Buscar' }).click()
  await expect(page).toHaveURL(/\/\?busca=smartphone$/)
  await expect(page.getByRole('button', { name: 'Buscar' })).toBeFocused()
  await expect(
    page.getByRole('heading', { name: 'Resultados para “smartphone”' }),
  ).toBeVisible()
  await expect(page.getByText('Tipo de resíduo: Eletrônicos')).toBeVisible()

  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Resultados para “smartphone”' }),
  ).toBeVisible()
  await expect(search).toHaveValue('smartphone')

  await page.goBack()
  await expect(page).toHaveURL(/\/\?busca=PILHAS$/)
  await expect(search).toHaveValue('PILHAS')
  await expect(
    page.getByRole('heading', { name: 'Resultados para “PILHAS”' }),
  ).toBeVisible()
})

test('keeps an intentionally unknown item visible and allows clearing it', async ({
  page,
}) => {
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.abort(),
  )
  const query = 'Item intencionalmente inexistente'
  await page.goto(`/?busca=${encodeURIComponent(query)}`)

  await expect(
    page.getByRole('heading', { name: `Não encontramos "${query}".` }),
  ).toBeVisible()
  await expect(
    page.getByText(
      'Confira a grafia ou veja os tipos de resíduo na página Aprenda.',
    ),
  ).toBeVisible()
  await expect(
    page.getByRole('searchbox', { name: 'O que você quer descartar?' }),
  ).toHaveValue(query)
  await expect(
    page.getByText('Tipo de resíduo:', { exact: false }),
  ).toHaveCount(0)
  await expect(page.locator('.search-result')).toHaveCount(0)
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(
    collectionPointCount,
  )

  await page.getByRole('button', { name: 'Limpar busca' }).click()
  await expect(page).toHaveURL('/')
  await expect(
    page.getByText(
      'Digite o nome de um item para descobrir onde e como descartá-lo',
    ),
  ).toBeVisible()
})

for (const query of ['eletrônicos', 'eletronicos']) {
  test(`searches the electronics category with "${query}"`, async ({
    page,
  }) => {
    await page.route('https://tile.openstreetmap.org/**', (route) =>
      route.abort(),
    )
    await page.goto(`/?busca=${encodeURIComponent(query)}`)

    await expect(
      page.getByRole('heading', { name: `Resultados para “${query}”` }),
    ).toBeVisible()
    await expect(page.getByText('Tipo de resíduo: Eletrônicos')).toBeVisible()
    await expect(page.locator('.search-result')).toHaveCount(1)
    await expect(page.locator('.search-result-points li')).toHaveCount(2)
    await expect(
      page.getByText('Correios - Agência Central', { exact: true }),
    ).toBeVisible()
    await expect(page.locator('.leaflet-marker-icon')).toHaveCount(2)
  })
}

test('clears matched item results when the search is cleared', async ({
  page,
}) => {
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.abort(),
  )
  await page.goto('/')
  const search = page.getByRole('searchbox', {
    name: 'O que você quer descartar?',
  })
  await search.fill('medicamento')
  await page.getByRole('button', { name: 'Buscar' }).click()

  await expect(page).toHaveURL('/?busca=medicamento')
  await expect(page.locator('.search-result')).toHaveCount(1)
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(2)

  await page.getByRole('button', { name: 'Limpar busca' }).click()

  await expect(page).toHaveURL('/')
  await expect(search).toHaveValue('')
  await expect(
    page.getByText(
      'Digite o nome de um item para descobrir onde e como descartá-lo',
    ),
  ).toBeVisible()
  await expect(page.locator('.search-result')).toHaveCount(0)
  await expect(page.locator('.search-result-points')).toHaveCount(0)
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(
    collectionPointCount,
  )
})

test('filters pilha and clears search and type while preserving other parameters', async ({
  page,
}) => {
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.abort(),
  )
  await page.goto('/?origem=HU05')
  const search = page.getByRole('searchbox', {
    name: 'O que você quer descartar?',
  })
  await search.fill('pilha')
  await page.getByRole('button', { name: 'Buscar' }).click()

  await expect(page).toHaveURL('/?origem=HU05&busca=pilha')
  await expect(page.locator('.search-result')).toHaveCount(1)
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(2)
  await expect(
    page.getByText(
      '2 pontos em Caçapava recebem este tipo de resíduo. Os demais foram ocultados no mapa.',
    ),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Limpar busca' }).click()

  await expect(page).toHaveURL('/?origem=HU05')
  await expect(search).toHaveValue('')
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(
    collectionPointCount,
  )
})

test('clears the applied search when the search input is cleared', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 700 })
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.abort(),
  )
  await page.goto('/')
  const search = page.getByRole('searchbox', {
    name: 'O que você quer descartar?',
  })
  await search.fill('medicamento')
  await page.getByRole('button', { name: 'Buscar' }).click()

  await expect(page.locator('.search-result')).toHaveCount(1)
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(2)

  await search.fill('')

  await expect(search).toHaveValue('')
  await expect(page).toHaveURL('/')
  await expect(page.locator('.search-result')).toHaveCount(0)
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(
    collectionPointCount,
  )
})

test('asks for an item when the search is submitted empty', async ({
  page,
}) => {
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.abort(),
  )
  await page.goto('/')
  await page.getByRole('button', { name: 'Buscar' }).click()

  await expect(page).toHaveURL('/')
  await expect(
    page.getByText('Digite o nome de um item antes de buscar.'),
  ).toBeVisible()
  await expect(
    page.getByRole('region', { name: 'O que você quer descartar?' }),
  ).toBeVisible()
})

test('groups matching paper items by waste type and lists compatible points', async ({
  page,
}) => {
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.abort(),
  )
  await page.goto('/')
  const search = page.getByRole('searchbox', {
    name: 'O que você quer descartar?',
  })
  await search.fill('papel')
  await page.getByRole('button', { name: 'Buscar' }).click()

  const resultCard = page.locator('.search-result')
  await expect(resultCard).toHaveCount(1)
  await expect(
    resultCard.getByText('Tipo de resíduo: Papel e papelão'),
  ).toHaveCount(1)
  await expect(resultCard.locator('.search-result-items')).toHaveCount(0)
  await expect(resultCard.locator('.search-result-points')).toContainText(
    '2 pontos em Caçapava recebem este tipo de resíduo.',
  )
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(2)
})

test('finds medicines in the sidebar and shows only their two collection points', async ({
  page,
}) => {
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.abort(),
  )
  await page.goto('/')
  const search = page.getByRole('searchbox', {
    name: 'O que você quer descartar?',
  })
  await search.fill('medicamento')
  await page.getByRole('button', { name: 'Buscar' }).click()

  await expect(page.locator('.search-result').first()).toContainText(
    'Tipo de resíduo: Medicamentos',
  )
  await expect(page.getByText('Tipo de resíduo: Medicamentos')).toBeVisible()
  await expect(
    page.getByText(
      '2 pontos em Caçapava recebem este tipo de resíduo. Os demais foram ocultados no mapa.',
    ),
  ).toBeVisible()
  await expect(page.getByText('Droga Raia', { exact: true })).toBeVisible()
  await expect(
    page.getByText('Drogaria São Paulo', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: /Não encontramos/ }),
  ).toHaveCount(0)
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(2)

  await page.getByRole('link', { name: /Saiba mais/ }).click()
  await expect(page).toHaveURL('/aprenda/medicamentos?busca=medicamento')
  await expect(
    page.getByRole('heading', { name: 'Medicamentos', level: 1 }),
  ).toBeVisible()
  await expect(page).toHaveTitle('Medicamentos | EcoDrop')
  await expect(
    page.getByRole('link', { name: 'Aprenda', exact: true }).first(),
  ).toHaveAttribute('aria-current', 'page')
  await expect(
    page.getByText(wasteTypeDetails.Medicamentos.disposalGuide[0]),
  ).toBeVisible()
  const documentMetrics = await page.evaluate(() => ({
    documentHeight: document.documentElement.scrollHeight,
    viewportHeight: window.innerHeight,
  }))
  expect(documentMetrics.documentHeight).toBeGreaterThan(
    documentMetrics.viewportHeight,
  )
  await page.goBack()
  await expect(page).toHaveURL('/?busca=medicamento')
  await expect(
    page.getByRole('searchbox', { name: 'O que você quer descartar?' }),
  ).toHaveValue('medicamento')
  await expect(page.locator('.search-result')).toHaveCount(1)
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(2)
})

test('keeps the app within the viewport with scrollable results and pinned actions', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 600 })
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.abort(),
  )
  await page.goto('/?busca=medicamento')

  const layout = await page.evaluate(() => {
    const feedback = document.querySelector('.search-feedback')
    const actions = document.querySelector('.search-panel-actions')
    const sidebar = document.querySelector('.search-sidebar')
    const map = document.querySelector('.leaflet-container')

    return {
      viewportHeight: window.innerHeight,
      documentHeight: document.documentElement.scrollHeight,
      feedbackHeight: feedback.clientHeight,
      feedbackScrollHeight: feedback.scrollHeight,
      actionsBottom: actions.getBoundingClientRect().bottom,
      actionsTop: actions.getBoundingClientRect().top,
      actionsHeight: actions.getBoundingClientRect().height,
      sidebarBottom: sidebar.getBoundingClientRect().bottom,
      sidebarTop: sidebar.getBoundingClientRect().top,
      mapBottom: map.getBoundingClientRect().bottom,
      actionsInsideScroller: Boolean(actions.closest('.search-feedback')),
    }
  })

  expect(layout.documentHeight).toBeLessThanOrEqual(layout.viewportHeight)
  expect(layout.feedbackScrollHeight).toBeGreaterThan(layout.feedbackHeight)
  expect(layout.actionsBottom).toBeLessThanOrEqual(layout.sidebarBottom)
  expect(layout.actionsBottom).toBeGreaterThan(layout.sidebarBottom - 120)
  expect(layout.actionsTop).toBeGreaterThan(layout.sidebarTop)
  expect(layout.actionsInsideScroller).toBe(false)
  await expect(page.getByRole('button', { name: 'Limpar busca' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Saiba mais/ })).toBeVisible()
  await expect(page.locator('.leaflet-container')).toBeVisible()
  expect(layout.mapBottom).toBeLessThanOrEqual(layout.viewportHeight)
})

test('keeps all collection points visible when the item is unmatched', async ({
  page,
}) => {
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.abort(),
  )
  await page.goto('/?busca=pilah')

  await expect(
    page.getByRole('heading', { name: 'Não encontramos "pilah".' }),
  ).toBeVisible()
  await expect(page.getByRole('status')).toContainText(
    'Confira a grafia ou veja os tipos de resíduo na página Aprenda.',
  )
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(
    collectionPointCount,
  )

  await page
    .getByRole('navigation', { name: 'Navegação principal' })
    .getByRole('link', { name: 'Aprenda' })
    .click()
  await expect(page).toHaveURL('/aprenda')
  await expect(
    page.getByRole('heading', { name: 'Aprenda a descartar', level: 1 }),
  ).toBeVisible()
  await expect(page).toHaveTitle('Aprenda | EcoDrop')
  const glassCard = page.locator('.learn-card').filter({ hasText: 'Vidro' })
  await expect(glassCard).toBeVisible()
  await glassCard.click()
  await expect(page).toHaveURL('/aprenda/vidro')
  await expect(
    page.getByRole('heading', { name: 'Vidro', level: 1 }),
  ).toBeVisible()
})

test('shows a not-found page for unknown waste types', async ({ page }) => {
  await page.goto('/aprenda/nao-existe')

  await expect(
    page.getByRole('heading', { name: 'Tipo de resíduo não encontrado' }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Voltar para Aprenda' }),
  ).toHaveAttribute('href', '/aprenda')
  await expect(page).toHaveTitle('Tipo não encontrado | EcoDrop')
})

test('tracks clicks on all primary navigation links', async ({ page }) => {
  const telemetry = await interceptTelemetry(page)
  await page.route('https://forms.cloud.microsoft/**', (route) => route.abort())
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.abort(),
  )
  await page.goto('/')
  await telemetry.waitForIngestion()

  const navigation = page.getByRole('navigation', {
    name: 'Navegação principal',
  })
  await navigation.getByRole('link', { name: 'Mapa' }).click()
  await navigation.getByRole('link', { name: 'Aprenda' }).click()
  await expect(page).toHaveURL('/aprenda')

  const feedbackLink = navigation.getByRole('link', {
    name: 'Avaliar o EcoDrop',
  })
  const repositoryLink = navigation.getByRole('link', {
    name: 'Código-fonte',
  })
  await expect(repositoryLink).toHaveAttribute(
    'href',
    'https://github.com/bptp-team/ecodrop',
  )
  await expect(repositoryLink).toHaveAttribute('target', '_blank')
  await expect(repositoryLink).toHaveAttribute('rel', 'noopener noreferrer')

  await repositoryLink.hover()
  await expect(repositoryLink).toHaveCSS('color', 'rgb(215, 232, 220)')
  await feedbackLink.focus()
  await page.keyboard.press('Tab')
  await expect(repositoryLink).toBeFocused()
  await expect(repositoryLink).toHaveCSS('color', 'rgb(215, 232, 220)')

  const repositoryPopupPromise = page.waitForEvent('popup')
  await repositoryLink.click()
  const repositoryPopup = await repositoryPopupPromise
  await repositoryPopup.close()

  const popupPromise = page.waitForEvent('popup')
  await feedbackLink.click()
  const popup = await popupPromise
  await popup.close()
  await telemetry.waitForEvent('NavigationLinkClicked', 4)

  expect(
    telemetry.events
      .filter((event) => event.name === 'NavigationLinkClicked')
      .map(({ name, properties }) => ({ name, properties })),
  ).toEqual([
    {
      name: 'NavigationLinkClicked',
      properties: { item: 'map', destination: '/', linkType: 'internal' },
    },
    {
      name: 'NavigationLinkClicked',
      properties: {
        item: 'learn',
        destination: '/aprenda',
        linkType: 'internal',
      },
    },
    {
      name: 'NavigationLinkClicked',
      properties: {
        item: 'repository',
        destination: 'https://github.com/bptp-team/ecodrop',
        linkType: 'external',
      },
    },
    {
      name: 'NavigationLinkClicked',
      properties: {
        item: 'feedback',
        destination: 'https://forms.cloud.microsoft/r/VDeHWtH95J',
        linkType: 'external',
      },
    },
  ])
})

test('returns to the initial map from the EcoDrop logo', async ({ page }) => {
  const telemetry = await interceptTelemetry(page)
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.abort(),
  )
  await page.goto('/?busca=medicamento')
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(2)
  const learnMoreLink = page.getByRole('link', { name: /Saiba mais/ })
  const clearSearchButton = page.getByRole('button', { name: 'Limpar busca' })
  await expect(learnMoreLink).toHaveAccessibleName('Saiba mais')
  await expect(learnMoreLink.locator('[aria-hidden="true"]')).toHaveText('↗')
  await expect(learnMoreLink).toHaveClass(/button--tertiary/)
  await expect(learnMoreLink).toHaveCSS('column-gap', '4px')
  await expect(learnMoreLink).toHaveCSS('padding', '8px 12px')
  await expect(learnMoreLink).toHaveCSS('border-top-width', '0px')
  await expect(learnMoreLink).toHaveCSS('border-top-style', 'none')
  await expect(learnMoreLink).toHaveCSS('border-radius', '4px')
  await learnMoreLink.hover()
  await clearSearchButton.hover()
  const clearSearchHoverColor = await clearSearchButton.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  )
  await learnMoreLink.hover()
  await expect(learnMoreLink).toHaveCSS(
    'background-color',
    clearSearchHoverColor,
  )
  await page.keyboard.press('Tab')
  await learnMoreLink.focus()
  await expect(learnMoreLink).toBeFocused()
  await expect(learnMoreLink).toHaveCSS('outline-style', 'solid')
  await learnMoreLink.click()
  await expect(page).toHaveURL('/aprenda/medicamentos?busca=medicamento')
  await telemetry.waitForEvent('LearnMoreClick')
  await telemetry.waitForIngestion()

  expect(
    telemetry.events
      .filter((event) => event.name === 'LearnMoreClick')
      .map(({ properties }) => properties),
  ).toEqual([
    {
      wasteType: 'Medicamentos',
      destination: '/aprenda/medicamentos',
    },
  ])

  await page.getByRole('link', { name: 'EcoDrop', exact: true }).click()

  await expect(page).toHaveURL('/')
  await expect(
    page.getByRole('searchbox', { name: 'O que você quer descartar?' }),
  ).toHaveValue('')
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(
    collectionPointCount,
  )
  await telemetry.waitForEvent('NavigationLinkClicked', 1)
  expect(
    telemetry.events
      .filter((event) => event.name === 'NavigationLinkClicked')
      .map(({ properties }) => properties),
  ).toEqual([{ item: 'logo', destination: '/', linkType: 'internal' }])
})

test('tracks content page views without counting query changes as pages', async ({
  page,
}) => {
  const telemetry = await interceptTelemetry(page)
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.abort(),
  )
  await page.goto('/')
  await telemetry.waitForPageView('/')

  const search = page.getByRole('searchbox', {
    name: 'O que você quer descartar?',
  })
  await search.fill('PILHAS')
  await search.press('Enter')
  await telemetry.waitForEvent('Search')
  expect(
    telemetry.pageViews.filter((pageView) => pageView.name === '/'),
  ).toHaveLength(1)

  const navigation = page.getByRole('navigation', {
    name: 'Navegação principal',
  })
  await navigation.getByRole('link', { name: 'Aprenda' }).click()
  await telemetry.waitForPageView('/aprenda')
  await page.getByRole('link', { name: /Pilhas e baterias/ }).click()
  await telemetry.waitForPageView('/aprenda/pilhas-e-baterias')
  await page.goBack()
  await telemetry.waitForPageView('/aprenda', 2)

  expect(telemetry.pageViews.map((pageView) => pageView.name)).toEqual([
    '/',
    '/aprenda',
    '/aprenda/pilhas-e-baterias',
    '/aprenda',
  ])
})

test('tracks search submissions with result and collection point counts', async ({
  page,
}) => {
  const telemetry = await interceptTelemetry(page)
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.abort(),
  )
  await page.goto('/')
  await telemetry.waitForIngestion()

  const search = page.getByRole('searchbox', {
    name: 'O que você quer descartar?',
  })
  await search.fill('PILHAS')
  await search.press('Enter')

  await expect(page).toHaveURL(/\/?busca=PILHAS$/)
  await telemetry.waitForEvent('Search')

  expect(
    telemetry.events
      .filter((event) => event.name === 'Search')
      .map(({ name, properties }) => ({ name, properties })),
  ).toEqual([
    {
      name: 'Search',
      properties: { term: 'pilhas', results: '1', points: '2' },
    },
  ])
})

test('tracks searches without results with the existing Search schema', async ({
  page,
}) => {
  const telemetry = await interceptTelemetry(page)
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.abort(),
  )
  await page.goto('/')
  await telemetry.waitForIngestion()

  const search = page.getByRole('searchbox', {
    name: 'O que você quer descartar?',
  })
  await search.fill('Item intencionalmente inexistente')
  await search.press('Enter')
  await telemetry.waitForEvent('Search')

  expect(
    telemetry.events
      .filter((event) => event.name === 'Search')
      .map(({ properties }) => properties),
  ).toEqual([
    {
      term: 'item intencionalmente inexistente',
      results: '0',
      points: '0',
    },
  ])
})

test('tracks opening a collection point', async ({ page }) => {
  const telemetry = await interceptTelemetry(page)
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.abort(),
  )
  await page.goto('/')
  await telemetry.waitForIngestion()

  const marker = page.getByRole('button', { name: 'PEV Vila Santos' })
  await marker.focus()
  await marker.press('Enter')
  await expect(page.locator('.leaflet-popup')).toBeVisible()
  await telemetry.waitForEvent('CollectionPointOpened')

  expect(
    telemetry.events
      .filter((event) => event.name === 'CollectionPointOpened')
      .map(({ name, properties }) => ({ name, properties })),
  ).toEqual([
    {
      name: 'CollectionPointOpened',
      properties: {
        id: 'cacapava-pev-vila-santos',
        name: 'PEV Vila Santos',
      },
    },
  ])
})

test('tracks clicks on a collection point OpenStreetMap link', async ({
  page,
}) => {
  const telemetry = await interceptTelemetry(page)
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.abort(),
  )
  await page.goto('/')
  await telemetry.waitForIngestion()

  const point = collectionPoints.find(
    ({ name }) => name === 'Carrefour Bairro Caçapava',
  )
  const marker = page.getByRole('button', { name: point.name })
  await marker.focus()
  await marker.press('Enter')
  const link = page.getByRole('link', { name: /Ver no OpenStreetMap/ })
  const popupPromise = page.waitForEvent('popup')
  await link.click()
  const popup = await popupPromise
  await popup.close()
  await telemetry.waitForEvent('CollectionPointLinkClick')

  expect(
    telemetry.events
      .filter((event) => event.name === 'CollectionPointLinkClick')
      .map(({ properties }) => properties),
  ).toEqual([{ pointId: point.id }])
})

test('keeps the learning index responsive and preserves legacy type URLs', async ({
  page,
}) => {
  await page.goto('/aprenda')
  await expect(
    page
      .getByRole('navigation', { name: 'Navegação principal' })
      .getByRole('link', { name: 'Aprenda' }),
  ).toHaveAttribute('aria-current', 'page')

  const feedbackLink = page.locator(
    '.app-nav a[href="https://forms.cloud.microsoft/r/VDeHWtH95J"]',
  )
  await expect(feedbackLink).toHaveAttribute('target', '_blank')
  await expect(
    page.locator('.learn-card-list a [aria-hidden="true"]'),
  ).toHaveText(Array(Object.keys(wasteTypeDetails).length).fill('↗'))

  for (const [width, expectedColumns] of [
    [375, 1],
    [768, 2],
    [1024, 3],
  ]) {
    await page.setViewportSize({ width, height: 900 })
    const columnCount = await page
      .locator('.learn-card-list')
      .evaluate(
        (grid) => getComputedStyle(grid).gridTemplateColumns.split(' ').length,
      )
    expect(columnCount).toBe(expectedColumns)
  }

  await page.goto('/aprenda/Pilhas%20e%20baterias')
  await expect(
    page.getByRole('heading', { name: 'Pilhas e baterias', level: 1 }),
  ).toBeVisible()
})

test('filters the map by waste type and clears both URL filters', async ({
  page,
}) => {
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.abort(),
  )
  await page.goto('/aprenda/pilhas-e-baterias')
  await page
    .getByRole('link', { name: 'Ver no mapa os pontos que recebem' })
    .click()
  await expect(page).toHaveURL(
    '/?tipo=pilhas-e-baterias&busca=Pilhas+e+baterias',
  )
  await expect(
    page.getByRole('searchbox', { name: 'O que você quer descartar?' }),
  ).toHaveValue('Pilhas e baterias')
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(2)
  await page.getByRole('button', { name: 'Limpar busca' }).click()
  await expect(page).toHaveURL('/')
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(
    collectionPointCount,
  )

  await page.goto('/?tipo=oleo-de-cozinha-usado')
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(1)
  await expect(page.locator('.map-filter-empty')).toHaveCount(0)
  await expect(page.getByRole('searchbox')).toBeVisible()

  await page.goto('/?busca=pilha&tipo=pilhas-e-baterias')
  await page.getByRole('button', { name: 'Limpar busca' }).click()
  await expect(page).toHaveURL('/')
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(
    collectionPointCount,
  )
})

test('keeps search results visible when the selected type has no collection points', async ({
  page,
}) => {
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.abort(),
  )
  await page.goto('/?tipo=lampadas&busca=l%C3%A2mpada')

  await expect(page.locator('.search-result')).toContainText(
    'Tipo de resíduo: Lâmpadas',
  )
  await expect(page.getByRole('searchbox')).toHaveValue('lâmpada')
  await expect(page.locator('.map-filter-empty')).toHaveCount(0)
  await expect(page.locator('.search-result-points')).toContainText(
    '0 pontos em Caçapava recebem este tipo de resíduo.',
  )
})

test('shows a zero-points count for lâmpada', async ({ page }) => {
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.abort(),
  )
  await page.goto('/?busca=l%C3%A2mpada')

  await expect(page.locator('.search-result')).toContainText(
    'Tipo de resíduo: Lâmpadas',
  )
  await expect(page.locator('.search-result')).toContainText('Como descartar')
  await expect(page.locator('.search-result-points')).toContainText(
    '0 pontos em Caçapava recebem este tipo de resíduo.',
  )
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(0)
})

test('places the search panel beside the map on desktop and compactly over it on mobile', async ({
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
  const mobileMain = await page.locator('.app-main').boundingBox()
  expect(mobileSidebar).not.toBeNull()
  expect(mobileMap).not.toBeNull()
  expect(mobileSidebar).toMatchObject({
    x: mobileMain.x,
    y: mobileMain.y,
    width: mobileMain.width,
  })
  expect(mobileSidebar.height).toBeLessThan(mobileMain.height)
  expect(mobileMap).toMatchObject({
    x: mobileMain.x,
    y: mobileMain.y,
    width: mobileMain.width,
    height: mobileMain.height,
  })
})
