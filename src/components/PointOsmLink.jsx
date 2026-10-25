function PointOsmLink({ osmUrl }) {
  if (typeof osmUrl !== 'string' || !osmUrl.trim()) {
    return null
  }

  return (
    <p className="point-popup-osm">
      <a href={osmUrl.trim()} target="_blank" rel="noreferrer">
        Ver no OpenStreetMap ↗
        <span className="visually-hidden"> (abre em nova aba)</span>
      </a>
    </p>
  )
}

export default PointOsmLink
