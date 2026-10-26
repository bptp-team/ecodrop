import { describe, expect, it } from 'vitest'
import { filterCollectionPointsByItems } from './collectionPointFilter.js'

const points = [
  { id: 'pev', materials: ['Pilhas e baterias', 'Eletrônicos'] },
  { id: 'store', materials: ['Pilhas'] },
  { id: 'medicine', materials: ['Medicamentos'] },
]

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
})
