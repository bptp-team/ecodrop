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
    </a>
  )
}

export default SourceLink
