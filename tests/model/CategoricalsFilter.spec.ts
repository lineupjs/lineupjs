import CategoricalsColumn from '../../src/model/CategoricalsColumn';
import type { IDataRow } from '../../src/model/interfaces';

describe('Categoricals column filter modes', () => {
  describe('CategoricalsColumn', () => {
    let column: CategoricalsColumn;
    let rows: IDataRow[];

    beforeEach(() => {
      column = new CategoricalsColumn('c', {
        label: 'c',
        type: 'categoricals',
        categories: ['A', 'B', 'C'],
        accessor: (row: IDataRow) => (row as any).v,
      });

      rows = [
        { i: 0, v: ['A', 'B'] },
        { i: 1, v: ['A', 'B', 'C'] },
        { i: 2, v: ['A'] },
        { i: 3, v: [] },
        { i: 4, v: null },
      ];
    });

    it('mode=every requires all selected categories to be present', () => {
      column.setFilter({ filter: ['A', 'B', 'C'], filterMissing: true, mode: 'every' });
      const matches = rows.filter((r) => column.filter(r)).map((d) => d.i);
      expect(matches).toEqual([1]);
    });

    it('mode=some matches rows containing any selected category', () => {
      column.setFilter({ filter: ['B'], filterMissing: true, mode: 'some' });
      const matches = rows.filter((r) => column.filter(r)).map((d) => d.i);
      expect(matches).toEqual([0, 1]);
    });

    it('mode=every with empty selection matches no non-missing rows', () => {
      column.setFilter({ filter: [], filterMissing: true, mode: 'every' });
      const matches = rows.filter((r) => column.filter(r)).map((d) => d.i);
      expect(matches).toEqual([]);
    });
  });
});
