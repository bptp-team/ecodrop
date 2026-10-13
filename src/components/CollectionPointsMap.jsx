import L from 'leaflet'
import markerIconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import markerIconUrl from 'leaflet/dist/images/marker-icon.png'
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png'
import 'leaflet/dist/leaflet.css'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import { MAP_CENTER, MAP_ZOOM } from '../config/map.js'
import collectionPoints from '../data/collectionPoints.json'
import './CollectionPointsMap.css'

// Leaflet's default icon derives its image paths from leaflet.css, which
// breaks once Vite bundles the images, so the URLs are passed explicitly.
const markerIcon = L.icon({
  ...L.Icon.Default.prototype.options,
  iconUrl: markerIconUrl,
  iconRetinaUrl: markerIconRetinaUrl,
  shadowUrl: markerShadowUrl,
})

function CollectionPointsMap() {
  return (
    <MapContainer center={MAP_CENTER} zoom={MAP_ZOOM} className="map">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      {collectionPoints.map((point) => (
        <Marker
          key={point.id}
          position={[point.lat, point.lng]}
          icon={markerIcon}
          alt={point.name}
        >
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
              <p className="point-popup-source">
                Fonte:{' '}
                {point.sources.map((source, index) => (
                  <span key={source.label}>
                    {index > 0 && ' · '}
                    {source.url ? (
                      <a href={source.url} target="_blank" rel="noreferrer">
                        {source.label}
                      </a>
                    ) : (
                      source.label
                    )}
                  </span>
                ))}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}

export default CollectionPointsMap
