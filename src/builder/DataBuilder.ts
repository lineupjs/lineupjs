import {IColumnDesc} from '../model';
import Column from '../model/Column';
import {deriveColors, deriveColumnDescriptions, IDataProviderOptions, ILocalDataProviderOptions} from '../provider';
import ADataProvider from '../provider/ADataProvider';
import LocalDataProvider from '../provider/LocalDataProvider';
import LineUp from '../ui/LineUp';
import Taggle from '../ui/taggle/Taggle';
import ColumnBuilder from './column/ColumnBuilder';
import LineUpBuilder from './LineUpBuilder';
import RankingBuilder from './RankingBuilder';

export default class DataBuilder extends LineUpBuilder {
  private readonly columns: IColumnDesc[] = [];
  private readonly providerOptions: Partial<ILocalDataProviderOptions & IDataProviderOptions> = {
    columnTypes: {}
  };

  private readonly rankBuilders: ((data: ADataProvider) => void)[] = [];

  constructor(private readonly data: object[]) {
    super();
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

  deriveColors() {
    deriveColors(this.columns);
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

  ranking(builder: ((data: ADataProvider)=>void)|RankingBuilder) {
    this.rankBuilders.push(builder instanceof RankingBuilder ? builder.build : builder);
    return this;
  }

  buildData() {
    const r = new LocalDataProvider(this.data, this.columns, this.providerOptions);
    this.rankBuilders.forEach((builder) => builder(r));
    return r;
  }

  build(node: HTMLElement) {
    return new LineUp(node, this.buildData(), this.options);
  }

  buildTaggle(node: HTMLElement) {
    return new Taggle(node, this.buildData(), this.options);
  }
}


export function builder(arr: object[]) {
  return new DataBuilder(arr);
}
