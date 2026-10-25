import L from 'leaflet'
import markerIconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import markerIconUrl from 'leaflet/dist/images/marker-icon.png'
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png'
import 'leaflet/dist/leaflet.css'
import { MapContainer, Marker, TileLayer } from 'react-leaflet'
import { MAP_CENTER, MAP_ZOOM } from '../config/map.js'
import PointPopup from './PointPopup.jsx'
import './CollectionPointsMap.css'

// Leaflet's default icon derives its image paths from leaflet.css, which
// breaks once Vite bundles the images, so the URLs are passed explicitly.
const markerIcon = L.icon({
  ...L.Icon.Default.prototype.options,
  iconUrl: markerIconUrl,
  iconRetinaUrl: markerIconRetinaUrl,
  shadowUrl: markerShadowUrl,
})

function CollectionPointsMap({ points }) {
  return (
    <MapContainer center={MAP_CENTER} zoom={MAP_ZOOM} className="map">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      {points.map((point) => (
        <Marker
          key={point.id}
          position={[point.lat, point.lng]}
          icon={markerIcon}
          alt={point.name}
        >
          <PointPopup point={point} />
        </Marker>
      ))}
    </MapContainer>
  )
}

export default CollectionPointsMap
