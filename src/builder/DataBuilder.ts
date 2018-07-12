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

/**
 * builder for a LocalDataProvider along with LineUp configuration options
 */
export default class DataBuilder extends LineUpBuilder {
  private readonly columns: (IColumnDesc | ((data: any[]) => IColumnDesc))[] = [];
  private readonly providerOptions: Partial<ILocalDataProviderOptions & IDataProviderOptions> = {
    columnTypes: {}
  };

  private readonly rankBuilders: ((data: ADataProvider) => void)[] = [];
  private _deriveColors: boolean = false;

  constructor(private readonly data: object[]) {
    super();
  }

  /**
   * allow just a single selection
   */
  singleSelection() {
    this.providerOptions.multiSelection = false;
    return this;
  }

  /**
   * filter all rankings by all filters in LineUp
   */
  filterGlobally() {
    this.providerOptions.filterGlobally = true;
    return this;
  }

  /**
   * no limits for the number of sorting and grouping criteria
   */
  noCriteriaLimits() {
    this.providerOptions.maxGroupColumns = Infinity;
    this.providerOptions.maxNestedSortingCriteria = Infinity;
    return this;
  }

  /**
   * limit the number of sort and grouping criterias i.e the nesting level
   * @param {number} sortingCritera
   * @param {number} groupingCriteria
   * @returns {this}
   */
  limitCriteria(sortingCritera: number, groupingCriteria: number) {
    this.providerOptions.maxGroupColumns = sortingCritera;
    this.providerOptions.maxNestedSortingCriteria = groupingCriteria;
    return this;
  }

  /**
   * triggers to derive the column descriptions for the given data
   * @param {string} columns optional enforced order of columns
   */
  deriveColumns(...columns: string[]) {
    this.columns.push(...deriveColumnDescriptions(this.data, {columns}));
    return this;
  }

  /**
   * tirggers to assign colors for the given descriptions
   */
  deriveColors() {
    this._deriveColors = true;
    return this;
  }

  /**
   * register another column type to this data provider
   * @param {string} type unique type id
   * @param {typeof Column} clazz column class
   */
  registerColumnType(type: string, clazz: typeof Column) {
    this.providerOptions.columnTypes![type] = clazz;
    return this;
  }

  /**
   * push another column description to this data provider
   * @param {IColumnDesc | ColumnBuilder} column column description or builder instance
   */
  column(column: IColumnDesc | ColumnBuilder) {
    this.columns.push(column instanceof ColumnBuilder ? column.build.bind(column) : column);
    return this;
  }

  /**
   * restores a given ranking dump
   * @param dump dump as created using '.dump()'
   */
  restore(dump: any) {
    this.rankBuilders.push((data) => data.restore(dump));
    return this;
  }

  /**
   * add the default ranking (all columns) to this data provider
   * @param {boolean} addSupportTypes add support types, too, default: true
   */
  defaultRanking(addSupportTypes: boolean = true) {
    this.rankBuilders.push((data) => data.deriveDefault(addSupportTypes));
    return this;
  }

  /**
   * add another ranking to this data provider
   * @param {((data: ADataProvider) => void) | RankingBuilder} builder ranking builder
   */
  ranking(builder: ((data: ADataProvider) => void) | RankingBuilder) {
    this.rankBuilders.push(builder instanceof RankingBuilder ? builder.build.bind(builder) : builder);
    return this;
  }

  /**
   * builds the data provider itself
   * @returns {LocalDataProvider}
   */
  buildData() {
    const columns = this.columns.map((d) => typeof d === 'function' ? d(this.data) : d);
    if (this._deriveColors) {
      deriveColors(columns);
    }
    const r = new LocalDataProvider(this.data, columns, this.providerOptions);
    if (this.rankBuilders.length === 0) {
      this.defaultRanking();
    }
    this.rankBuilders.forEach((builder) => builder(r));
    return r;
  }

  /**
   * builds LineUp at the given parent DOM node
   * @param {HTMLElement} node parent DOM node to attach
   * @returns {LineUp}
   */
  build(node: HTMLElement) {
    return new LineUp(node, this.buildData(), this.options);
  }

  /**
   * builds Taggle at the given parent DOM node
   * @param {HTMLElement} node parent DOM node to attach
   * @returns {Taggle}
   */
  buildTaggle(node: HTMLElement) {
    return new Taggle(node, this.buildData(), this.options);
  }
}


/**
 * creates a new builder instance for the given data
 * @param {object[]} arr data to visualize
 * @returns {DataBuilder}
 */
export function builder(arr: object[]) {
  return new DataBuilder(arr);
}
