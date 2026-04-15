import { EStringFilterType } from '../../src/model/interfaces';
import { parseSearchQuery, matchesAnyTerm, searchText } from '../../src/internal/searchUtils';

describe('parseSearchQuery', () => {
  it('should return empty array for empty string', () => {
    expect(parseSearchQuery('')).toEqual([]);
  });

  it('should return empty array for whitespace-only string', () => {
    expect(parseSearchQuery('   ')).toEqual([]);
  });

  it('should parse a single term', () => {
    expect(parseSearchQuery('apple')).toEqual(['apple']);
  });

  it('should split on spaces', () => {
    expect(parseSearchQuery('apple orange')).toEqual(['apple', 'orange']);
  });

  it('should split on commas', () => {
    expect(parseSearchQuery('apple,orange')).toEqual(['apple', 'orange']);
  });

  it('should split on semicolons', () => {
    expect(parseSearchQuery('apple;orange')).toEqual(['apple', 'orange']);
  });

  it('should split on semicolons with spaces', () => {
    expect(parseSearchQuery('apple; orange; banana')).toEqual(['apple', 'orange', 'banana']);
  });

  it('should split on mixed separators (space, comma, semicolon)', () => {
    expect(parseSearchQuery('apple, orange; banana mango')).toEqual(['apple', 'orange', 'banana', 'mango']);
  });

  it('should handle multiple consecutive separators', () => {
    expect(parseSearchQuery('apple;;orange')).toEqual(['apple', 'orange']);
    expect(parseSearchQuery('apple,,orange')).toEqual(['apple', 'orange']);
    expect(parseSearchQuery('apple  orange')).toEqual(['apple', 'orange']);
  });

  it('should handle leading and trailing separators', () => {
    expect(parseSearchQuery(';apple;orange;')).toEqual(['apple', 'orange']);
    expect(parseSearchQuery(',apple,orange,')).toEqual(['apple', 'orange']);
  });

  it('should preserve quoted phrases as single terms', () => {
    expect(parseSearchQuery('"Apple Juice"')).toEqual(['Apple Juice']);
  });

  it('should handle quoted phrases with separators inside', () => {
    expect(parseSearchQuery('"apple;orange"')).toEqual(['apple;orange']);
    expect(parseSearchQuery('"apple,orange"')).toEqual(['apple,orange']);
  });

  it('should handle mix of quoted phrases and plain terms', () => {
    expect(parseSearchQuery('"Apple Juice" banana')).toEqual(['Apple Juice', 'banana']);
  });

  it('should handle quoted phrase followed by semicolon-separated terms', () => {
    expect(parseSearchQuery('"Apple Juice";banana;cherry')).toEqual(['Apple Juice', 'banana', 'cherry']);
  });

  it('should treat unclosed quotes as regular terms', () => {
    expect(parseSearchQuery('"apple juice')).toEqual(['apple juice']);
  });

  it('should skip empty quoted phrases', () => {
    expect(parseSearchQuery('""')).toEqual([]);
  });
});

describe('matchesAnyTerm', () => {
  it('should match when text contains any term (contains mode)', () => {
    expect(matchesAnyTerm('Apple Juice', ['apple', 'orange'], EStringFilterType.contains)).toBe(true);
    expect(matchesAnyTerm('Orange Soda', ['apple', 'orange'], EStringFilterType.contains)).toBe(true);
    expect(matchesAnyTerm('Banana Split', ['apple', 'orange'], EStringFilterType.contains)).toBe(false);
  });

  it('should be case-insensitive', () => {
    expect(matchesAnyTerm('Apple Juice', ['APPLE'], EStringFilterType.contains)).toBe(true);
    expect(matchesAnyTerm('apple juice', ['Apple'], EStringFilterType.contains)).toBe(true);
  });

  it('should match exact terms (exact mode)', () => {
    expect(matchesAnyTerm('Apple', ['Apple'], EStringFilterType.exact)).toBe(true);
    expect(matchesAnyTerm('Apple Juice', ['Apple'], EStringFilterType.exact)).toBe(false);
    expect(matchesAnyTerm('Apple Juice', ['Apple Juice', 'Orange'], EStringFilterType.exact)).toBe(true);
  });

  it('should match startsWith terms (startsWith mode)', () => {
    expect(matchesAnyTerm('Apple Juice', ['Apple'], EStringFilterType.startsWith)).toBe(true);
    expect(matchesAnyTerm('Red Apple', ['Apple'], EStringFilterType.startsWith)).toBe(false);
    expect(matchesAnyTerm('Orange Soda', ['Apple', 'Orange'], EStringFilterType.startsWith)).toBe(true);
  });

  it('should default to contains mode when filterType is not provided', () => {
    expect(matchesAnyTerm('Apple Juice', ['apple'])).toBe(true);
    expect(matchesAnyTerm('Banana', ['apple'])).toBe(false);
  });
});

describe('searchText', () => {
  it('should return true for empty query', () => {
    expect(searchText('Apple Juice', '')).toBe(true);
    expect(searchText('Apple Juice', '   ')).toBe(true);
  });

  it('should return false for empty text', () => {
    expect(searchText('', 'apple')).toBe(false);
    expect(searchText(null as unknown as string, 'apple')).toBe(false);
  });

  it('should support RegExp queries', () => {
    expect(searchText('Apple Juice', /^Apple/)).toBe(true);
    expect(searchText('Red Apple', /^Apple/)).toBe(false);
  });

  it('should match single term (contains)', () => {
    expect(searchText('Apple Juice', 'apple')).toBe(true);
    expect(searchText('Banana', 'apple')).toBe(false);
  });

  it('should match space-separated terms', () => {
    expect(searchText('Apple Juice', 'apple orange')).toBe(true);
    expect(searchText('Orange Soda', 'apple orange')).toBe(true);
    expect(searchText('Banana', 'apple orange')).toBe(false);
  });

  it('should match comma-separated terms', () => {
    expect(searchText('Apple Juice', 'apple,orange')).toBe(true);
    expect(searchText('Orange Soda', 'apple,orange')).toBe(true);
    expect(searchText('Banana', 'apple,orange')).toBe(false);
  });

  it('should match semicolon-separated terms', () => {
    expect(searchText('Apple Juice', 'apple;orange')).toBe(true);
    expect(searchText('Orange Soda', 'apple;orange')).toBe(true);
    expect(searchText('Banana', 'apple;orange')).toBe(false);
  });

  it('should match semicolon-separated terms with spaces', () => {
    expect(searchText('Apple Juice', 'apple; orange')).toBe(true);
    expect(searchText('Cherry Pie', 'apple; cherry')).toBe(true);
    expect(searchText('Banana Split', 'apple; cherry')).toBe(false);
  });

  it('should work with exact filter type', () => {
    expect(searchText('Apple Juice', '"Apple Juice"', EStringFilterType.exact)).toBe(true);
    expect(searchText('Apple', 'apple', EStringFilterType.exact)).toBe(true);
    expect(searchText('Apple Juice', 'apple', EStringFilterType.exact)).toBe(false);
  });

  it('should work with startsWith filter type', () => {
    expect(searchText('Apple Juice', 'apple', EStringFilterType.startsWith)).toBe(true);
    expect(searchText('Red Apple', 'apple', EStringFilterType.startsWith)).toBe(false);
  });
});
