import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import PointOsmLink from './PointOsmLink.jsx'

function renderOsmLink(osmUrl) {
  return renderToStaticMarkup(createElement(PointOsmLink, { osmUrl }))
}

describe('PointOsmLink', () => {
  it.each([undefined, null, '', '   ', 0, {}])(
    'renders nothing when the URL is missing, blank, or invalid (%s)',
    (osmUrl) => {
      expect(renderOsmLink(osmUrl)).toBe('')
    },
  )

  it('renders an accessible external link when a URL is provided', () => {
    expect(renderOsmLink('https://www.openstreetmap.org/way/123')).toBe(
      '<p class="point-popup-osm"><a href="https://www.openstreetmap.org/way/123" target="_blank" rel="noopener noreferrer">Ver no OpenStreetMap ↗ <span class="visually-hidden"> (abre em nova aba)</span></a></p>',
    )
  })

  it('trims surrounding whitespace from the link URL', () => {
    expect(renderOsmLink(' https://www.openstreetmap.org/way/123 ')).toContain(
      'href="https://www.openstreetmap.org/way/123"',
    )
  })
})
