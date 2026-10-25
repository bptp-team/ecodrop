import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import PointHours from './PointHours.jsx'

function renderHours(hours) {
  return renderToStaticMarkup(createElement(PointHours, { hours }))
}

describe('PointHours', () => {
  it.each([undefined, null, '', '   ', 0, {}])(
    'renders nothing when hours are missing, blank, or invalid (%s)',
    (hours) => {
      expect(renderHours(hours)).toBe('')
    },
  )

  it('renders the opening hours when provided', () => {
    expect(renderHours('Segunda a sexta, das 8h às 15h')).toBe(
      '<p><strong>Horário:</strong> Segunda a sexta, das 8h às 15h</p>',
    )
  })
})
