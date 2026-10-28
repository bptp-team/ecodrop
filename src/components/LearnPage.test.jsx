import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import collectionPoints from '../data/collectionPoints.json'
import searchableItems from '../data/searchableItems.json'
import wasteTypeDetails from '../data/wasteTypeDetails.json'
import { getWasteTypeId, resolveWasteType } from '../utils/wasteTypes.js'
import LearnIndexPage from './LearnIndexPage.jsx'
import LearnPage from './LearnPage.jsx'

const wasteTypes = [
  ...new Set(searchableItems.map(({ wasteType }) => wasteType)),
]

const placeholderPattern = /^\[.*\]$/

function renderInRouter(element) {
  return renderToStaticMarkup(createElement(MemoryRouter, null, element))
}

describe('LearnPage', () => {
  it.each(wasteTypes)(
    'renders the impacts, disposal steps, and sources for %s',
    (wasteType) => {
      const details = wasteTypeDetails[wasteType]
      const markup = renderInRouter(
        createElement(LearnPage, { wasteType, details }),
      )

      expect(markup).toContain(`<h1>${wasteType}</h1>`)
      expect(markup).toContain('Por que descartar corretamente')
      expect(markup).toContain('Como descartar')
      expect(markup).toContain('Fontes oficiais')

      for (const text of [...details.impacts, ...details.disposalGuide]) {
        expect(markup).toContain(`<li>${text}</li>`)
      }
      for (const { label, url } of details.sources) {
        expect(markup).toContain(`href="${url.replaceAll('&', '&amp;')}"`)
        expect(markup).toContain(label)
      }

      expect(markup).not.toContain('Ainda não registramos')
      expect(markup).not.toContain('Não registramos a forma de descarte ainda.')
    },
  )

  it('shows pending-content messages instead of placeholder strings', () => {
    const markup = renderInRouter(
      createElement(LearnPage, {
        wasteType: 'Vidro',
        details: {
          impacts: ['[Impacto ambiental a pesquisar com fonte oficial]'],
          disposalGuide: ['[Passo de descarte confirmado pela equipe]'],
          sources: [
            { label: '[Nome da fonte oficial]', url: '[URL da fonte oficial]' },
          ],
        },
      }),
    )

    expect(markup).toContain(
      'Ainda não registramos os impactos desse tipo de resíduo.',
    )
    expect(markup).toContain('Não registramos a forma de descarte ainda.')
    expect(markup).toContain('Ainda não registramos fontes oficiais')
    expect(markup).not.toContain('[')
  })

  it('lists learning topics on the dedicated index page without query parameters', () => {
    const markup = renderInRouter(createElement(LearnIndexPage))

    expect(markup).toContain('<h1>Aprenda a descartar</h1>')
    expect(markup).toContain(
      'Escolha um tipo de resíduo para saber por que e como descartá-lo corretamente.',
    )
    expect(markup).toContain('href="/aprenda/vidro"')
    expect(markup).toContain('<h2>Vidro</h2>')
    expect(markup).toContain(wasteTypeDetails.Vidro.summary)
    expect(markup).toContain('Ver como descartar')
    expect(markup).not.toContain('?')
  })

  it('has a summary, impacts, disposal steps, and linked sources for every waste type', () => {
    for (const [wasteType, details] of Object.entries(wasteTypeDetails)) {
      const { summary, impacts, disposalGuide, sources } = details

      expect(summary.trim(), wasteType).not.toBe('')
      expect(impacts.length, wasteType).toBeGreaterThan(0)
      expect(disposalGuide.length, wasteType).toBeGreaterThan(0)
      expect(sources.length, wasteType).toBeGreaterThan(0)

      for (const text of [summary, ...impacts, ...disposalGuide]) {
        expect(text.trim(), wasteType).not.toBe('')
        expect(text, wasteType).not.toMatch(placeholderPattern)
      }
      for (const { label, url } of sources) {
        expect(label.trim(), wasteType).not.toBe('')
        expect(label, wasteType).not.toMatch(placeholderPattern)
        expect(new URL(url).protocol, wasteType).toBe('https:')
      }
    }
  })

  it('resolves stable IDs and keeps supporting existing type-name URLs', () => {
    for (const wasteType of wasteTypes) {
      const id = getWasteTypeId(wasteType)

      expect(id).toBeTruthy()
      expect(resolveWasteType(id)).toBe(wasteType)
      expect(resolveWasteType(wasteType)).toBe(wasteType)
    }

    expect(resolveWasteType('tipo-inexistente')).toBeNull()
  })

  it('keeps every item type and accepted point material linked to existing data', () => {
    const knownMaterials = new Set(
      collectionPoints.flatMap((point) => point.materials ?? []),
    )

    for (const item of searchableItems) {
      expect(wasteTypeDetails[item.wasteType]).toBeDefined()

      for (const material of item.collectionPointMaterials) {
        expect(knownMaterials.has(material)).toBe(true)
      }
    }
  })

  it('has the same waste types as the searchable catalog', () => {
    expect(Object.keys(wasteTypeDetails).sort()).toEqual([...wasteTypes].sort())
  })
})
