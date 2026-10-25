import { useState } from 'react'
import './ItemSearchPanel.css'

function ItemSearchPanel({ query, item, onSearch }) {
  const [inputValue, setInputValue] = useState(query)

  function handleSubmit(event) {
    event.preventDefault()
    const searchText = inputValue.trim()
    setInputValue(searchText)
    onSearch(searchText)
  }

  function handleClear() {
    setInputValue('')
    onSearch('')
  }

  return (
    <section className="item-search-panel" aria-labelledby="item-search-title">
      <form className="search-form" role="search" onSubmit={handleSubmit}>
        <label className="search-label" htmlFor="item-search">
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
            onChange={(event) => setInputValue(event.target.value)}
          />
          <button type="submit">Buscar</button>
        </div>
        {query && (
          <button className="search-clear" type="button" onClick={handleClear}>
            Limpar busca
          </button>
        )}
      </form>

      <div className="search-feedback" aria-live="polite" aria-atomic="true">
        {!query && (
          <p id="item-search-title">
            Digite o nome de um item para descobrir seu tipo de resíduo.
          </p>
        )}
        {query && item && (
          <section aria-labelledby="item-search-title">
            <h2 id="item-search-title">Resultado para “{query}”</h2>
            <p>
              <strong>Tipo de resíduo:</strong> {item.wasteType}
            </p>
          </section>
        )}
        {query && !item && (
          <section
            className="search-not-found"
            aria-labelledby="item-search-title"
          >
            <h2 id="item-search-title">Não encontramos “{query}”.</h2>
            <p>Confira a grafia ou tente outro nome.</p>
          </section>
        )}
      </div>
    </section>
  )
}

export default ItemSearchPanel
