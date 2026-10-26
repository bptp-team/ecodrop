import { normalizeText } from './itemSearch.js'

export function filterCollectionPointsByItems(points, items) {
  const acceptedMaterials = new Set(
    items
      .flatMap((item) => item.collectionPointMaterials ?? [])
      .map((material) => normalizeText(material.trim())),
  )

  if (acceptedMaterials.size === 0) return []

  return points.filter((point) =>
    (point.materials ?? []).some((material) =>
      acceptedMaterials.has(normalizeText(material.trim())),
    ),
  )
}
