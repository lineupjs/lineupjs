import { exampleText } from '../../src/renderer/utils';
import type { IDataRow } from '../../src/model/interfaces';
import type { ISequence } from '../../src/internal';
import { StringColumn } from '../../src/model';

// Mock StringColumn for testing
class MockStringColumn extends StringColumn {
  private values: string[];

  constructor(values: string[]) {
    super('test', { label: 'Test Column', type: 'string' });
    this.values = values;
  }

  getValue(row: IDataRow): string | null {
    return this.values[row.i] || null;
  }

  getLabel(row: IDataRow): string {
    const value = this.getValue(row);
    return value || '';
  }
}

// Helper to create mock data rows
function createDataRows(values: string[]): IDataRow[] {
  return values.map((v, i) => ({ v, i }));
}

// Simple array-based sequence implementation that implements ISequence
class ArraySequence<T> implements ISequence<T> {
  readonly length: number;
  private items: T[];

  constructor(items: T[]) {
    this.items = items;
    this.length = items.length;
  }

  *[Symbol.iterator](): Iterator<T> {
    for (const item of this.items) {
      yield item;
    }
  }

  forEach(callback: (v: T, i: number) => void): void {
    this.items.forEach(callback);
  }

  filter(callback: (v: T, i: number) => boolean): ArraySequence<T> {
    return new ArraySequence(this.items.filter(callback));
  }

  map<U>(callback: (v: T, i: number) => U): ArraySequence<U> {
    return new ArraySequence(this.items.map(callback));
  }

  some(callback: (v: T, i: number) => boolean): boolean {
    return this.items.some(callback);
  }

  every(callback: (v: T, i: number) => boolean): boolean {
    return this.items.every(callback);
  }

  reduce<U>(callback: (acc: U, v: T, i: number) => U, initial: U): U {
    return this.items.reduce(callback, initial);
  }
}

describe('exampleText', () => {
  it('should return empty string for empty sequence', () => {
    const col = new MockStringColumn([]);
    const rows = new ArraySequence<IDataRow>([]);

    const result = exampleText(col, rows);

    expect(result).toBe('');
  });

  it('should return single value for one item', () => {
    const col = new MockStringColumn(['value1']);
    const rows = new ArraySequence(createDataRows(['value1']));

    const result = exampleText(col, rows);

    expect(result).toBe('value1');
  });

  it('should return distinct values joined with commas', () => {
    const col = new MockStringColumn(['value1', 'value2', 'value3']);
    const rows = new ArraySequence(createDataRows(['value1', 'value2', 'value3']));

    const result = exampleText(col, rows);

    expect(result).toBe('value1, value2, value3');
  });

  it('should deduplicate identical values (the main issue)', () => {
    const col = new MockStringColumn(['value1', 'value1', 'value1', 'value1']);
    const rows = new ArraySequence(createDataRows(['value1', 'value1', 'value1', 'value1']));

    const result = exampleText(col, rows);

    // After fix: should show only distinct values
    expect(result).toBe('value1');
  });

  it('should handle mixed duplicate and unique values', () => {
    const col = new MockStringColumn(['value1', 'value1', 'value2', 'value1', 'value3']);
    const rows = new ArraySequence(createDataRows(['value1', 'value1', 'value2', 'value1', 'value3']));

    const result = exampleText(col, rows);

    // After fix: should show only distinct values in order of first occurrence
    expect(result).toBe('value1, value2, value3');
  });

  it('should limit to 5 values and add ellipsis when more exist', () => {
    const col = new MockStringColumn(['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7']);
    const rows = new ArraySequence(createDataRows(['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7']));

    const result = exampleText(col, rows);

    expect(result).toBe('v1, v2, v3, v4, v5, ...');
  });

  it('should skip null values', () => {
    const col = new MockStringColumn(['value1', '']); // empty string represents null in our mock
    // Override getValue to return null for empty strings
    col.getValue = (row: IDataRow) => {
      const val = ['value1', ''][row.i];
      return val === '' ? null : val;
    };

    const rows = new ArraySequence(createDataRows(['value1', '']));

    const result = exampleText(col, rows);

    // With the new logic, "..." is only added when we stop early due to hitting the limit
    // Here we process all rows (including nulls) but only get 1 example, so no "..."
    expect(result).toBe('value1');
  });

  it('should preserve order of first occurrence when deduplicating', () => {
    const col = new MockStringColumn(['zebra', 'apple', 'zebra', 'banana', 'apple']);
    const rows = new ArraySequence(createDataRows(['zebra', 'apple', 'zebra', 'banana', 'apple']));

    const result = exampleText(col, rows);

    // After fix: should show distinct values in order of first occurrence
    expect(result).toBe('zebra, apple, banana');
  });
});
