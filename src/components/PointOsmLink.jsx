import { trackEvent } from '../utils/telemetry.js'

function PointOsmLink({ osmUrl, pointId }) {
  if (typeof osmUrl !== 'string' || !osmUrl.trim()) {
    return null
  }

  function handleClick() {
    trackEvent('CollectionPointLinkClick', { pointId })
  }

  return (
    <p className="point-popup-osm">
      <a
        href={osmUrl.trim()}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
      >
        Ver no OpenStreetMap ↗{' '}
        <span className="visually-hidden"> (abre em nova aba)</span>
      </a>
    </p>
  )
}

export default PointOsmLink
