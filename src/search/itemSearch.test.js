import { describe, expect, it } from 'vitest'
import searchableItems from '../data/searchableItems.json'
import { createItemSearch, normalizeText } from './itemSearch.js'

const findItem = createItemSearch(searchableItems)

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
  ])('finds %s as item %s', (query, expectedId) => {
    expect(findItem(query)?.id).toBe(expectedId)
  })

  it('supports prefix and small typo searches', () => {
    expect(findItem('pil')?.id).toBe('battery')
    expect(findItem('celulr')?.id).toBe('cellphone')
  })

  it.each(['xyzabc', 'pilah'])(
    'returns null when "%s" has no safe match',
    (query) => {
      expect(findItem(query)).toBeNull()
    },
  )

  it('returns the explicit waste type with the matched catalog item', () => {
    expect(findItem('smartphone')).toMatchObject({
      id: 'cellphone',
      name: 'Celular',
      wasteType: 'Eletrônicos',
    })
  })

  it('returns null for a blank query', () => {
    expect(findItem('   ')).toBeNull()
  })
})
