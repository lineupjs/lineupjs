import {createAggregateDesc, createRankDesc, createSelectionDesc, IColumnDesc, IDataRow, isSupportType} from '../model';
import {IOrderedGroup} from '../model/Group';
import Ranking from '../model/Ranking';
import ADataProvider, {IDataProviderOptions} from './ADataProvider';
import {IDataProviderDump} from './interfaces';


function isComplexAccessor(column: any) {
  // something like a.b or a[4]
  return typeof column === 'string' && column.includes('.');
}

function rowComplexGetter(row: IDataRow, _id: string, desc: any) {
  const column = desc.column;
  if (row.hasOwnProperty(column)) { // well complex but a direct hit
    return row.v[column];
  }
  const resolve = (obj: any, col: string) => {
    if (obj === undefined) {
      return obj; // propagate invalid values
    }
    if (/\d+/.test(col)) { // index
      return obj[+col];
    }
    return obj[col];
  };
  return column.split('.').reduce(resolve, row.v);
}

function rowGetter(row: IDataRow, _id: string, desc: any) {
  return row.v[desc.column];
}

function rowGuessGetter(row: IDataRow, _id: string, desc: any) {
  const column = desc.column;
  if (isComplexAccessor(column)) {
    return rowComplexGetter(row, _id, desc);
  }
  return rowGetter(row, _id, desc);
}

/**
 * common base implementation of a DataProvider with a fixed list of column descriptions
 */
abstract class ACommonDataProvider extends ADataProvider {

  private rankingIndex = 0;

  constructor(private columns: IColumnDesc[] = [], options: Partial<IDataProviderOptions> = {}) {
    super(options);
    //generate the accessor
    columns.forEach((d: any) => {
      d.accessor = d.accessor || (d.column ? (isComplexAccessor(d.column) ? rowComplexGetter : rowGetter) : rowGuessGetter);
      d.label = d.label || d.column;
    });
  }

  protected rankAccessor(row: IDataRow, _id: string, _desc: IColumnDesc, ranking: Ranking) {
    const groups = ranking.getGroups();
    for (const group of groups) {
      const rank = group.index2pos[row.i];
      if (typeof rank === 'number') {
        return rank + 1; // starting with 1
      }
    }
    return -1;
  }

  /**
   * returns the maximal number of nested/hierarchical sorting criteria
   * @return {number}
   */
  protected getMaxNestedSortingCriteria() {
    return 1;
  }

  protected getMaxGroupColumns() {
    return 1;
  }

  cloneRanking(existing?: Ranking) {
    const id = this.nextRankingId();
    const clone = new Ranking(id, this.getMaxNestedSortingCriteria(), this.getMaxGroupColumns());

    if (existing) { //copy the ranking of the other one
      //TODO better cloning
      existing.children.forEach((child) => {
        this.push(clone, child.desc);
      });
    }

    return clone;
  }

  sort(ranking: Ranking): Promise<IOrderedGroup[]> | IOrderedGroup[] {
    //use the server side to sort
    return this.sortImpl(ranking);
  }

  protected abstract sortImpl(ranking: Ranking): Promise<IOrderedGroup[]> | IOrderedGroup[];

  /**
   * adds another column description to this data provider
   * @param column
   */
  pushDesc(column: IColumnDesc) {
    const d: any = column;
    d.accessor = d.accessor || rowGetter;
    d.label = column.label || d.column;
    this.columns.push(column);
    this.fire(ADataProvider.EVENT_ADD_DESC, d);
  }

  clearColumns() {
    this.clearRankings();
    this.columns.splice(0, this.columns.length);
    this.fire(ADataProvider.EVENT_CLEAR_DESC);
  }

  getColumns(): IColumnDesc[] {
    return this.columns.slice();
  }

  findDesc(ref: string) {
    return this.columns.filter((c) => (<any>c).column === ref)[0];
  }

  /**
   * identify by the tuple type@columnname
   * @param desc
   * @returns {string}
   */
  toDescRef(desc: any): any {
    return typeof desc.column !== 'undefined' ? `${desc.type}@${desc.column}` : this.cleanDesc(Object.assign(desc));
  }

  /**
   * generates a default ranking by using all column descriptions ones
   */
  deriveDefault(addSupportType: boolean = true) {
    const r = this.pushRanking();
    if (addSupportType) {
      if (this.getMaxGroupColumns() > 0) {
        r.push(this.create(createAggregateDesc())!);
      }
      r.push(this.create(createRankDesc())!);
      if (this.multiSelections) {
        r.push(this.create(createSelectionDesc())!);
      }
    }
    this.getColumns().forEach((col) => {
      const c = this.create(col);
      if (!c || isSupportType(c)) {
        return;
      }
      r.push(c);
    });
    return r;
  }

  fromDescRef(descRef: any): any {
    if (typeof (descRef) === 'string') {
      return this.columns.find((d: any) => `${d.type}@${d.column}` === descRef || d.type === descRef);
    }
    const existing = this.columns.find((d) => descRef.column === (<any>d).column && descRef.label === d.label && descRef.type === d.type);
    if (existing) {
      return existing;
    }
    return descRef;
  }

  restore(dump: IDataProviderDump) {
    super.restore(dump);
    this.rankingIndex = 1 + Math.max(...this.getRankings().map((r) => +r.id.substring(4)));
  }

  nextRankingId() {
    return `rank${this.rankingIndex++}`;
  }
}

export default ACommonDataProvider;
