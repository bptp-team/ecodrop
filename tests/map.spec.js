import { expect, test } from '@playwright/test'

const viewports = [
  { name: 'mobile', width: 375 },
  { name: 'tablet', width: 768 },
  { name: 'desktop', width: 1440 },
]

const learnPageTypes = [
  'Óleo de cozinha usado',
  'Pilhas e baterias',
  'Eletrônicos',
  'Lâmpadas',
  'Papel e papelão',
  'Vidro',
  'Medicamentos',
]

for (const wasteType of learnPageTypes) {
  test(`opens the learning page for ${wasteType}`, async ({ page }) => {
    await page.goto(`/?pagina=aprenda&tipo=${encodeURIComponent(wasteType)}`)

    await expect(
      page.getByRole('heading', { name: `Aprenda sobre ${wasteType}` }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Impactos ambientais' }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Como descartar' }),
    ).toBeVisible()
    await expect(
      page.getByText('Não registramos a forma de descarte ainda.'),
    ).toBeVisible()
  })
}

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
      const mapBounds = await map.boundingBox()
      expect(mapBounds.height).toBeGreaterThan(0)
      expect(mapBounds.y + mapBounds.height).toBeLessThanOrEqual(900)
      expect(
        await page.evaluate(() => document.documentElement.scrollHeight),
      ).toBeLessThanOrEqual(900)
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

for (const { name, width } of viewports.filter(({ width }) => width < 1024)) {
  test(`${name} search panel fills the available screen and can be closed and reopened`, async ({
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
    expect(sidebarBounds.height).toBe(mainBounds.height)
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
    await expect(
      page.getByRole('button', { name: 'Fechar busca' }),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Fechar busca' }).click()
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
  await expect(page.locator('img.leaflet-marker-icon')).toHaveCount(2)

  await page.getByRole('button', { name: 'Limpar busca' }).click()

  await expect(page).toHaveURL('/')
  await expect(search).toHaveValue('')
  await expect(
    page.getByText(
      'Digite o nome de um item para descobrir seu tipo de resíduo.',
    ),
  ).toBeVisible()
  await expect(page.locator('.search-result')).toHaveCount(0)
  await expect(page.locator('.search-result-points')).toHaveCount(0)
  await expect(page.locator('img.leaflet-marker-icon')).toHaveCount(4)
})

test('filters pilha to compatible points and clears all query parameters', async ({
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
  await expect(page.locator('img.leaflet-marker-icon')).toHaveCount(2)
  await expect(
    page.getByText(
      '2 pontos em Caçapava recebem este item. Os demais foram ocultados no mapa.',
    ),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Limpar busca' }).click()

  await expect(page).toHaveURL('/')
  await expect(search).toHaveValue('')
  await expect(page.locator('img.leaflet-marker-icon')).toHaveCount(4)
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
  await expect(page.locator('img.leaflet-marker-icon')).toHaveCount(2)

  await search.fill('')

  await expect(search).toHaveValue('')
  await expect(page).toHaveURL('/')
  await expect(page.locator('.search-result')).toHaveCount(0)
  await expect(page.locator('img.leaflet-marker-icon')).toHaveCount(4)
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

test('shows all matching items in relevance order and the no-points state', async ({
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

  const resultCards = page.locator('.search-result')
  await expect(resultCards).toHaveCount(2)
  await expect(resultCards.nth(0)).toContainText(
    'Tipo de resíduo: Papel e papelão',
  )
  await expect(resultCards.nth(1)).toContainText(
    'Tipo de resíduo: Papel e papelão',
  )
  await expect(page.getByRole('status')).toBeVisible()
  await expect(page.getByRole('status')).toHaveText(
    'Nenhum ponto recebe este item.',
  )
  await expect(page.locator('img.leaflet-marker-icon')).toHaveCount(0)
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
      '2 pontos em Caçapava recebem este item. Os demais foram ocultados no mapa.',
    ),
  ).toBeVisible()
  await expect(page.getByText('Droga Raia', { exact: true })).toBeVisible()
  await expect(
    page.getByText('Drogaria São Paulo', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: /Não encontramos/ }),
  ).toHaveCount(0)
  await expect(page.locator('img.leaflet-marker-icon')).toHaveCount(2)

  await page.getByRole('link', { name: 'Saiba mais' }).click()
  await expect(page).toHaveURL(
    '/?pagina=aprenda&tipo=Medicamentos&busca=medicamento',
  )
  await expect(
    page.getByRole('heading', { name: 'Aprenda sobre Medicamentos' }),
  ).toBeVisible()
  await expect(
    page.getByText('Não registramos a forma de descarte ainda.'),
  ).toBeVisible()
  const documentMetrics = await page.evaluate(() => ({
    documentHeight: document.documentElement.scrollHeight,
    viewportHeight: window.innerHeight,
  }))
  expect(documentMetrics.documentHeight).toBeLessThanOrEqual(
    documentMetrics.viewportHeight,
  )
  await page.getByRole('link', { name: 'Voltar à busca' }).click()
  await expect(page).toHaveURL('/?busca=medicamento')
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
  await expect(page.getByRole('link', { name: 'Saiba mais' })).toBeVisible()
  await expect(page.locator('.leaflet-container')).toBeVisible()
  expect(layout.mapBottom).toBeLessThanOrEqual(layout.viewportHeight)
})

test('does not leave all collection points visible when the item is unmatched', async ({
  page,
}) => {
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.abort(),
  )
  await page.goto('/?busca=xyzabc')

  await expect(
    page.getByRole('heading', { name: 'Não encontramos “xyzabc”.' }),
  ).toBeVisible()
  await expect(page.locator('img.leaflet-marker-icon')).toHaveCount(0)
})

test('places the search panel beside the map on desktop and over it on mobile', async ({
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
    height: mobileMain.height,
  })
  expect(mobileMap).toMatchObject({
    x: mobileMain.x,
    y: mobileMain.y,
    width: mobileMain.width,
    height: mobileMain.height,
  })
})
