import {Column, IColumnDesc} from '../model';
import {DataProvider, LocalDataProvider, deriveColors, deriveColumnDescriptions, IDataProviderOptions, ILocalDataProviderOptions, IAggregationStrategy} from '../provider';
import {LineUp, Taggle} from '../ui';
import ColumnBuilder from './column/ColumnBuilder';
import LineUpBuilder from './LineUpBuilder';
import RankingBuilder from './RankingBuilder';

export * from './column';
export * from './RankingBuilder';

/**
 * builder for a LocalDataProvider along with LineUp configuration options
 */
export default class DataBuilder extends LineUpBuilder {
  private readonly columns: (IColumnDesc | ((data: any[]) => IColumnDesc))[] = [];
  private readonly providerOptions: Partial<ILocalDataProviderOptions & IDataProviderOptions> = {
    columnTypes: {}
  };

  private readonly rankBuilders: ((data: DataProvider) => void)[] = [];
  private _deriveColors: boolean = false;

  constructor(private readonly data: object[]) {
    super();
  }

  /**
   * use the schedulded task executor to asynchronously compute aggregations
   */
  scheduledTaskExecutor() {
    this.providerOptions.taskExecutor = 'scheduled';
    return this;
  }

  /**
   * when using a top-n strategy how many items should be shown
   */
  showTopN(n: number) {
    this.providerOptions.showTopN = n;
    return this;
  }

  /**
   * change the aggregation strategy that should be used when grouping by a column
   */
  aggregationStrategy(strategy: IAggregationStrategy) {
    this.providerOptions.aggregationStrategy = strategy;
    return this;
  }

  /**
   * allow just a single selection
   */
  singleSelection() {
    this.providerOptions.singleSelection = true;
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
   * triggers to derive the column descriptions for the given data
   * @param {string} columns optional enforced order of columns
   */
  deriveColumns(...columns: (string | string[])[]) {
    const cols = (<string[]>[]).concat(...columns);
    for (const c of deriveColumnDescriptions(this.data, {columns: cols})) {
      this.columns.push(c);
    }
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
  column(column: IColumnDesc | ColumnBuilder | ((data: any[]) => IColumnDesc)) {
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
   * @param {((data: DataProvider) => void) | RankingBuilder} builder ranking builder
   */
  ranking(builder: ((data: DataProvider) => void) | RankingBuilder) {
    this.rankBuilders.push(builder instanceof RankingBuilder ? builder.build.bind(builder) : builder);
    return this;
  }

  /**
   * builds the data provider itself
   * @returns {LocalDataProvider}
   */
  buildData() {
    // last come survived separted by label to be able to override columns
    const columns: IColumnDesc[] = [];
    const contained = new Set<string>();
    for (const col of this.columns) {
      const c = typeof col === 'function' ? col(this.data) : col;
      const key = `${c.type}@${c.label}`;
      if (!contained.has(key)) {
        columns.push(c);
        contained.add(key);
        continue;
      }
      const oldPos = columns.findIndex((d) => key === `${d.type}@${d.label}`);
      columns.splice(oldPos, 1, c); // replace with new one
    }
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


/**
 * build a new Taggle instance in the given node for the given data
 * @param {HTMLElement} node DOM node to attach to
 * @param {any[]} data data to visualize
 * @param {string[]} columns optional enforced column order
 * @returns {Taggle}
 */
export function asTaggle(node: HTMLElement, data: any[], ...columns: string[]): Taggle {
  return builder(data)
    .deriveColumns(columns)
    .deriveColors()
    .defaultRanking()
    .buildTaggle(node);
}

/**
 * build a new LineUp instance in the given node for the given data
 * @param {HTMLElement} node DOM node to attach to
 * @param {any[]} data data to visualize
 * @param {string[]} columns optional enforced column order
 * @returns {LineUp}
 */
export function asLineUp(node: HTMLElement, data: any[], ...columns: string[]): LineUp {
  return builder(data)
    .deriveColumns(columns)
    .deriveColors()
    .defaultRanking()
    .build(node);
}
