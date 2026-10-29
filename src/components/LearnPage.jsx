import { Link } from 'react-router-dom'
import Button from './Button.jsx'
import SourceLink from './SourceLink.jsx'
import { trackEvent } from '../utils/telemetry.js'
import { getWasteTypeId } from '../utils/wasteTypes.js'
import './LearnPage.css'

function isPlaceholder(value) {
  return typeof value === 'string' && /^\[.*\]$/.test(value.trim())
}

function LearnPage({ wasteType, details = {} }) {
  const impacts = (details.impacts ?? []).filter(
    (impact) =>
      typeof impact === 'string' && impact.trim() && !isPlaceholder(impact),
  )
  const guide = (details.disposalGuide ?? []).filter(
    (step) => typeof step === 'string' && step.trim() && !isPlaceholder(step),
  )
  const sources = (details.sources ?? [])
    .filter((source) => source?.label && !isPlaceholder(source.label))
    .map((source) => ({
      ...source,
      url: isPlaceholder(source.url) ? undefined : source.url,
    }))

  return (
    <main className="learn-page learn-detail-page">
      <nav className="learn-breadcrumb" aria-label="Trilha de navegação">
        <Link to="/aprenda">Aprenda</Link>
        <span aria-hidden="true">›</span>
        <span aria-current="page">{wasteType}</span>
      </nav>
      <h1>{wasteType}</h1>
      <section aria-labelledby="learn-impacts-title">
        <h2 id="learn-impacts-title">Por que descartar corretamente</h2>
        {impacts.length > 0 ? (
          <ul>
            {impacts.map((impact) => (
              <li key={`${wasteType}-${impact}`}>{impact}</li>
            ))}
          </ul>
        ) : (
          <p>Ainda não registramos os impactos desse tipo de resíduo.</p>
        )}
      </section>
      <section aria-labelledby="learn-disposal-title">
        <h2 id="learn-disposal-title">Como descartar</h2>
        {guide.length > 0 ? (
          <ol>
            {guide.map((step) => (
              <li key={`${wasteType}-${step}`}>{step}</li>
            ))}
          </ol>
        ) : (
          <p>Não registramos a forma de descarte ainda.</p>
        )}
      </section>
      <Button
        as={Link}
        className="learn-map-link"
        variant="primary"
        to={`/?${new URLSearchParams({
          tipo: getWasteTypeId(wasteType),
          busca: wasteType,
        })}`}
        onClick={() =>
          trackEvent('ViewOnMapClick', {
            wasteType,
            destination: '/',
          })
        }
      >
        Ver no mapa os pontos que recebem
      </Button>
      <section aria-labelledby="learn-sources-title">
        <h2 id="learn-sources-title">Fontes oficiais</h2>
        {sources.length > 0 ? (
          <ul className="learn-source-list">
            {sources.map((source, index) => (
              <li key={`${source.label}-${index}`}>
                <SourceLink label={source.label} url={source.url} />
              </li>
            ))}
          </ul>
        ) : (
          <p>
            Ainda não registramos fontes oficiais para este tipo de resíduo.
          </p>
        )}
      </section>
    </main>
  )
}

export default LearnPage
