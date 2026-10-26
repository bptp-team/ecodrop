import { useState } from 'react'
import SourceList from './SourceList.jsx'
import SearchMessage from './SearchMessage.jsx'
import wasteTypeDetails from '../data/wasteTypeDetails.json'
import { filterCollectionPointsByItems } from '../search/collectionPointFilter.js'
import { getWasteTypeId } from '../utils/wasteTypes.js'
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
    ? `/aprenda/${getWasteTypeId(items[0].wasteType)}?${new URLSearchParams({ busca: query }).toString()}`
    : null

  const resultGroupsByWasteType = new Map()
  for (const item of items) {
    const group = resultGroupsByWasteType.get(item.wasteType) ?? []
    group.push(item)
    resultGroupsByWasteType.set(item.wasteType, group)
  }

  const resultCards = [...resultGroupsByWasteType].map(
    ([wasteType, matchingItems]) => {
      const details = typeDetails[wasteType]
      const guide = (details?.disposalGuide ?? []).filter(
        (step) =>
          typeof step === 'string' && step.trim() && !isPlaceholder(step),
      )
      const sources = (details?.sources ?? [])
        .filter((source) => source?.label && !isPlaceholder(source.label))
        .map((source) => ({
          ...source,
          url: isPlaceholder(source.url) ? undefined : source.url,
        }))
      const itemPoints = filterCollectionPointsByItems(points, matchingItems)
      const pointWord = itemPoints.length === 1 ? 'ponto' : 'pontos'
      const receiveVerb = itemPoints.length === 1 ? 'recebe' : 'recebem'

      return (
        <article className="search-result" key={wasteType}>
          <p>
            <strong>Tipo de resíduo:</strong> {wasteType}
          </p>
          <hr />
          <section aria-label={`Orientação para ${wasteType}`}>
            <h4>Como descartar</h4>
            {guide.length > 0 ? (
              <ol>
                {guide.map((step, index) => (
                  <li key={`${wasteType}-step-${index}`}>{step}</li>
                ))}
              </ol>
            ) : (
              <p>Não registramos a forma de descarte ainda.</p>
            )}
          </section>
          <SourceList sources={sources} />
          <section
            className="search-result-points"
            aria-label={`Pontos que recebem ${wasteType}`}
          >
            {itemPoints.length > 0 && (
              <p>
                {itemPoints.length} {pointWord} em Caçapava {receiveVerb} este
                tipo de resíduo. Os demais foram ocultados no mapa.
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
    },
  )

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
          <SearchMessage title={`Não encontramos "${query}".`}>
            Confira a grafia ou veja os tipos de resíduo na página{' '}
            <a href="/aprenda">Aprenda</a>.
          </SearchMessage>
        )}
        {query && items.length > 0 && !hasCompatiblePoints && (
          <output className="search-no-points">
            Nenhum ponto recebe este item.
          </output>
        )}
      </div>
      {query && (
        <div className="search-panel-actions">
          <button className="search-clear" type="button" onClick={handleClear}>
            Limpar busca
          </button>
          {learnUrl && (
            <a className="search-learn-more" href={learnUrl}>
              Saiba mais ›
            </a>
          )}
        </div>
      )}
    </section>
  )
}

export default ItemSearchPanel
