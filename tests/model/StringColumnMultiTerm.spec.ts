import StringColumn from '../../src/model/StringColumn';
import type { IDataRow } from '../../src/model/interfaces';

describe('StringColumn Multi-term Search', () => {
  let column: StringColumn;
  let testData: IDataRow[];

  beforeEach(() => {
    column = new StringColumn('test', { 
      label: 'Test Column',
      type: 'string',
      accessor: (row: IDataRow) => row.v
    });
    
    // Create test data with various strings
    testData = [
      { v: 'Apple Juice', i: 0 },
      { v: 'Orange Soda', i: 1 },
      { v: 'Apple Pie', i: 2 },
      { v: 'Banana Split', i: 3 },
      { v: 'Cherry Pie', i: 4 },
      { v: 'Apple Orange Juice', i: 5 },
      { v: 'Red Apple', i: 6 },
      { v: 'Green Orange', i: 7 },
      { v: '', i: 8 },
      { v: null, i: 9 },
    ];
  });

  describe('parseSearchQuery utility', () => {
    it('should parse single terms', () => {
      column.setFilter({ filter: 'apple', filterMissing: true });
      const matches = testData.filter(row => column.filter(row));
      expect(matches).toHaveLength(4); // Apple Juice, Apple Pie, Apple Orange Juice, Red Apple
    });

    it('should parse multiple space-separated terms', () => {
      column.setFilter({ filter: 'apple orange', filterMissing: true });
      const matches = testData.filter(row => column.filter(row));
      expect(matches).toHaveLength(6); // All items with apple OR orange
    });

    it('should parse multiple comma-separated terms', () => {
      column.setFilter({ filter: 'apple, banana', filterMissing: true });
      const matches = testData.filter(row => column.filter(row));
      expect(matches).toHaveLength(5); // All items with apple OR banana
    });

    it('should parse quoted phrases', () => {
      column.setFilter({ filter: '"Apple Juice"', filterMissing: true });
      const matches = testData.filter(row => column.filter(row));
      expect(matches).toHaveLength(1); // Only exact match "Apple Juice"
    });

    it('should parse mixed terms and quoted phrases', () => {
      column.setFilter({ filter: '"Apple Juice" banana', filterMissing: true });
      const matches = testData.filter(row => column.filter(row));
      expect(matches).toHaveLength(2); // "Apple Juice" and "Banana Split"
    });

    it('should handle case insensitive matching', () => {
      column.setFilter({ filter: 'APPLE orange', filterMissing: true });
      const matches = testData.filter(row => column.filter(row));
      expect(matches).toHaveLength(6); // Should match regardless of case
    });

    it('should handle unclosed quotes gracefully', () => {
      column.setFilter({ filter: '"apple juice', filterMissing: true });
      const matches = testData.filter(row => column.filter(row));
      expect(matches).toHaveLength(1); // Should treat as regular search
    });

    it('should handle empty quotes', () => {
      column.setFilter({ filter: '""', filterMissing: true });
      const matches = testData.filter(row => column.filter(row));
      expect(matches).toHaveLength(0); // Empty phrase matches nothing
    });

    it('should handle whitespace and commas correctly', () => {
      column.setFilter({ filter: ' apple , orange ', filterMissing: true });
      const matches = testData.filter(row => column.filter(row));
      expect(matches).toHaveLength(6); // All items with apple OR orange
    });
  });

  describe('backward compatibility', () => {
    it('should maintain single term filtering', () => {
      column.setFilter({ filter: 'apple', filterMissing: true });
      const matches = testData.filter(row => column.filter(row));
      expect(matches).toHaveLength(4);
    });

    it('should maintain RegExp filtering', () => {
      column.setFilter({ filter: /^Apple/, filterMissing: true });
      const matches = testData.filter(row => column.filter(row));
      expect(matches).toHaveLength(3); // Apple Juice, Apple Pie, Apple Orange Juice
    });

    it('should handle filterMissing correctly', () => {
      column.setFilter({ filter: 'apple', filterMissing: true });
      const matches = testData.filter(row => column.filter(row));
      expect(matches).toHaveLength(4); // 4 apple matches, missing values excluded
    });
  });

  describe('edge cases', () => {
    it('should handle empty filter', () => {
      column.setFilter({ filter: '', filterMissing: false });
      const matches = testData.filter(row => column.filter(row));
      expect(matches).toHaveLength(10); // All values including missing ones
    });

    it('should handle null filter', () => {
      column.setFilter({ filter: null, filterMissing: false });
      const matches = testData.filter(row => column.filter(row));
      expect(matches).toHaveLength(10); // All values including missing ones
    });

    it('should handle special characters in quotes', () => {
      // Add test data with special characters
      testData.push({ v: 'Test (special) chars!', i: 10 });
      column.setFilter({ filter: '"(special)"', filterMissing: true });
      const matches = testData.filter(row => column.filter(row));
      expect(matches).toHaveLength(1);
    });
  });
});