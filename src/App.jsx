import { useEffect, useRef, useState } from 'react'
import {
  BrowserRouter,
  Link,
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
  useOutletContext,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import CollectionPointsMap from './components/CollectionPointsMap.jsx'
import Button from './components/Button.jsx'
import ItemSearchPanel from './components/ItemSearchPanel.jsx'
import collectionPoints from './data/collectionPoints.json'
import searchableItems from './data/searchableItems.json'
import wasteTypeDetails from './data/wasteTypeDetails.json'
import LearnIndexPage from './components/LearnIndexPage.jsx'
import LearnPage from './components/LearnPage.jsx'
import { filterCollectionPointsByItems } from './search/collectionPointFilter.js'
import { createItemSearch } from './search/itemSearch.js'
import { trackEvent, trackPageView } from './utils/telemetry.js'
import { getWasteTypeId, resolveWasteType } from './utils/wasteTypes.js'

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

function isTrackablePage(pathname, search) {
  if (pathname === '/') {
    return new URLSearchParams(search).get('pagina') !== 'aprenda'
  }
  if (pathname === '/aprenda') return true

  const match = pathname.match(/^\/aprenda\/([^/]+)$/)
  if (!match) return false

  try {
    return Boolean(resolveWasteType(decodeURIComponent(match[1])))
  } catch {
    return false
  }
}

function DocumentTitle({ title }) {
  useEffect(() => {
    document.title = title
  }, [title])

  return null
}

function MapPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const userLocation = useOutletContext()
  const [isSearchOpen, setIsSearchOpen] = useState(true)
  const query = searchParams.get('busca') ?? ''
  const selectedType = searchParams.get('tipo')
  const pointsForType = getPointsForType(selectedType)
  const items = query ? findItems(query) : []
  const visiblePoints = getVisiblePoints(query, items, pointsForType)

  function searchItem(text) {
    const nextParams = new URLSearchParams(searchParams)
    if (text) {
      nextParams.set('busca', text)
      nextParams.delete('tipo')
    } else {
      nextParams.delete('busca')
      nextParams.delete('tipo')
    }

    setSearchParams(nextParams)
    if (text) trackSearch(text)
  }

  return (
    <>
      <DocumentTitle title="EcoDrop" />
      <main className="app-main">
        <aside
          className={`search-sidebar${isSearchOpen ? '' : ' search-sidebar--closed'}${items.length === 0 ? ' search-sidebar--compact' : ''}`}
          aria-label="Busca de itens"
        >
          <ItemSearchPanel
            query={query}
            items={items}
            points={collectionPoints}
            userLocation={userLocation}
            onSearch={searchItem}
            onClose={() => setIsSearchOpen(false)}
          />
        </aside>
        {!isSearchOpen && (
          <Button
            className="search-open"
            variant="primary"
            type="button"
            onClick={() => setIsSearchOpen(true)}
          >
            Abrir busca
          </Button>
        )}
        <CollectionPointsMap
          points={visiblePoints}
          userLocation={userLocation}
        />
      </main>
    </>
  )
}

