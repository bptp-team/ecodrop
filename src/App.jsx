import CollectionPointsMap from './components/CollectionPointsMap.jsx'

function App() {
  return (
    <>
      <header className="app-header">
        <h1>EcoDrop</h1>
        <p>Pontos de coleta e descarte de resíduos em Caçapava, SP</p>
      </header>
      <main className="app-main">
        <CollectionPointsMap />
      </main>
    </>
  )
}

export default App
