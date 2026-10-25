function SourceLink({ label, url }) {
  if (typeof label !== 'string' || !label.trim()) {
    return null
  }

  if (!url) {
    return label
  }

  return (
    <a href={url} target="_blank" rel="noreferrer">
      {label}
      <span className="visually-hidden"> (abre em nova aba)</span>
    </a>
  )
}

export default SourceLink
