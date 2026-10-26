import SourceList from './SourceList.jsx'
import './LearnPage.css'

function isPlaceholder(value) {
  return typeof value === 'string' && /^\[.*\]$/.test(value.trim())
}

function LearnPage({ wasteType, details = {}, searchQuery = '' }) {
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
  const returnUrl = searchQuery
    ? `/?busca=${encodeURIComponent(searchQuery)}`
    : '/'

  return (
    <main className="learn-page">
      <a className="learn-back" href={returnUrl}>
        Voltar à busca
      </a>
      <h2>Aprenda sobre {wasteType}</h2>
      <section aria-labelledby="learn-impacts-title">
        <h3 id="learn-impacts-title">Impactos ambientais</h3>
        {impacts.length > 0 ? (
          <ul>
            {impacts.map((impact, index) => (
              <li key={`impact-${index}`}>{impact}</li>
            ))}
          </ul>
        ) : (
          <p>Ainda não registramos os impactos desse tipo de resíduo.</p>
        )}
      </section>
      <section aria-labelledby="learn-disposal-title">
        <h3 id="learn-disposal-title">Como descartar</h3>
        {guide.length > 0 ? (
          <ol>
            {guide.map((step, index) => (
              <li key={`guide-step-${index}`}>{step}</li>
            ))}
          </ol>
        ) : (
          <p>Não registramos a forma de descarte ainda.</p>
        )}
        <SourceList sources={sources} />
      </section>
    </main>
  )
}

export default LearnPage
