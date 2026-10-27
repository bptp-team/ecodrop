import { describe, expect, it } from 'vitest'
import collectionPoints from './collectionPoints.json'
import searchableItems from './searchableItems.json'
import wasteTypeDetails from './wasteTypeDetails.json'

const months =
  'janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro'
const inPersonVerificationPattern = new RegExp(
  `^Verificação presencial \\((${months}) de \\d{4}\\)$`,
  'i',
)
const officialSourceVerificationPattern = new RegExp(
  `^Verificação por fonte oficial \\((${months}) de \\d{4}\\)$`,
  'i',
)

function hasDatedVerification(point) {
  return point.sources.some(
    ({ label }) =>
      inPersonVerificationPattern.test(label) ||
      officialSourceVerificationPattern.test(label),
  )
}

describe('data integrity', () => {
  it('has collection points, catalog items, and waste types', () => {
    expect(collectionPoints.length).toBeGreaterThan(0)
    expect(searchableItems.length).toBeGreaterThan(0)
    expect(Object.keys(wasteTypeDetails).length).toBeGreaterThan(0)
  })

  it('uses unique non-empty IDs for collection points', () => {
    const ids = collectionPoints.map(({ id }) => id)

    expect(ids.every((id) => typeof id === 'string' && id.trim())).toBe(true)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it.each(collectionPoints)(
    'includes complete details, sources, and dated verification for $id',
    (point) => {
      expect(point.name).toEqual(expect.any(String))
      expect(point.name.trim()).not.toBe('')
      expect(point.city).toEqual(expect.any(String))
      expect(point.city.trim()).not.toBe('')
      expect(point.address).toEqual(expect.any(String))
      expect(point.address.trim()).not.toBe('')
      expect(Number.isFinite(point.lat)).toBe(true)
      expect(point.lat).toBeGreaterThanOrEqual(-90)
      expect(point.lat).toBeLessThanOrEqual(90)
      expect(Number.isFinite(point.lng)).toBe(true)
      expect(point.lng).toBeGreaterThanOrEqual(-180)
      expect(point.lng).toBeLessThanOrEqual(180)
      expect(point.sources.length).toBeGreaterThan(0)
      expect(
        point.sources.every(
          ({ label }) => typeof label === 'string' && label.trim().length > 0,
        ),
      ).toBe(true)
      expect(
        hasDatedVerification(point),
        `${point.id} must have a dated verification source`,
      ).toBe(true)
    },
  )

  it('uses unique non-empty IDs for catalog items', () => {
    const ids = searchableItems.map(({ id }) => id)

    expect(ids.every((id) => typeof id === 'string' && id.trim())).toBe(true)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('links each catalog item to an existing waste type and known point materials', () => {
    const knownMaterials = new Set(
      collectionPoints.flatMap((point) => point.materials ?? []),
    )

    for (const item of searchableItems) {
      expect(item.name).toEqual(expect.any(String))
      expect(item.name.trim()).not.toBe('')
      expect(wasteTypeDetails[item.wasteType]).toBeDefined()
      expect(Array.isArray(item.collectionPointMaterials)).toBe(true)

      for (const material of item.collectionPointMaterials) {
        expect(knownMaterials.has(material)).toBe(true)
      }
    }
  })

  it('uses unique non-empty IDs for waste types', () => {
    const details = Object.values(wasteTypeDetails)
    const ids = details.map(({ id }) => id)

    expect(ids.every((id) => typeof id === 'string' && id.trim())).toBe(true)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('provides details for every waste type referenced by the catalog', () => {
    const catalogWasteTypes = new Set(
      searchableItems.map(({ wasteType }) => wasteType),
    )

    expect(Object.keys(wasteTypeDetails).sort()).toEqual(
      [...catalogWasteTypes].sort(),
    )
  })
})
