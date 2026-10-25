import CollectionPointsMap from './components/CollectionPointsMap.jsx'
import collectionPoints from './data/collectionPoints.json'

function App() {
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
        <CollectionPointsMap points={collectionPoints} />
      </main>
    </>
  )
}

export default App
