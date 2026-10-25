import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import SourceList from './SourceList.jsx'

function renderSources(sources) {
  return renderToStaticMarkup(createElement(SourceList, { sources }))
}

describe('SourceList', () => {
  it('renders nothing when sources are missing or empty', () => {
    expect(renderSources()).toBe('')
    expect(renderSources([])).toBe('')
  })

  it('renders source labels as plain text or external links', () => {
    const markup = renderSources([
      'Verificação presencial',
      {
        label: 'Prefeitura de Caçapava',
        url: 'https://example.com/source',
      },
    ])

    expect(markup).toContain('Fonte:')
    expect(markup).toMatch(/Verificação presencial<\/span><span> · <a/)
    expect(markup).toContain('href="https://example.com/source"')
    expect(markup).toContain('Prefeitura de Caçapava')
    expect(markup).toContain('(abre em nova aba)')
  })

  it('omits sources without a usable label and avoids a dangling prefix', () => {
    expect(
      renderSources([
        null,
        {},
        { label: '' },
        { label: '   ', url: 'https://example.com/blank' },
      ]),
    ).toBe('')
  })

  it('separates only rendered source labels', () => {
    const markup = renderSources([
      { url: 'https://example.com/no-label' },
      { label: 'First' },
      null,
      { label: 'Second' },
    ])

    expect(markup).toMatch(/First<\/span><span> · Second/)
    expect(markup).not.toContain(' ·  · ')
    expect(markup).not.toContain('no-label')
  })
})
