import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import ItemSearchPanel from './ItemSearchPanel.jsx'
import LearnPage from './LearnPage.jsx'

const matchingItems = [
  { id: 'paper', name: 'Papel', wasteType: 'Papel e papelão' },
  { id: 'cardboard', name: 'Papelão', wasteType: 'Papel e papelão' },
]

function renderInRouter(element) {
  return renderToStaticMarkup(createElement(MemoryRouter, null, element))
}

function renderPanel(
  typeDetails,
  items = matchingItems,
  points = [],
  userLocation = null,
) {
  return renderInRouter(
    createElement(ItemSearchPanel, {
      query: 'papel',
      items,
      points,
      userLocation,
      hasCompatiblePoints: false,
      onSearch: () => {},
      typeDetails,
    }),
  )
}

describe('ItemSearchPanel', () => {
  it('groups matching items by waste type without repeating their names', () => {
    const markup = renderPanel({})

    expect(markup.match(/class="search-result"/g)).toHaveLength(1)
    expect(markup.match(/Tipo de resíduo:<\/strong>/g)).toHaveLength(1)
    expect(markup).not.toContain('<h3>Papel</h3>')
    expect(markup).not.toContain('<h3>Papelão</h3>')
    expect(markup).not.toContain('<li>Papel</li>')
    expect(markup).not.toContain('<li>Papelão</li>')
  })

  it('shows the disposal guide and sources only once per matching waste type', () => {
    const markup = renderPanel({
      'Papel e papelão': {
        disposalGuide: ['Separe o material limpo.'],
        sources: [{ label: 'Prefeitura', url: 'https://example.org' }],
      },
    })

    expect(markup).toContain('Separe o material limpo.')
    expect(markup).toContain('Como descartar')
    expect(markup).not.toContain('Não registramos a forma de descarte ainda.')
    expect(markup).toContain('https://example.org')
    expect(markup.match(/Como descartar/g)).toHaveLength(1)
    expect(markup).toContain('Tipo de resíduo:</strong> Papel e papelão')
  })

  it('omits the disposal heading when the guide is empty', () => {
    const markup = renderPanel({
      'Papel e papelão': { disposalGuide: [] },
    })

    expect(markup).toContain('Como descartar')
    expect(markup).toContain('Não registramos a forma de descarte ainda.')
  })

  it('shows a notice when disposal details are only placeholders', () => {
    const markup = renderPanel(undefined)

    expect(markup).toContain('Não registramos a forma de descarte ainda.')
    expect(markup).not.toContain('[Passo de descarte confirmado pela equipe]')
    expect(markup).not.toContain('[Nome da fonte oficial]')
  })

  it('shows source, point count, locations, and actions in that order', () => {
    const markup = renderPanel(
      {
        Medicamentos: {
          disposalGuide: ['Descartar em ponto autorizado.'],
          sources: [{ label: 'Fonte oficial' }],
        },
      },
      [
        {
          id: 'medicine',
          name: 'Medicamento',
          wasteType: 'Medicamentos',
          collectionPointMaterials: ['Medicamentos'],
        },
      ],
      [
        {
          id: 'raia',
          name: 'Droga Raia',
          address: 'Praça da Bandeira, 45, Centro',
          materials: ['Medicamentos'],
        },
        {
          id: 'dsp',
          name: 'Drogaria São Paulo',
          address: 'Avenida Coronel Manoel Inocêncio, 141, Centro',
          materials: ['Medicamentos'],
        },
      ],
    )

    const wasteTypePosition = markup.indexOf(
      'Tipo de resíduo:</strong> Medicamentos',
    )
    const separatorPosition = markup.indexOf('<hr')
    const sourcePosition = markup.indexOf('Fonte oficial')
    const summaryPosition = markup.indexOf(
      '2 pontos em Caçapava recebem este tipo de resíduo. Os demais foram ocultados no mapa.',
    )
    const firstPointPosition = markup.indexOf('Droga Raia')
    const clearPosition = markup.indexOf('Limpar busca')
    const learnPosition = markup.indexOf('Saiba mais')

    expect(separatorPosition).toBeGreaterThan(wasteTypePosition)
    expect(sourcePosition).toBeGreaterThan(separatorPosition)
    expect(summaryPosition).toBeGreaterThan(sourcePosition)
    expect(firstPointPosition).toBeGreaterThan(summaryPosition)
    expect(clearPosition).toBeGreaterThan(firstPointPosition)
    expect(learnPosition).toBeGreaterThan(clearPosition)
    expect(markup).toContain('Drogaria São Paulo')
    expect(markup).toContain('Praça da Bandeira, 45, Centro')
    expect(markup).toContain('href="/aprenda/medicamentos?busca=papel"')
  })

  it('shows the point count even when there are no sources', () => {
    const markup = renderPanel(
      {},
      [
        {
          id: 'medicine',
          name: 'Medicamento',
          wasteType: 'Medicamentos',
          collectionPointMaterials: ['Medicamentos'],
        },
      ],
      [
        {
          id: 'raia',
          name: 'Droga Raia',
          materials: ['Medicamentos'],
        },
      ],
    )

    expect(markup).toContain(
      '1 ponto em Caçapava recebe este tipo de resíduo. Os demais foram ocultados no mapa.',
    )
  })

  it('orders compatible collection points by distance within the result', () => {
    const markup = renderPanel(
      {},
      [
        {
          id: 'medicine',
          name: 'Medicamento',
          wasteType: 'Medicamentos',
          collectionPointMaterials: ['Medicamentos'],
        },
      ],
      [
        {
          id: 'raia',
          name: 'Droga Raia',
          materials: ['Medicamentos'],
          lat: -23.099981,
          lng: -45.705666,
        },
        {
          id: 'dsp',
          name: 'Drogaria São Paulo',
          materials: ['Medicamentos'],
          lat: -23.10089,
          lng: -45.70462,
        },
      ],
      { latitude: -23.10089, longitude: -45.70462 },
    )

    expect(markup.indexOf('Drogaria São Paulo')).toBeLessThan(
      markup.indexOf('Droga Raia'),
    )
    expect(markup).toContain('0 m')
    expect(markup).toContain('147 m')
    expect(markup).toContain('em linha reta')
  })

  it('does not show point distances when there is no authorized location', () => {
    const markup = renderPanel(
      {},
      [
        {
          id: 'medicine',
          name: 'Medicamento',
          wasteType: 'Medicamentos',
          collectionPointMaterials: ['Medicamentos'],
        },
      ],
      [
        {
          id: 'raia',
          name: 'Droga Raia',
          materials: ['Medicamentos'],
          lat: -23.099981,
          lng: -45.705666,
        },
      ],
    )

    expect(markup).not.toContain('search-result-distance')
    expect(markup).not.toContain('em linha reta')
  })

  it('shows a zero-points count when no points match', () => {
    const markup = renderPanel(
      {},
      [
        {
          id: 'medicine',
          name: 'Medicamento',
          wasteType: 'Medicamentos',
          collectionPointMaterials: ['Medicamentos'],
        },
      ],
      [],
    )

    expect(markup).toContain(
      '0 pontos em Caçapava recebem este tipo de resíduo.',
    )
    expect(markup).not.toContain('Os demais foram ocultados no mapa.')
    expect(markup).not.toContain('Nenhum ponto recebe este item.')
  })

  it('shows the not-found message with a link to the learning index', () => {
    const markup = renderInRouter(
      createElement(ItemSearchPanel, {
        query: 'pilah',
        items: [],
        points: [],
        hasCompatiblePoints: true,
        onSearch: () => {},
      }),
    )

    expect(markup).toContain('role="status"')
    expect(markup).toContain('Não encontramos &quot;pilah&quot;.')
    expect(markup).toContain(
      'Confira a grafia ou veja os tipos de resíduo na página',
    )
    expect(markup).toMatch(/href="\/aprenda"[^>]*>Aprenda<\/a>/)
  })

  it('renders the learn page using the selected waste type content', () => {
    const markup = renderInRouter(
      createElement(LearnPage, {
        wasteType: 'Medicamentos',
        details: {
          disposalGuide: ['Leve ao ponto de coleta.'],
          sources: [{ label: 'Fonte oficial' }],
        },
        searchQuery: 'medicamento',
      }),
    )

    expect(markup).toContain('<h1>Medicamentos</h1>')
    expect(markup).toContain('Leve ao ponto de coleta.')
    expect(markup).toContain('Fonte oficial')
    expect(markup).toContain(
      'href="/?tipo=medicamentos&amp;busca=Medicamentos"',
    )
  })
})
