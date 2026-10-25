import { describe, expect, it } from 'vitest'
import collectionPoints from './collectionPoints.json'

describe('collection points', () => {
  it('only includes points in Caçapava', () => {
    expect(collectionPoints.length).toBeGreaterThan(0)
    expect(collectionPoints.every((point) => point.city === 'Caçapava')).toBe(
      true,
    )
  })
})
