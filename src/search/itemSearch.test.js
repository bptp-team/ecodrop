import { describe, expect, it } from 'vitest'
import searchableItems from '../data/searchableItems.json'
import { createItemSearch, normalizeText } from './itemSearch.js'

const findItems = createItemSearch(searchableItems)

describe('normalizeText', () => {
  it('removes accents and ignores case', () => {
    expect(normalizeText('ÓLEO DE COZINHA')).toBe('oleo de cozinha')
  })
})

describe('createItemSearch', () => {
  it.each([
    ['OLEO', 'cooking-oil'],
    ['óleo de cozinha usado', 'cooking-oil'],
    ['pilhas', 'battery'],
    ['bateria', 'battery'],
    ['smartphone', 'cellphone'],
    ['lâmpada queimada', 'lamp'],
    ['papel', 'paper'],
    ['caixa de papelão', 'cardboard'],
    ['garrafa de vidro', 'glass'],
    ['medicamento', 'medicine'],
    ['lixo orgânico', 'organic-waste'],
    ['metais', 'metal'],
    ['resíduo comum', 'non-recyclable-waste'],
    ['plásticos', 'plastic'],
  ])('finds %s as item %s', (query, expectedId) => {
    expect(findItems(query)[0]?.id).toBe(expectedId)
  })

  it('supports prefix and small typo searches', () => {
    expect(findItems('pil')[0]?.id).toBe('battery')
    expect(findItems('celulr')[0]?.id).toBe('cellphone')
  })

  it.each(['xyzabc', 'pilah'])(
    'returns no matches when "%s" has no safe match',
    (query) => {
      expect(findItems(query)).toEqual([])
    },
  )

  it('returns all matches in relevance order', () => {
    const findMatches = createItemSearch([
      {
        id: 'synonym-match',
        name: 'Bateria',
        synonyms: ['pilha'],
        wasteType: 'Pilhas e baterias',
      },
      {
        id: 'name-match',
        name: 'Pilha',
        synonyms: ['bateria'],
        wasteType: 'Pilhas e baterias',
      },
    ])

    expect(findMatches('pilha').map(({ id }) => id)).toEqual([
      'name-match',
      'synonym-match',
    ])
  })

  it('returns the explicit waste type with each matched catalog item', () => {
    expect(findItems('smartphone')[0]).toMatchObject({
      id: 'cellphone',
      name: 'Celular',
      wasteType: 'Eletrônicos',
    })
  })

  it('returns no matches for a blank query', () => {
    expect(findItems('   ')).toEqual([])
  })
})
