const EARTH_RADIUS_KM = 6371.0088

function toRadians(degrees) {
  return (degrees * Math.PI) / 180
}

function getDistance(point, location) {
  const latitudeDelta = toRadians(point.lat - location.latitude)
  const longitudeDelta = toRadians(point.lng - location.longitude)
  const pointLatitude = toRadians(point.lat)
  const userLatitude = toRadians(location.latitude)
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(pointLatitude) *
      Math.cos(userLatitude) *
      Math.sin(longitudeDelta / 2) ** 2

  return (
    2 *
    EARTH_RADIUS_KM *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  )
}

export function getCollectionPointDistanceKm(point, location) {
  if (
    !Number.isFinite(point?.lat) ||
    !Number.isFinite(point?.lng) ||
    !Number.isFinite(location?.latitude) ||
    !Number.isFinite(location?.longitude)
  ) {
    return null
  }

  return getDistance(point, location)
}

export function sortCollectionPointsByDistance(points, location) {
  if (
    !Number.isFinite(location?.latitude) ||
    !Number.isFinite(location?.longitude)
  ) {
    return [...points]
  }

  return points
    .map((point, index) => ({
      point,
      index,
      distance:
        getCollectionPointDistanceKm(point, location) ??
        Number.POSITIVE_INFINITY,
    }))
    .sort(
      (left, right) =>
        left.distance - right.distance || left.index - right.index,
    )
    .map(({ point }) => point)
}
