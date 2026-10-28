import { Popup } from 'react-leaflet'
import PointHours from './PointHours.jsx'
import PointMaterials from './PointMaterials.jsx'
import PointOsmLink from './PointOsmLink.jsx'
import SourceList from './SourceList.jsx'

function PointPopup({ point }) {
  return (
    <Popup maxWidth={260}>
      <div className="point-popup">
        <h2>{point.name}</h2>
        <p>
          {point.address}, {point.city}
        </p>
        <PointHours hours={point.hours} />
        <PointMaterials materials={point.materials} />
        {point.notes && <p className="point-popup-note">{point.notes}</p>}
        <SourceList sources={point.sources} />
        <PointOsmLink osmUrl={point.osmUrl} pointId={point.id} />
      </div>
    </Popup>
  )
}

export default PointPopup
