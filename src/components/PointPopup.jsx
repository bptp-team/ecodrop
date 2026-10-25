import { Popup } from 'react-leaflet'
import SourceLink from './SourceLink.jsx'
import formatSourceLabel from '../utils/formatSourceLabel.js'

function PointPopup({ point }) {
  const sources = (point.sources ?? [])
    .map((source) => ({ source, label: formatSourceLabel(source) }))
    .filter(({ label }) => label)

  return (
    <Popup>
      <div className="point-popup">
        <h2>{point.name}</h2>
        <p>
          {point.address}, {point.city}
        </p>
        {point.hours && (
          <p>
            <strong>Horário:</strong> {point.hours}
          </p>
        )}
        {point.materials && (
          <>
            <p>
              <strong>Recebe:</strong>
            </p>
            <ul>
              {point.materials.map((material) => (
                <li key={material}>{material}</li>
              ))}
            </ul>
          </>
        )}
        {point.notes && <p className="point-popup-note">{point.notes}</p>}
        {sources.length > 0 && (
          <p className="point-popup-source">
            Fonte:{' '}
            {sources.map(({ source, label }, index) => (
              <span key={label}>
                {index > 0 && ' · '}
                <SourceLink label={label} url={source.url} />
              </span>
            ))}
          </p>
        )}
      </div>
    </Popup>
  )
}

export default PointPopup
