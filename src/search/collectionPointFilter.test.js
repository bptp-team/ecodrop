import { describe, expect, it } from 'vitest'
import collectionPoints from '../data/collectionPoints.json'
import searchableItems from '../data/searchableItems.json'
import { filterCollectionPointsByItems } from './collectionPointFilter.js'
import { createItemSearch } from './itemSearch.js'

const points = [
  { id: 'pev', materials: ['Pilhas e baterias', 'Eletrônicos'] },
  { id: 'store', materials: ['Pilhas'] },
  { id: 'medicine', materials: ['Medicamentos'] },
]
const findItems = createItemSearch(searchableItems)

describe('filterCollectionPointsByItems', () => {
  it('returns points whose accepted materials explicitly match any result item', () => {
    const items = [
      { collectionPointMaterials: ['Pilhas'] },
      { collectionPointMaterials: ['Eletrônicos'] },
    ]

    expect(
      filterCollectionPointsByItems(points, items).map(({ id }) => id),
    ).toEqual(['pev', 'store'])
  })

  it('matches material labels without case or accent differences', () => {
    expect(
      filterCollectionPointsByItems(points, [
        { collectionPointMaterials: ['pilhas e BATERIAS'] },
      ]).map(({ id }) => id),
    ).toEqual(['pev'])
  })

  it('returns no points when the explicit item mappings are empty', () => {
    expect(
      filterCollectionPointsByItems(points, [{ collectionPointMaterials: [] }]),
    ).toEqual([])
  })

  it('returns PEV Vila Santos and Carrefour when searching for pilha', () => {
    const matchedItems = findItems('pilha')
    const filteredPointIds = filterCollectionPointsByItems(
      collectionPoints,
      matchedItems,
    ).map(({ id }) => id)

    expect(filteredPointIds).toEqual([
      'cacapava-pev-vila-santos',
      'cacapava-carrefour-bairro',
    ])
  })

  it('returns no points when searching for lâmpada', () => {
    const matchedItems = findItems('lâmpada')

    expect(
      filterCollectionPointsByItems(collectionPoints, matchedItems),
    ).toEqual([])
  })
})
