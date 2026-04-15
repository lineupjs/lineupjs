import CategoricalsColumn from '../../src/model/CategoricalsColumn';
import type { IDataRow } from '../../src/model/interfaces';

describe('CategoricalsColumn toCompareValue', () => {
  let column: CategoricalsColumn;

  beforeEach(() => {
    column = new CategoricalsColumn('c', {
      label: 'c',
      type: 'categoricals',
      categories: ['A', 'B', 'C'],
      accessor: (row: IDataRow) => (row as any).v,
    });
  });

  it('returns [0, 0, ""] for a row with no categories (missing)', () => {
    const row: IDataRow = { i: 0, v: null };
    expect(column.toCompareValue(row)).toEqual([0, 0, '']);
  });

  it('returns [0, 0, ""] for a row with an empty array', () => {
    const row: IDataRow = { i: 0, v: [] };
    expect(column.toCompareValue(row)).toEqual([0, 0, '']);
  });

  it('total count is the length of all categories including duplicates', () => {
    const row: IDataRow = { i: 0, v: ['A', 'A', 'B'] };
    const [totalCount] = column.toCompareValue(row) as [number, number, string];
    expect(totalCount).toBe(3);
  });

  it('secondary key is the number of unique categories', () => {
    const row: IDataRow = { i: 0, v: ['A', 'A', 'B'] };
    const [, uniqueCount] = column.toCompareValue(row) as [number, number, string];
    expect(uniqueCount).toBe(2);
  });

  it('rows with more total categories sort higher', () => {
    const rowFew: IDataRow = { i: 0, v: ['A'] };
    const rowMany: IDataRow = { i: 1, v: ['A', 'B', 'C'] };
    const [fewTotal] = column.toCompareValue(rowFew) as [number, number, string];
    const [manyTotal] = column.toCompareValue(rowMany) as [number, number, string];
    expect(manyTotal).toBeGreaterThan(fewTotal);
  });

  it('same total count: more unique categories ranks higher', () => {
    // 2 total each; one has duplicates (1 unique), other has 2 unique
    const rowDuplicate: IDataRow = { i: 0, v: ['A', 'A'] };
    const rowUnique: IDataRow = { i: 1, v: ['A', 'B'] };
    const [, dupUnique] = column.toCompareValue(rowDuplicate) as [number, number, string];
    const [, uniqueUnique] = column.toCompareValue(rowUnique) as [number, number, string];
    expect(uniqueUnique).toBeGreaterThan(dupUnique);
  });

  it('tie-break signature is stable and deterministic', () => {
    const rowA: IDataRow = { i: 0, v: ['A', 'B'] };
    const rowB: IDataRow = { i: 1, v: ['B', 'A'] }; // same categories, different order
    const sigA = (column.toCompareValue(rowA) as [number, number, string])[2];
    const sigB = (column.toCompareValue(rowB) as [number, number, string])[2];
    expect(sigA).toBe(sigB);
  });

  it('tie-break signature differs for different count distributions', () => {
    const rowMoreA: IDataRow = { i: 0, v: ['A', 'A', 'B'] }; // A:2, B:1 – 3 total, 2 unique
    const rowMoreB: IDataRow = { i: 1, v: ['A', 'B', 'B'] }; // A:1, B:2 – 3 total, 2 unique
    const sigA = (column.toCompareValue(rowMoreA) as [number, number, string])[2];
    const sigB = (column.toCompareValue(rowMoreB) as [number, number, string])[2];
    expect(sigA).not.toBe(sigB);
  });
});
