import { useEffect, useState } from 'react'
import CollectionPointsMap from './components/CollectionPointsMap.jsx'
import ItemSearchPanel from './components/ItemSearchPanel.jsx'
import collectionPoints from './data/collectionPoints.json'
import searchableItems from './data/searchableItems.json'
import { createItemSearch } from './search/itemSearch.js'

const findItem = createItemSearch(searchableItems)

function getSearchQuery() {
  return new URLSearchParams(window.location.search).get('busca') ?? ''
}

function App() {
  const [query, setQuery] = useState(getSearchQuery)
  const [historyRevision, setHistoryRevision] = useState(0)
  const item = query ? findItem(query) : null

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
      <main className="app-main">
        <aside className="search-sidebar" aria-label="Busca de itens">
          <ItemSearchPanel
            key={historyRevision}
            query={query}
            item={item}
            onSearch={searchItem}
          />
        </aside>
        <CollectionPointsMap points={collectionPoints} />
      </main>
    </>
  )
}

export default App
