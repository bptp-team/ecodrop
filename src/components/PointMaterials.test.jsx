import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import PointMaterials from './PointMaterials.jsx'

function renderMaterials(materials) {
  return renderToStaticMarkup(createElement(PointMaterials, { materials }))
}

describe('PointMaterials', () => {
  it.each([undefined, null, [], 'Pilhas', 0, {}])(
    'renders nothing when materials are missing, empty, or invalid (%s)',
    (materials) => {
      expect(renderMaterials(materials)).toBe('')
    },
  )

  it('renders the heading and each material when provided', () => {
    expect(renderMaterials(['Pilhas e baterias', 'Eletrônicos'])).toBe(
      '<p><strong>Recebe:</strong></p><ul><li>Pilhas e baterias</li><li>Eletrônicos</li></ul>',
    )
  })

  it('supports duplicate material labels without duplicate React keys', () => {
    expect(renderMaterials(['Pilhas', 'Pilhas'])).toBe(
      '<p><strong>Recebe:</strong></p><ul><li>Pilhas</li><li>Pilhas</li></ul>',
    )
  })
})
