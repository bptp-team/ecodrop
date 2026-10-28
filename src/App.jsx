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
import ItemSearchPanel from './components/ItemSearchPanel.jsx'
import collectionPoints from './data/collectionPoints.json'
import searchableItems from './data/searchableItems.json'
import wasteTypeDetails from './data/wasteTypeDetails.json'
import LearnIndexPage from './components/LearnIndexPage.jsx'
import LearnPage from './components/LearnPage.jsx'
import { filterCollectionPointsByItems } from './search/collectionPointFilter.js'
import { createItemSearch } from './search/itemSearch.js'
import { trackEvent } from './utils/telemetry.js'
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
          <button
            className="search-open"
            type="button"
            onClick={() => setIsSearchOpen(true)}
          >
            Abrir busca
          </button>
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
  const [userLocation, setUserLocation] = useState(null)
  const hasRequestedLocation = useRef(false)

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
    <>
      <header className="app-header">
        <div className="app-brand">
          <img className="app-logo" src="/favicon.svg" alt="" />
          <h1>EcoDrop</h1>
        </div>
        <p>Pontos de coleta e descarte de resíduos em Caçapava, SP</p>
        <nav className="app-nav" aria-label="Navegação principal">
          <NavLink
            to="/"
            end
            onClick={() =>
              trackEvent('Navigation', {
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
              trackEvent('Navigation', {
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
            rel="noreferrer"
            onClick={() =>
              trackEvent('Navigation', {
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
      <Outlet context={userLocation} />
    </>
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
