import {IColumnDesc} from '../model';
import Column from '../model/Column';
import {deriveColumnDescriptions, IDataProviderOptions, ILocalDataProviderOptions} from '../provider';
import ADataProvider from '../provider/ADataProvider';
import LocalDataProvider from '../provider/LocalDataProvider';
import ColumnBuilder from './ColumnBuilder';

export default class DataBuilder {
  private readonly columns: IColumnDesc[] = [];
  private readonly providerOptions: Partial<ILocalDataProviderOptions & IDataProviderOptions> = {
    columnTypes: {}
  };

  private readonly rankBuilders: ((data: ADataProvider) => void)[] = [];

  constructor(private readonly data: object[]) {

  }

  filterGlobally() {
    this.providerOptions.filterGlobally = true;
    return this;
  }

  noCriteriaLimits() {
    this.providerOptions.maxGroupColumns = Infinity;
    this.providerOptions.maxNestedSortingCriteria = Infinity;
    return this;
  }

  deriveColumns() {
    this.columns.push(...deriveColumnDescriptions(this.data));
    return this;
  }

  registerColumnType(type: string, clazz: typeof Column) {
    this.providerOptions.columnTypes![type] = clazz;
  }

  column(column: IColumnDesc | ColumnBuilder) {
    this.columns.push(column instanceof ColumnBuilder ? column.build() : column);
    return this;
  }

  defaultRanking() {
    this.rankBuilders.push((data) => data.deriveDefault());
    return this;
  }

  build() {
    const r = new LocalDataProvider(this.data, this.columns, this.providerOptions);
    this.rankBuilders.forEach((builder) => builder(r));
    return r;
  }
}


export function data(arr: object[]) {
  return new DataBuilder(arr);
}

export function derive(arr: object[]) {
  return data(arr).deriveColumns();
}

