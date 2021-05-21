import { IColumnDesc, Ranking } from '../model';
import ADataProvider from './ADataProvider';
import type { IDataProviderDump, IDataProviderOptions } from './interfaces';
import { isComplexAccessor, rowGetter, rowComplexGetter, rowGuessGetter } from '../internal';

function injectAccessor(d: any) {
  d.accessor = d.accessor || (d.column ? (isComplexAccessor(d.column) ? rowComplexGetter : rowGetter) : rowGuessGetter);
  d.label = d.label || d.column;
  return d;
}

/**
 * common base implementation of a DataProvider with a fixed list of column descriptions
 */
abstract class ACommonDataProvider extends ADataProvider {
  private rankingIndex = 0;

  constructor(private columns: IColumnDesc[] = [], options: Partial<IDataProviderOptions> = {}) {
    super(options);
    //generate the accessor
    columns.forEach(injectAccessor);
  }

  cloneRanking(existing?: Ranking) {
    const id = this.nextRankingId();
    const clone = new Ranking(id);

    if (existing) {
      //copy the ranking of the other one
      //TODO better cloning
      existing.children.forEach((child) => {
        this.push(clone, child.desc);
      });
    }

    return clone;
  }

  /**
   * adds another column description to this data provider
   * @param column
   */
  pushDesc(column: IColumnDesc) {
    injectAccessor(column);
    this.columns.push(column);
    this.fire(ADataProvider.EVENT_ADD_DESC, column);
  }

  clearColumns() {
    this.clearRankings();
    this.columns.splice(0, this.columns.length);
    this.fire(ADataProvider.EVENT_CLEAR_DESC);
  }

  /**
   * Remove the given column description from the data provider.
   * Column descriptions that are in use (i.e., has column instances in a ranking) cannot be removed by default.
   * Skip the check by setting the `ignoreBeingUsed` parameter to `true`.
   *
   * @param column Column description
   * @param ignoreBeingUsed Flag whether to ignore the usage of the column descriptions in rankings
   */
  removeDesc(column: IColumnDesc, ignoreBeingUsed = false): boolean {
    const i = this.columns.indexOf(column);
    if (i < 0) {
      return false;
    }
    const isUsed = ignoreBeingUsed
      ? false
      : this.getRankings().some((d) => d.flatColumns.some((c) => c.desc === column));
    if (isUsed) {
      return false;
    }
    this.columns.splice(i, 1);
    this.fire(ADataProvider.EVENT_REMOVE_DESC, column);
    return true;
  }

  getColumns(): IColumnDesc[] {
    return this.columns.slice();
  }

  findDesc(ref: string) {
    return this.columns.filter((c) => (c as any).column === ref)[0];
  }

  /**
   * identify by the tuple type@columnname
   * @param desc
   * @returns {string}
   */
  toDescRef(desc: any): any {
    return typeof desc.column !== 'undefined' ? `${desc.type}@${desc.column}` : this.cleanDesc(Object.assign({}, desc));
  }

  fromDescRef(descRef: any): any {
    if (typeof descRef === 'string') {
      return this.columns.find((d: any) => `${d.type}@${d.column}` === descRef || d.type === descRef);
    }
    const existing = this.columns.find(
      (d) => descRef.column === (d as any).column && descRef.label === d.label && descRef.type === d.type
    );
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
