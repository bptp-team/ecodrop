import { useEffect, useState } from 'react'
import CollectionPointsMap from './components/CollectionPointsMap.jsx'
import ItemSearchPanel from './components/ItemSearchPanel.jsx'
import collectionPoints from './data/collectionPoints.json'
import searchableItems from './data/searchableItems.json'
import wasteTypeDetails from './data/wasteTypeDetails.json'
import LearnIndexPage from './components/LearnIndexPage.jsx'
import LearnPage from './components/LearnPage.jsx'
import { resolveWasteType } from './utils/wasteTypes.js'
import { filterCollectionPointsByItems } from './search/collectionPointFilter.js'
import { createItemSearch } from './search/itemSearch.js'
import { trackEvent } from './utils/telemetry.js'

const findItems = createItemSearch(searchableItems)

// Searches without results or without compatible points show what is missing
// from the item catalog and from the collection points.
function trackSearch(text) {
  const found = findItems(text)
  trackEvent('Search', {
    term: text.toLowerCase(),
    results: found.length,
    points:
      found.length > 0
        ? filterCollectionPointsByItems(collectionPoints, found).length
        : 0,
  })
}

function getSearchQuery() {
  return new URLSearchParams(window.location.search).get('busca') ?? ''
}

function getLearnPage() {
  let pathname = window.location.pathname
  while (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1)
  }
  if (pathname === '/aprenda') return { page: 'index' }

  if (pathname.startsWith('/aprenda/')) {
    try {
      const identifier = decodeURIComponent(pathname.slice('/aprenda/'.length))
      const wasteType = resolveWasteType(identifier)
      if (wasteType) {
        return {
          page: 'detail',
          wasteType,
        }
      }
    } catch {
      return { page: 'not-found' }
    }
    return { page: 'not-found' }
  }

  const searchParams = new URLSearchParams(window.location.search)
  if (searchParams.get('pagina') !== 'aprenda') return null

  const wasteType = searchParams.get('tipo')
  if (!wasteType) return { page: 'index' }

  const resolvedWasteType = resolveWasteType(wasteType)
  return resolvedWasteType
    ? {
        page: 'detail',
        wasteType: resolvedWasteType,
      }
    : { page: 'not-found' }
}

function getPageTitle(page) {
  switch (page?.page) {
    case 'detail':
      return `${page.wasteType} | EcoDrop`
    case 'index':
      return 'Aprenda | EcoDrop'
    case 'not-found':
      return 'Tipo não encontrado | EcoDrop'
    default:
      return 'EcoDrop'
  }
}

function renderLearnPage(page) {
  switch (page?.page) {
    case 'index':
      return <LearnIndexPage />
    case 'detail':
      return (
        <LearnPage
          wasteType={page.wasteType}
          details={wasteTypeDetails[page.wasteType]}
        />
      )
    case 'not-found':
      return (
        <main className="learn-page learn-not-found">
          <h1>Tipo de resíduo não encontrado</h1>
          <a href="/aprenda">Voltar para Aprenda</a>
        </main>
      )
    default:
      return null
  }
}

function getPointsForType(selectedType) {
  if (!selectedType) return collectionPoints

  const wasteType = resolveWasteType(selectedType)
  if (!wasteType) return []

  const items = searchableItems.filter((item) => item.wasteType === wasteType)
  return filterCollectionPointsByItems(collectionPoints, items)
}

function getVisiblePoints(query, items, points) {
  if (!query || items.length === 0) return points
  return filterCollectionPointsByItems(points, items)
}

function MapPage({
  historyRevision,
  isSearchOpen,
  items,
  onClose,
  onOpen,
  onSearch,
  query,
  selectedType,
  visiblePoints,
}) {
  return (
    <main className="app-main">
      <aside
        className={`search-sidebar${isSearchOpen ? '' : ' search-sidebar--closed'}${items.length === 0 ? ' search-sidebar--compact' : ''}`}
        aria-label="Busca de itens"
      >
        {selectedType && visiblePoints.length === 0 && (
          <output className="map-filter-empty">
            Nenhum ponto cadastrado recebe este tipo de resíduo.
          </output>
        )}
        <ItemSearchPanel
          key={historyRevision}
          query={query}
          items={items}
          points={collectionPoints}
          hasCompatiblePoints={visiblePoints.length > 0}
          onSearch={onSearch}
          onClose={onClose}
        />
      </aside>
      {!isSearchOpen && (
        <button className="search-open" type="button" onClick={onOpen}>
          Abrir busca
        </button>
      )}
      <CollectionPointsMap points={visiblePoints} />
    </main>
  )
}

function App() {
  const [query, setQuery] = useState(getSearchQuery)
  const [historyRevision, setHistoryRevision] = useState(0)
  const [isSearchOpen, setIsSearchOpen] = useState(true)
  const learnPage = getLearnPage()
  const selectedType = new URLSearchParams(window.location.search).get('tipo')
  const pointsForType = getPointsForType(selectedType)
  const items = query ? findItems(query) : []
  const visiblePoints = getVisiblePoints(query, items, pointsForType)

  useEffect(() => {
    function handlePopState() {
      setQuery(getSearchQuery())
      setHistoryRevision((revision) => revision + 1)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  function searchItem(text) {
    const url = new URL(window.location.href)
    if (text) {
      url.searchParams.set('busca', text)
      url.searchParams.delete('tipo')
    } else {
      url.searchParams.delete('busca')
      url.searchParams.delete('tipo')
    }

    const nextUrl = `${url.pathname}${url.search}${url.hash}`
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`
    if (nextUrl !== currentUrl) {
      window.history.pushState({}, '', nextUrl)
    }
    setQuery(text)
    if (text) trackSearch(text)
  }

  const pageContent = renderLearnPage(learnPage)

  return (
    <>
      <title>{getPageTitle(learnPage)}</title>
      <header className="app-header">
        <div className="app-brand">
          <img className="app-logo" src="/favicon.svg" alt="" />
          <h1>EcoDrop</h1>
        </div>
        <p>Pontos de coleta e descarte de resíduos em Caçapava, SP</p>
        <nav className="app-nav" aria-label="Navegação principal">
          <a href="/" aria-current={!learnPage ? 'page' : undefined}>
            Mapa
          </a>
          <a href="/aprenda" aria-current={learnPage ? 'page' : undefined}>
            Aprenda
          </a>
          <a
            href="https://forms.cloud.microsoft/r/VDeHWtH95J"
            target="_blank"
            rel="noreferrer"
          >
            Avaliar o EcoDrop <span aria-hidden="true">↗</span>
            <span className="visually-hidden"> (abre em nova aba)</span>
          </a>
        </nav>
      </header>
      {pageContent ?? (
        <MapPage
          historyRevision={historyRevision}
          isSearchOpen={isSearchOpen}
          items={items}
          onClose={() => setIsSearchOpen(false)}
          onOpen={() => setIsSearchOpen(true)}
          onSearch={searchItem}
          query={query}
          selectedType={selectedType}
          visiblePoints={visiblePoints}
        />
      )}
    </>
  )
}

export default App
