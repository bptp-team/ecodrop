function formatSourceLabel(source) {
  if (typeof source === 'string') {
    return source.trim()
  }

  if (typeof source?.label === 'string') {
    return source.label.trim()
  }

  return ''
}

export default formatSourceLabel
