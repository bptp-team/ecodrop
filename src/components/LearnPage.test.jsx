import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import collectionPoints from '../data/collectionPoints.json'
import searchableItems from '../data/searchableItems.json'
import wasteTypeDetails from '../data/wasteTypeDetails.json'
import LearnIndexPage from './LearnIndexPage.jsx'
import LearnPage from './LearnPage.jsx'

const wasteTypes = [
  ...new Set(searchableItems.map(({ wasteType }) => wasteType)),
]

describe('LearnPage', () => {
  it.each(wasteTypes)(
    'renders a learning page with placeholder impact content for %s',
    (wasteType) => {
      const markup = renderToStaticMarkup(
        createElement(LearnPage, {
          wasteType,
          details: wasteTypeDetails[wasteType],
        }),
      )

      expect(markup).toContain(`Aprenda sobre ${wasteType}`)
      expect(markup).toContain('Impactos ambientais')
      expect(markup).toContain(
        'Ainda não registramos os impactos desse tipo de resíduo.',
      )
      expect(markup).toContain('Como descartar')
      expect(markup).toContain('Não registramos a forma de descarte ainda.')
    },
  )

  it('lists learning topics on the dedicated index page without query parameters', () => {
    const markup = renderToStaticMarkup(createElement(LearnIndexPage))

    expect(markup).toContain('Aprenda sobre resíduos')
    expect(markup).toContain('href="/aprenda/Vidro"')
    expect(markup).toContain('Vidro</a>')
    expect(markup).not.toContain('?')
  })

  it('has placeholder data for every type in the searchable catalog', () => {
    expect(Object.keys(wasteTypeDetails).sort()).toEqual([...wasteTypes].sort())

    for (const details of Object.values(wasteTypeDetails)) {
      expect(details.impacts).toEqual([
        '[Impacto ambiental a pesquisar com fonte oficial]',
      ])
      expect(details.disposalGuide).toEqual([
        '[Passo de descarte confirmado pela equipe]',
        '[Próximo passo confirmado pela equipe]',
      ])
      expect(details.sources).toEqual([
        {
          label: '[Nome da fonte oficial]',
          url: '[URL da fonte oficial]',
        },
      ])
    }
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

  it('includes at least one explicit placeholder across learning data', () => {
    const content = JSON.stringify(wasteTypeDetails)

    expect(content).toMatch(/\[[^\]]+\]/)
  })
})
