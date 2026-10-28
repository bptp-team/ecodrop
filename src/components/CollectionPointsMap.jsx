import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapContainer, Marker, TileLayer } from 'react-leaflet'
import { MAP_CENTER, MAP_ZOOM } from '../config/map.js'
import { trackEvent } from '../utils/telemetry.js'
import PointPopup from './PointPopup.jsx'
import './CollectionPointsMap.css'

const markerIcon = L.divIcon({
  className: 'collection-point-marker',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  popupAnchor: [0, -13],
})

const userLocationIcon = L.divIcon({
  className: 'user-location-marker',
  iconSize: [32, 40],
  iconAnchor: [16, 36],
})

function CollectionPointsMap({ points, userLocation = null }) {
  const hasUserLocation =
    Number.isFinite(userLocation?.latitude) &&
    Number.isFinite(userLocation?.longitude)

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
          title={point.name}
          eventHandlers={{
            popupopen: () =>
              trackEvent('CollectionPointOpened', {
                id: point.id,
                name: point.name,
              }),
          }}
        >
          <PointPopup point={point} />
        </Marker>
      ))}
      {hasUserLocation && (
        <Marker
          position={[userLocation.latitude, userLocation.longitude]}
          icon={userLocationIcon}
          alt="Sua localização"
          title="Sua localização"
        />
      )}
    </MapContainer>
  )
}

export default CollectionPointsMap
