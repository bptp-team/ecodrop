import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import SourceLink from './SourceLink.jsx'

describe('SourceLink', () => {
  it('renders nothing when there is no label', () => {
    const markup = renderToStaticMarkup(createElement(SourceLink, {}))

    expect(markup).toBe('')
  })

  it('renders nothing when the label is empty or whitespace', () => {
    for (const label of ['', '   ']) {
      const markup = renderToStaticMarkup(createElement(SourceLink, { label }))

      expect(markup).toBe('')
    }
  })

  it('renders the label as text when there is no URL', () => {
    const markup = renderToStaticMarkup(
      createElement(SourceLink, { label: 'Verificação presencial' }),
    )

    expect(markup).toBe('Verificação presencial')
  })

  it('renders the label as a link when a URL is provided', () => {
    const markup = renderToStaticMarkup(
      createElement(SourceLink, {
        label: 'OpenStreetMap',
        url: 'https://www.openstreetmap.org/way/123',
      }),
    )

    expect(markup).toBe(
      '<a href="https://www.openstreetmap.org/way/123" target="_blank" rel="noreferrer">OpenStreetMap<span class="visually-hidden"> (abre em nova aba)</span></a>',
    )
  })

  it('keeps sources without URLs as plain text', () => {
    const markup = renderToStaticMarkup(
      createElement(SourceLink, { label: 'Verificação presencial' }),
    )

    expect(markup).toBe('Verificação presencial')
    expect(markup).not.toContain('<a')
  })
})
