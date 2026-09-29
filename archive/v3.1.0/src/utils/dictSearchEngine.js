import { dictTerms, dictDefinitions } from '../data/dictIndex'

export function searchDictTerms(query, enabledDictIds, maxResults = 200) {
  if (!query || !query.trim()) return []

  const normalizedQuery = query.trim()
  const exactMatches = []
  const prefixMatches = []
  const containsMatches = []
  const definitionMatches = []

  for (const term of dictTerms) {
    if (term === normalizedQuery) {
      exactMatches.push(term)
    } else if (term.startsWith(normalizedQuery)) {
      prefixMatches.push(term)
    } else if (term.includes(normalizedQuery)) {
      containsMatches.push(term)
    }
  }

  let totalResults = exactMatches.length + prefixMatches.length + containsMatches.length

  if (totalResults < maxResults && enabledDictIds && enabledDictIds.length > 0) {
    for (const term of dictTerms) {
      if (exactMatches.includes(term) || prefixMatches.includes(term) || containsMatches.includes(term)) continue

      for (const dictId of enabledDictIds) {
        const defs = dictDefinitions[dictId]
        if (defs && defs[term] && defs[term].includes(normalizedQuery)) {
          definitionMatches.push(term)
          totalResults++
          if (totalResults >= maxResults) break
        }
      }
      if (totalResults >= maxResults) break
    }
  }

  const allResults = [
    ...exactMatches,
    ...prefixMatches.slice(0, maxResults - exactMatches.length),
    ...containsMatches.slice(0, maxResults - exactMatches.length - prefixMatches.length),
    ...definitionMatches.slice(0, maxResults - exactMatches.length - prefixMatches.length - containsMatches.length)
  ]

  return allResults.slice(0, maxResults)
}

export function getTermDefinitions(term, enabledDictIds) {
  const results = []

  for (const dictId of enabledDictIds) {
    const defs = dictDefinitions[dictId]
    if (defs && defs[term]) {
      results.push({ dictId, definition: defs[term] })
    }
  }

  return results
}
