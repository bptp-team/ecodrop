import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import collectionPoints from '../data/collectionPoints.json'
import CollectionPointsMap from './CollectionPointsMap.jsx'

vi.mock('leaflet', () => ({
  default: {
    Icon: { Default: { prototype: { options: {} } } },
    icon: vi.fn((options) => options),
    divIcon: vi.fn((options) => options),
  },
}))

vi.mock('react-leaflet', () => ({
  MapContainer: ({ center, children, className, zoom }) =>
    createElement(
      'div',
      {
        className,
        'data-map-center': `${center.lat},${center.lng}`,
        'data-map-zoom': zoom,
      },
      children,
    ),
  Marker: ({ alt, children, icon, position }) =>
    createElement(
      'div',
      {
        className: `leaflet-marker-icon ${icon.className}`,
        'data-marker-name': alt,
        'data-position': `${position[0]},${position[1]}`,
      },
      children,
    ),
  Popup: ({ children, maxWidth }) =>
    createElement('div', { 'data-popup-max-width': maxWidth }, children),
  TileLayer: ({ attribution, maxZoom }) =>
    createElement('div', {
      'data-attribution': attribution,
      'data-max-zoom': maxZoom,
    }),
}))

describe('CollectionPointsMap', () => {
  it('centers the map on Caçapava and preserves OpenStreetMap attribution', () => {
    const markup = renderToStaticMarkup(
      createElement(CollectionPointsMap, { points: collectionPoints }),
    )

    expect(markup).toContain('data-map-center="-23.10083,-45.70694"')
    expect(markup).toContain('data-map-zoom="14"')
    expect(markup).toContain(
      'data-attribution="© &lt;a href=&quot;https://www.openstreetmap.org/copyright&quot;&gt;OpenStreetMap&lt;/a&gt; contributors"',
    )
  })

  it('renders one accessible marker and popup for each point', () => {
    const markup = renderToStaticMarkup(
      createElement(CollectionPointsMap, { points: collectionPoints }),
    )

    expect(markup.match(/data-marker-name=/g)).toHaveLength(5)
    expect(markup).toContain('collection-point-marker')
    expect(markup).toContain('data-marker-name="PEV Vila Santos"')
    expect(markup).toContain('data-popup-max-width="260"')
    expect(markup).toContain(
      'Rua Regente Feijó, 18 (pátio da Secretaria de Obras)',
    )
    expect(markup).toContain('Recebe:')
    expect(markup).toContain('OpenStreetMap')
  })

  it('keeps the map when the points list is empty', () => {
    const markup = renderToStaticMarkup(
      createElement(CollectionPointsMap, { points: [] }),
    )

    expect(markup).toContain('class="map"')
    expect(markup).not.toContain('data-marker-name=')
  })
})
