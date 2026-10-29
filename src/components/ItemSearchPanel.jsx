import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Button from './Button.jsx'
import SourceList from './SourceList.jsx'
import SearchMessage from './SearchMessage.jsx'
import wasteTypeDetails from '../data/wasteTypeDetails.json'
import { filterCollectionPointsByItems } from '../search/collectionPointFilter.js'
import {
  getCollectionPointDistanceKm,
  sortCollectionPointsByDistance,
} from '../search/collectionPointSort.js'
import { trackEvent } from '../utils/telemetry.js'
import { getWasteTypeId } from '../utils/wasteTypes.js'
import './ItemSearchPanel.css'

function formatDistance(distanceKm) {
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`

  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(distanceKm)} km`
}

function isPlaceholder(value) {
  return typeof value === 'string' && /^\[.*\]$/.test(value.trim())
}

function ItemSearchPanel({
  query,
  items,
  points = [],
  userLocation = null,
  onSearch,
  onClose,
  typeDetails = wasteTypeDetails,
}) {
  const inputRef = useRef(null)
  const [validationMessage, setValidationMessage] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    const searchText = inputRef.current?.value.trim() ?? ''
    if (!searchText) {
      setValidationMessage('Digite o nome de um item antes de buscar.')
      return
    }

    inputRef.current.value = searchText
    setValidationMessage('')
    onSearch(searchText)
  }

  function handleClear() {
    if (inputRef.current) inputRef.current.value = ''
    setValidationMessage('')
    onSearch('')
  }

  function handleInputChange(event) {
    const value = event.target.value

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
      const compatiblePoints = filterCollectionPointsByItems(
        points,
        matchingItems,
      )
      const itemPoints = userLocation
        ? sortCollectionPointsByDistance(compatiblePoints, userLocation)
        : compatiblePoints
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
            <p>
              {itemPoints.length} {pointWord} em Caçapava {receiveVerb} este
              tipo de resíduo.
              {itemPoints.length > 0 && ' Os demais foram ocultados no mapa.'}
            </p>
            {itemPoints.length > 0 && (
              <ul>
                {itemPoints.map((point) => {
                  const distanceKm = userLocation
                    ? getCollectionPointDistanceKm(point, userLocation)
                    : null

                  return (
                    <li key={point.id}>
                      <strong>{point.name}</strong>
                      {point.address && <span> — {point.address}</span>}
                      {distanceKm !== null && (
                        <span
                          className="search-result-distance"
                          aria-label={`${formatDistance(distanceKm)} em linha reta`}
                          title="Distância em linha reta"
                        >
                          {' '}
                          · {formatDistance(distanceKm)}
                        </span>
                      )}
                    </li>
                  )
                })}
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
        <Button
          className="search-close"
          variant="tertiary"
          type="button"
          aria-label="Fechar busca"
          onClick={onClose}
        >
          Fechar
        </Button>
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
            key={query}
            name="busca"
            type="search"
            placeholder="Ex.: pilha, óleo de cozinha"
            autoComplete="off"
            defaultValue={query}
            ref={inputRef}
            onChange={handleInputChange}
          />
          <Button type="submit">Buscar</Button>
        </div>
      </form>

      <div className="search-feedback" aria-live="polite" aria-atomic="true">
        {validationMessage && (
          <p className="search-validation" role="alert">
            {validationMessage}
          </p>
        )}
        {!query && !validationMessage && (
          <p>Digite o nome de um item para descobrir onde e como descartá-lo</p>
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
            <Link to="/aprenda">Aprenda</Link>.
          </SearchMessage>
        )}
      </div>
      {query && (
        <div className="search-panel-actions">
          <Button
            className="search-clear"
            variant="secondary"
            type="button"
            onClick={handleClear}
          >
            Limpar busca
          </Button>
          {learnUrl && (
            <Button
              as={Link}
              className="search-learn-more"
              variant="tertiary"
              to={learnUrl}
              onClick={() =>
                trackEvent('LearnMoreClick', {
                  wasteType: items[0].wasteType,
                  destination: `/aprenda/${getWasteTypeId(items[0].wasteType)}`,
                })
              }
            >
              Saiba mais <span aria-hidden="true">↗</span>
            </Button>
          )}
        </div>
      )}
    </section>
  )
}

export default ItemSearchPanel
