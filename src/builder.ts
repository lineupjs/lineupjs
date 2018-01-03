import {ILineUpOptions} from './interfaces';
import {Column, IColumnDesc} from './model';
import {deriveColumnDescriptions, IDataProviderOptions, ILocalDataProviderOptions} from './provider';
import LocalDataProvider from './provider/LocalDataProvider';
import LineUp from './ui/LineUp';
import Taggle from './ui/taggle/Taggle';

export default class Builder {
  private readonly columns: IColumnDesc[] = [];
  private readonly providerOptions: Partial<ILocalDataProviderOptions & IDataProviderOptions> = {
    columnTypes: {}
  };
  private readonly options: Partial<ILineUpOptions> =  {};

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

  noSidePanel() {
    this.options.panel = false;
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

  buildLineUp(node: HTMLElement) {
    return new LineUp(node, this.build());
  }

  buildTaggle(node: HTMLElement) {
    return new Taggle(node, this.build());
  }
}

export function data(arr: object[]) {
  return new Builder(arr);
}

export function derive(arr: object[]) {
  return data(arr).deriveColumns();
}

