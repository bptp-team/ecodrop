import MiniSearch from 'minisearch'

export function normalizeText(text) {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

export function createItemSearch(items) {
  const index = new MiniSearch({
    fields: ['name', 'synonyms'],
    storeFields: ['wasteType'],
    processTerm: normalizeText,
    searchOptions: {
      prefix: true,
      fuzzy: 0.2,
      boost: { name: 2 },
    },
  })

  index.addAll(
    items.map((item) => ({
      id: item.id,
      name: item.name,
      synonyms: item.synonyms.join(' '),
      wasteType: item.wasteType,
    })),
  )

  return function findItem(query) {
    const searchText = query.trim()
    if (!searchText) return []

    return index
      .search(searchText)
      .map(({ id, wasteType }) => {
        const item = items.find((candidate) => candidate.id === id)
        return item ? { ...item, wasteType } : null
      })
      .filter((item) => item !== null)
  }
}
