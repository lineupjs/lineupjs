import {ISortCriteria} from '../model';
import Column from '../model/Column';
import Ranking from '../model/Ranking';
import ADataProvider from '../provider/ADataProvider';

export default class RankingBuilder {
  private readonly columns: string[] = [];
  private readonly sort: { column: string, asc: boolean }[] = [];
  private readonly group: string[] = [];
  private all = false;

  sortBy(column: string, asc: boolean = true) {
    this.sort.push({column, asc});
    return this;
  }

  groupBy(...columns: string[]) {
    this.group.push(...columns);
    return this;
  }

  column(column: string) {
    this.columns.push(column);
    return this;
  }

  allColumns() {
    this.all = true;
    return this;
  }

  build(): (data: ADataProvider) => Ranking {
    return (data: ADataProvider) => {
      const r = data.pushRanking();
      const cols = data.getColumns();

      const addColumn = (c: string) => {
        const desc = cols.find((d) => d.label === c || (<any>d).column === c);
        if (desc) {
          data.push(r, desc);
        } else {
          console.warn('invalid column: ', c);
        }
      };

      if (this.all) {
        cols.forEach((col) => data.push(r, col));
      } else {
        this.columns.forEach(addColumn);
        const cols = new Set(this.columns);
        this.group.concat(this.sort.map((d) => d.column)).forEach((c) => {
          if (cols.has(c)) {
            return;
          }
          cols.add(c);
          addColumn(c);
        });
      }
      const children = r.children;
      {
        const groups: Column[] = [];
        this.group.forEach((column) => {
          const col = children.find((d) => d.desc.label === column || (<any>d).desc.column === column);
          if (col) {
            groups.push(col);
          } else {
            console.warn('invalid group criteria: ', column);
          }
        });
        if (groups.length > 0) {
          r.setGroupCriteria(groups);
        }
      }
      {
        const sorts: ISortCriteria[] = [];
        this.sort.forEach(({column, asc}) => {
          const col = children.find((d) => d.desc.label === column || (<any>d).desc.column === column);
          if (col) {
            sorts.push({col, asc});
          } else {
            console.warn('invalid sort criteria: ', column);
          }
        });
        if (sorts.length > 0) {
          r.setSortCriteria(sorts);
        }
      }
      return r;
    };
  }
}

export function buildRanking() {
  return new RankingBuilder();
}
