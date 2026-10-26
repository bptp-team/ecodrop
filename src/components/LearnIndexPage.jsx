import wasteTypeDetails from '../data/wasteTypeDetails.json'
import './LearnPage.css'

function LearnIndexPage() {
  return (
    <main className="learn-page">
      <a className="learn-back" href="/">
        Voltar à busca
      </a>
      <h2>Aprenda sobre resíduos</h2>
      <ul aria-label="Tipos de resíduo">
        {Object.keys(wasteTypeDetails).map((type) => (
          <li key={type}>
            <a href={`/aprenda/${encodeURIComponent(type)}`}>{type}</a>
          </li>
        ))}
      </ul>
    </main>
  )
}

export default LearnIndexPage
