import {IColumnDesc} from '../model';
import Column from '../model/Column';
import {deriveColumnDescriptions, IDataProviderOptions, ILocalDataProviderOptions} from '../provider';
import LocalDataProvider from '../provider/LocalDataProvider';

export default class DataBuilder {
  private readonly columns: IColumnDesc[] = [];
  private readonly providerOptions: Partial<ILocalDataProviderOptions & IDataProviderOptions> = {
    columnTypes: {}
  };

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


  column(column: IColumnDesc) {
    this.columns.push(column);
    return this;
  }

  build() {
    return new LocalDataProvider(this.data, this.columns, this.providerOptions);
  }
}


export function data(arr: object[]) {
  return new DataBuilder(arr);
}

export function derive(arr: object[]) {
  return data(arr).deriveColumns();
}

