import { describe, expect, it } from 'vitest'
import {
  getCollectionPointDistanceKm,
  sortCollectionPointsByDistance,
} from './collectionPointSort.js'

describe('getCollectionPointDistanceKm', () => {
  it('calculates the straight-line distance in kilometers', () => {
    const distance = getCollectionPointDistanceKm(
      { lat: 0, lng: 1 },
      { latitude: 0, longitude: 0 },
    )

    expect(distance).toBeCloseTo(111.195, 2)
  })

  it('returns null when point coordinates are unavailable', () => {
    expect(
      getCollectionPointDistanceKm({}, { latitude: 0, longitude: 0 }),
    ).toBeNull()
  })
})

describe('sortCollectionPointsByDistance', () => {
  const location = { latitude: 0, longitude: 0 }

  it('sorts nearest points first without mutating the input', () => {
    const farPoint = { id: 'far', lat: 0.02, lng: 0 }
    const nearPoint = { id: 'near', lat: 0.01, lng: 0 }
    const points = [farPoint, nearPoint]

    expect(sortCollectionPointsByDistance(points, location)).toEqual([
      nearPoint,
      farPoint,
    ])
    expect(points).toEqual([farPoint, nearPoint])
  })

  it('preserves the original order when distances are equal', () => {
    const firstPoint = { id: 'first', lat: 0, lng: 0.01 }
    const secondPoint = { id: 'second', lat: 0, lng: -0.01 }

    expect(
      sortCollectionPointsByDistance([firstPoint, secondPoint], location),
    ).toEqual([firstPoint, secondPoint])
  })

  it('preserves the received order when there is no authorized location', () => {
    const points = [
      { id: 'far', lat: 0.02, lng: 0 },
      { id: 'near', lat: 0.01, lng: 0 },
    ]

    expect(sortCollectionPointsByDistance(points, null)).toEqual(points)
  })
})
