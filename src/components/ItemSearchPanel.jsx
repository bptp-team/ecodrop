import { useState } from 'react'
import SourceList from './SourceList.jsx'
import wasteTypeDetails from '../data/wasteTypeDetails.json'
import { filterCollectionPointsByItems } from '../search/collectionPointFilter.js'
import './ItemSearchPanel.css'

function isPlaceholder(value) {
  return typeof value === 'string' && /^\[.*\]$/.test(value.trim())
}

function ItemSearchPanel({
  query,
  items,
  points = [],
  onSearch,
  hasCompatiblePoints,
  onClose,
  typeDetails = wasteTypeDetails,
}) {
  const [inputValue, setInputValue] = useState(query)
  const [validationMessage, setValidationMessage] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    const searchText = inputValue.trim()
    setInputValue(searchText)
    if (!searchText) {
      setValidationMessage('Digite o nome de um item antes de buscar.')
      return
    }

    setValidationMessage('')
    onSearch(searchText)
  }

  function handleClear() {
    setInputValue('')
    setValidationMessage('')
    onSearch('')
  }

  function handleInputChange(event) {
    const value = event.target.value
    setInputValue(value)

    if (!value && query) {
      setValidationMessage('')
      onSearch('')
    }
  }

  const learnUrl = items[0]
    ? `/?${new URLSearchParams({
        pagina: 'aprenda',
        tipo: items[0].wasteType,
        busca: query,
      }).toString()}`
    : null

  const displayedWasteTypes = new Set()
  const resultCards = items.map((item) => {
    const shouldShowGuide = !displayedWasteTypes.has(item.wasteType)
    displayedWasteTypes.add(item.wasteType)
    const details = typeDetails[item.wasteType]
    const guide = (details?.disposalGuide ?? []).filter(
      (step) => typeof step === 'string' && step.trim() && !isPlaceholder(step),
    )
    const sources = (details?.sources ?? [])
      .filter((source) => source?.label && !isPlaceholder(source.label))
      .map((source) => ({
        ...source,
        url: isPlaceholder(source.url) ? undefined : source.url,
      }))
    const itemPoints = filterCollectionPointsByItems(points, [item])
    const pointWord = itemPoints.length === 1 ? 'ponto' : 'pontos'
    const receiveVerb = itemPoints.length === 1 ? 'recebe' : 'recebem'

    return (
      <article className="search-result" key={item.id}>
        <p>
          <strong>Tipo de resíduo:</strong> {item.wasteType}
        </p>
        <hr />
        {shouldShowGuide && (
          <section aria-label={`Orientação para ${item.wasteType}`}>
            <h4>Como descartar</h4>
            {guide.length > 0 ? (
              <>
                <ol>
                  {guide.map((step, index) => (
                    <li key={`${item.id}-step-${index}`}>{step}</li>
                  ))}
                </ol>
              </>
            ) : (
              <p>Não registramos a forma de descarte ainda.</p>
            )}
          </section>
        )}
        <SourceList sources={shouldShowGuide ? sources : []} />
        <section
          className="search-result-points"
          aria-label={`Pontos que recebem ${item.name}`}
        >
          {itemPoints.length > 0 && (
            <p>
              {itemPoints.length} {pointWord} em Caçapava {receiveVerb} este
              item. Os demais foram ocultados no mapa.
            </p>
          )}
          {itemPoints.length > 0 && (
            <ul>
              {itemPoints.map((point) => (
                <li key={point.id}>
                  <strong>{point.name}</strong>
                  {point.address && <span> — {point.address}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </article>
    )
  })

  return (
    <section className="item-search-panel" aria-labelledby="item-search-label">
      <div className="search-panel-header">
        <button
          className="search-close"
          type="button"
          aria-label="Fechar busca"
          onClick={onClose}
        >
          Fechar
        </button>
      </div>
      <form className="search-form" role="search" onSubmit={handleSubmit}>
        <label
          className="search-label"
          htmlFor="item-search"
          id="item-search-label"
        >
          O que você quer descartar?
        </label>
        <div className="search-form-row">
          <input
            id="item-search"
            name="busca"
            type="search"
            placeholder="Ex.: pilha, óleo de cozinha"
            autoComplete="off"
            value={inputValue}
            onChange={handleInputChange}
          />
          <button type="submit">Buscar</button>
        </div>
      </form>

      <div className="search-feedback" aria-live="polite" aria-atomic="true">
        {validationMessage && (
          <p className="search-validation" role="alert">
            {validationMessage}
          </p>
        )}
        {!query && !validationMessage && (
          <p>Digite o nome de um item para descobrir seu tipo de resíduo.</p>
        )}
        {query && items.length > 0 && (
          <section aria-labelledby="item-search-title">
            <h2 id="item-search-title">Resultados para “{query}”</h2>
            {resultCards}
          </section>
        )}
        {query && items.length === 0 && (
          <section
            className="search-not-found"
            aria-labelledby="item-search-title"
          >
            <h2 id="item-search-title">Não encontramos “{query}”.</h2>
            <p>Confira a grafia ou tente outro nome.</p>
          </section>
        )}
        {query && items.length > 0 && !hasCompatiblePoints && (
          <p className="search-no-points" role="status">
            Nenhum ponto recebe este item.
          </p>
        )}
      </div>
      {query && (
        <div className="search-panel-actions">
          <button className="search-clear" type="button" onClick={handleClear}>
            Limpar busca
          </button>
          {learnUrl && (
            <a className="search-learn-more" href={learnUrl}>
              Saiba mais
            </a>
          )}
        </div>
      )}
    </section>
  )
}

export default ItemSearchPanel
