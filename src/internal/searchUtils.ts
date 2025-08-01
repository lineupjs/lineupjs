import { EStringFilterType } from '../model/StringColumn';

/**
 * Parse a search query into terms and quoted phrases
 * @param query The search query string
 * @returns Array of search terms and quoted phrases
 * @internal
 */
export function parseSearchQuery(query: string): string[] {
  const terms: string[] = [];
  const trimmed = query.trim();

  if (!trimmed) {
    return terms;
  }

  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < trimmed.length) {
    const char = trimmed[i];

    if (char === '"') {
      if (inQuotes) {
        // End quote - add the quoted phrase if not empty
        if (current.trim()) {
          terms.push(current.trim());
        }
        current = '';
        inQuotes = false;
      } else {
        // Start quote - save any current term first
        if (current.trim()) {
          // Split by spaces/commas and add non-empty terms
          current.split(/[\s,]+/).forEach((term) => {
            if (term.trim()) {
              terms.push(term.trim());
            }
          });
        }
        current = '';
        inQuotes = true;
      }
    } else if (inQuotes) {
      // Inside quotes, add everything
      current += char;
    } else if (char === ' ' || char === ',') {
      // Outside quotes, space or comma ends a term
      if (current.trim()) {
        terms.push(current.trim());
      }
      current = '';
    } else {
      // Regular character outside quotes
      current += char;
    }

    i++;
  }

  // Add any remaining term
  if (current.trim()) {
    if (inQuotes) {
      // Unclosed quote - treat as regular term
      terms.push(current.trim());
    } else {
      // Split by spaces/commas and add non-empty terms
      current.split(/[\s,]+/).forEach((term) => {
        if (term.trim()) {
          terms.push(term.trim());
        }
      });
    }
  }

  return terms;
}

/**
 * Check if a text matches any of the search terms (case-insensitive)
 * @param text The text to search in
 * @param terms Array of search terms
 * @param filterType The type of search to perform
 * @returns true if any term matches
 * @internal
 */
export function matchesAnyTerm(
  text: string,
  terms: string[],
  filterType: EStringFilterType = EStringFilterType.contains
): boolean {
  const lowerText = text.toLowerCase();
  return terms.some((term) => {
    const lowerTerm = term.toLowerCase();
    switch (filterType) {
      case EStringFilterType.exact:
        return lowerText === lowerTerm;
      case EStringFilterType.startsWith:
        return lowerText.startsWith(lowerTerm);
      case EStringFilterType.contains:
      default:
        return lowerText.includes(lowerTerm);
    }
  });
}

/**
 * Enhanced search function that supports multi-term, quoted phrases, and different filter types
 * @param text The text to search in
 * @param searchQuery The search query (string or RegExp)
 * @param filterType The type of search to perform
 * @returns true if the text matches the search criteria
 * @internal
 */
export function searchText(
  text: string,
  searchQuery: string | RegExp,
  filterType: EStringFilterType = EStringFilterType.contains
): boolean {
  if (!text) {
    return false;
  }

  if (searchQuery instanceof RegExp) {
    return searchQuery.test(text);
  }

  const query = searchQuery.toString();
  if (!query || query.trim() === '') {
    return true;
  }

  // Handle exact match case
  if (filterType === EStringFilterType.exact) {
    return text.toLowerCase() === query.toLowerCase();
  }

  // Multi-term search for string filters
  const searchTerms = parseSearchQuery(query);
  if (searchTerms.length > 1) {
    // Multiple terms - match any of them with the specified filter type
    return matchesAnyTerm(text, searchTerms, filterType);
  } else if (searchTerms.length === 1) {
    // Single term - use the parsed term for consistency with the specified filter type
    const lowerText = text.toLowerCase();
    const lowerTerm = searchTerms[0].toLowerCase();
    switch (filterType) {
      case EStringFilterType.startsWith:
        return lowerText.startsWith(lowerTerm);
      case EStringFilterType.contains:
      default:
        return lowerText.includes(lowerTerm);
    }
  }

  // Fallback to original behavior for empty or invalid queries
  const lowerText = text.toLowerCase();
  const lowerFilter = query.toLowerCase();
  switch (filterType) {
    case EStringFilterType.startsWith:
      return lowerText.startsWith(lowerFilter);
    case EStringFilterType.contains:
    default:
      return lowerText.includes(lowerFilter);
  }
}
