import wasteTypeDetails from '../data/wasteTypeDetails.json'

export function getWasteTypeId(wasteType) {
  return wasteTypeDetails[wasteType]?.id ?? null
}

export function resolveWasteType(identifier) {
  if (Object.hasOwn(wasteTypeDetails, identifier)) return identifier

  return (
    Object.entries(wasteTypeDetails).find(
      ([, details]) => details.id === identifier,
    )?.[0] ?? null
  )
}
