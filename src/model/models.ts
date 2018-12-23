import Column, {ActionColumn, AggregateGroupColumn, IValueColumnDesc, ValueColumn, AnnotateColumn, BooleanColumn, BooleansColumn, BoxPlotColumn, CategoricalColumn, CategoricalMapColumn, CategoricalsColumn, DateColumn, DatesMapColumn, DatesColumn, GroupColumn, HierarchyColumn, ImpositionCompositeColumn, ImpositionBoxPlotColumn, ImpositionCompositesColumn, ReduceColumn, NestedColumn, NumberColumn, NumbersColumn, NumberMapColumn, OrdinalColumn, RankColumn, ScriptColumn, SelectionColumn, SetColumn, StackColumn, StringColumn, StringMapColumn, StringsColumn, LinkColumn, LinkMapColumn, LinksColumn} from './';

/**
 * defines a new column type
 * @param name
 * @param functions
 * @returns {CustomColumn}
 */
export function defineColumn<T>(name: string, functions: any = {}): typeof Column {
  class CustomColumn extends ValueColumn<T> {
    constructor(id: string, desc: IValueColumnDesc<T>, ...args: any[]) {
      super(id, desc);
      if (typeof (this.init) === 'function') {
        this.init(id, desc, ...args);
      }
    }

    init(..._args: any[]) {
      // dummy
    }
  }

  CustomColumn.prototype.toString = () => name;
  CustomColumn.prototype = Object.assign(CustomColumn.prototype, functions);

  return CustomColumn;
}


/**
 * a map of all known column types
 */
export function models() {
  return {
    actions: ActionColumn,
    aggregate: AggregateGroupColumn,
    annotate: AnnotateColumn,
    boolean: BooleanColumn,
    booleans: BooleansColumn,
    boxplot: BoxPlotColumn,
    categorical: CategoricalColumn,
    categoricalMap: CategoricalMapColumn,
    categoricals: CategoricalsColumn,
    date: DateColumn,
    dateMap: DatesMapColumn,
    dates: DatesColumn,
    group: GroupColumn,
    hierarchy: HierarchyColumn,
    imposition: ImpositionCompositeColumn,
    impositionBoxPlot: ImpositionBoxPlotColumn,
    impositions: ImpositionCompositesColumn,
    reduce: ReduceColumn,
    nested: NestedColumn,
    number: NumberColumn,
    numbers: NumbersColumn,
    numberMap: NumberMapColumn,
    ordinal: OrdinalColumn,
    rank: RankColumn,
    script: ScriptColumn,
    selection: SelectionColumn,
    set: SetColumn,
    stack: StackColumn,
    string: StringColumn,
    stringMap: StringMapColumn,
    strings: StringsColumn,
    link: LinkColumn,
    linkMap: LinkMapColumn,
    links: LinksColumn
  };
}