function AppLayout() {
  const routerLocation = useLocation()
  const { pathname, search } = routerLocation
  const isLearnLayout =
    pathname !== '/' || new URLSearchParams(search).get('pagina') === 'aprenda'
  const [userLocation, setUserLocation] = useState(null)
  const hasRequestedLocation = useRef(false)
  const lastTrackedPagePath = useRef(null)
  const isInitialPageView = useRef(true)

  useEffect(() => {
    if (
      !isTrackablePage(pathname, search) ||
      lastTrackedPagePath.current === pathname
    ) {
      return
    }

    lastTrackedPagePath.current = pathname
    trackPageView({
      name: pathname,
      uri: `${window.location.origin}${pathname}`,
      properties: { isInitialLoad: isInitialPageView.current },
    })
    isInitialPageView.current = false
  }, [pathname, search])

  useEffect(() => {
    if (
      routerLocation.pathname !== '/' ||
      new URLSearchParams(routerLocation.search).get('pagina') === 'aprenda' ||
      hasRequestedLocation.current
    ) {
      return
    }

    hasRequestedLocation.current = true
    if (!navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const { latitude, longitude } = coords
        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
          setUserLocation({ latitude, longitude })
        }
      },
      () => undefined,
      { maximumAge: 60_000, timeout: 10_000 },
    )
  }, [routerLocation.pathname, routerLocation.search])

  return (
    <div className={`app-shell app-shell--${isLearnLayout ? 'learn' : 'map'}`}>
      <header className="app-header">
        <Link
          className="app-brand"
          to="/"
          onClick={() =>
            trackEvent('NavigationLinkClicked', {
              item: 'logo',
              destination: '/',
              linkType: 'internal',
            })
          }
        >
          <img className="app-logo" src="/favicon.svg" alt="" />
          <h1>EcoDrop</h1>
        </Link>
        <p>Pontos de coleta e descarte de resíduos em Caçapava, SP</p>
        <nav className="app-nav" aria-label="Navegação principal">
          <NavLink
            to="/"
            end
            onClick={() =>
              trackEvent('NavigationLinkClicked', {
                item: 'map',
                destination: '/',
                linkType: 'internal',
              })
            }
          >
            Mapa
          </NavLink>
          <NavLink
            to="/aprenda"
            onClick={() =>
              trackEvent('NavigationLinkClicked', {
                item: 'learn',
                destination: '/aprenda',
                linkType: 'internal',
              })
            }
          >
            Aprenda
          </NavLink>
          <a
            href="https://forms.cloud.microsoft/r/VDeHWtH95J"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() =>
              trackEvent('NavigationLinkClicked', {
                item: 'feedback',
                destination: 'https://forms.cloud.microsoft/r/VDeHWtH95J',
                linkType: 'external',
              })
            }
          >
            Avaliar o EcoDrop <span aria-hidden="true">↗</span>
            <span className="visually-hidden"> (abre em nova aba)</span>
          </a>
        </nav>
      </header>
      <div
        className={`app-content app-content--${isLearnLayout ? 'learn' : 'map'}`}
      >
        <Outlet context={userLocation} />
      </div>
    </div>
  )
}

function LearnNotFound() {
  return (
    <main className="learn-page learn-not-found">
      <DocumentTitle title="Tipo não encontrado | EcoDrop" />
      <h1>Tipo de resíduo não encontrado</h1>
      <Link to="/aprenda">Voltar para Aprenda</Link>
    </main>
  )
}

function WasteTypeRoute() {
  const { wasteTypeId } = useParams()
  const wasteType = resolveWasteType(wasteTypeId)

  if (!wasteType) return <LearnNotFound />

  return (
    <>
      <DocumentTitle title={`${wasteType} | EcoDrop`} />
      <LearnPage wasteType={wasteType} details={wasteTypeDetails[wasteType]} />
    </>
  )
}

function LegacyLearnRoute() {
  const [searchParams] = useSearchParams()
  const legacyType = searchParams.get('tipo')

  if (searchParams.get('pagina') !== 'aprenda') return <MapPage />

  const leftoverParams = new URLSearchParams(searchParams)
  leftoverParams.delete('pagina')
  leftoverParams.delete('tipo')
  const search = leftoverParams.toString()
  const suffix = search ? `?${search}` : ''

  if (!legacyType) return <Navigate to={`/aprenda${suffix}`} replace />

  const wasteType = resolveWasteType(legacyType)
  if (!wasteType) return <LearnNotFound />

  return (
    <Navigate to={`/aprenda/${getWasteTypeId(wasteType)}${suffix}`} replace />
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<LegacyLearnRoute />} />
          <Route
            path="/aprenda"
            element={
              <>
                <DocumentTitle title="Aprenda | EcoDrop" />
                <LearnIndexPage />
              </>
            }
          />
          <Route path="/aprenda/:wasteTypeId" element={<WasteTypeRoute />} />
          <Route path="*" element={<LearnNotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
