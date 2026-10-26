import { useEffect, useState } from 'react'
import CollectionPointsMap from './components/CollectionPointsMap.jsx'
import ItemSearchPanel from './components/ItemSearchPanel.jsx'
import collectionPoints from './data/collectionPoints.json'
import searchableItems from './data/searchableItems.json'
import wasteTypeDetails from './data/wasteTypeDetails.json'
import LearnPage from './components/LearnPage.jsx'
import { filterCollectionPointsByItems } from './search/collectionPointFilter.js'
import { createItemSearch } from './search/itemSearch.js'

const findItems = createItemSearch(searchableItems)

function getSearchQuery() {
  return new URLSearchParams(window.location.search).get('busca') ?? ''
}

function getLearnPage() {
  const searchParams = new URLSearchParams(window.location.search)
  if (searchParams.get('pagina') !== 'aprenda') return null

  return {
    wasteType: searchParams.get('tipo') ?? '',
    searchQuery: searchParams.get('busca') ?? '',
  }
}

function App() {
  const [query, setQuery] = useState(getSearchQuery)
  const [historyRevision, setHistoryRevision] = useState(0)
  const [isSearchOpen, setIsSearchOpen] = useState(true)
  const learnPage = getLearnPage()
  const items = query ? findItems(query) : []
  const visiblePoints = query
    ? filterCollectionPointsByItems(collectionPoints, items)
    : collectionPoints

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
    } else {
      url.searchParams.delete('busca')
    }

    const nextUrl = `${url.pathname}${url.search}${url.hash}`
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`
    if (nextUrl !== currentUrl) {
      window.history.pushState({}, '', nextUrl)
    }
    setQuery(text)
  }

  return (
    <>
      <header className="app-header">
        <div className="app-brand">
          <img className="app-logo" src="/favicon.svg" alt="" />
          <h1>EcoDrop</h1>
        </div>
        <p>Pontos de coleta e descarte de resíduos em Caçapava, SP</p>
      </header>
      {learnPage ? (
        <LearnPage
          wasteType={learnPage.wasteType}
          searchQuery={learnPage.searchQuery}
          details={wasteTypeDetails[learnPage.wasteType]}
        />
      ) : (
        <main className="app-main">
          <aside
            className={`search-sidebar${isSearchOpen ? '' : ' search-sidebar--closed'}`}
            aria-label="Busca de itens"
          >
            <ItemSearchPanel
              key={historyRevision}
              query={query}
              items={items}
              points={collectionPoints}
              hasCompatiblePoints={visiblePoints.length > 0}
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
          <CollectionPointsMap points={visiblePoints} />
        </main>
      )}
    </>
  )
}

export default App
