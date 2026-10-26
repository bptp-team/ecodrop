import { Link } from 'react-router-dom'
import wasteTypeDetails from '../data/wasteTypeDetails.json'
import './LearnPage.css'

function LearnIndexPage() {
  return (
    <main className="learn-page learn-index-page">
      <h1>Aprenda a descartar</h1>
      <p className="learn-intro">
        Escolha um tipo de resíduo para saber por que e como descartá-lo
        corretamente.
      </p>
      <ul className="learn-card-list" aria-label="Tipos de resíduo">
        {Object.entries(wasteTypeDetails).map(([type, details]) => (
          <li key={type}>
            <Link className="learn-card" to={`/aprenda/${details.id}`}>
              <h2>{type}</h2>
              <p>{details.summary}</p>
              <span>
                Ver como descartar <span aria-hidden="true">›</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}

export default LearnIndexPage
