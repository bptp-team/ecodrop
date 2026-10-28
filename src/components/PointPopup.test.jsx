import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import PointPopup from './PointPopup.jsx'

vi.mock('react-leaflet', () => ({
  Popup: ({ children, maxWidth }) =>
    createElement('div', { 'data-popup-max-width': maxWidth }, children),
}))

const basePoint = {
  name: 'Test point',
  address: '123 Test Street',
  city: 'Caçapava',
}

function renderPoint(point) {
  return renderToStaticMarkup(
    createElement(PointPopup, { point: { ...basePoint, ...point } }),
  )
}

describe('PointPopup', () => {
  it('sets the popup width and omits optional fields when absent', () => {
    const markup = renderPoint({})

    expect(markup).toContain('data-popup-max-width="260"')
    expect(markup).toContain('Test point')
    expect(markup).not.toContain('Horário:')
    expect(markup).not.toContain('Recebe:')
    expect(markup).not.toContain('point-popup-note')
    expect(markup).not.toContain('Fonte:')
    expect(markup).not.toContain('Ver no OpenStreetMap')
  })

  it('renders all materials and optional point details when provided', () => {
    const markup = renderPoint({
      hours: 'Weekdays',
      materials: ['Paper', 'Batteries'],
      notes: 'Call before visiting.',
    })

    expect(markup).toContain('Horário:</strong> Weekdays')
    expect(markup).toContain('<li>Paper</li>')
    expect(markup).toContain('<li>Batteries</li>')
    expect(markup).toContain('class="point-popup-note"')
  })

  it('renders the OSM link accessibly only when osmUrl exists', () => {
    const markup = renderPoint({
      osmUrl: 'https://www.openstreetmap.org/way/123',
    })

    expect(markup).toContain(
      '<a href="https://www.openstreetmap.org/way/123" target="_blank" rel="noopener noreferrer">Ver no OpenStreetMap ↗ <span class="visually-hidden"> (abre em nova aba)</span></a>',
    )
    expect(renderPoint({})).not.toContain('Ver no OpenStreetMap')
  })
})
