import { describe, expect, it } from 'vitest'
import formatSourceLabel from './formatSourceLabel.js'

describe('formatSourceLabel', () => {
  it('returns an empty string when there is no source', () => {
    expect(formatSourceLabel()).toBe('')
    expect(formatSourceLabel(null)).toBe('')
  })

  it('formats a source provided as plain text', () => {
    expect(formatSourceLabel('  Verificação presencial  ')).toBe(
      'Verificação presencial',
    )
    expect(formatSourceLabel({ label: 'Prefeitura de Caçapava' })).toBe(
      'Prefeitura de Caçapava',
    )
  })

  it('formats the label of a linked source', () => {
    expect(
      formatSourceLabel({
        label: 'OpenStreetMap',
        url: 'https://www.openstreetmap.org/way/123',
      }),
    ).toBe('OpenStreetMap')
  })

  it('returns an empty string when a source has no label', () => {
    expect(formatSourceLabel({ url: 'https://example.com' })).toBe('')
  })
})
