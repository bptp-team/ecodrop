import SourceLink from './SourceLink.jsx'
import formatSourceLabel from '../utils/formatSourceLabel.js'

function SourceList({ sources }) {
  const labeledSources = (sources ?? [])
    .map((source) => ({
      source,
      label: formatSourceLabel(source),
    }))
    .filter(({ label }) => label)

  if (labeledSources.length === 0) {
    return null
  }

  return (
    <p className="point-popup-source">
      Fonte:{' '}
      {labeledSources.map(({ source, label }, index) => (
        <span key={`${label}-${index}`}>
          {index > 0 && ' · '}
          <SourceLink label={label} url={source?.url} />
        </span>
      ))}
    </p>
  )
}

export default SourceList
