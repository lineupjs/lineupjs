import {ActionColumn, AggregateGroupColumn, AnnotateColumn, BooleanColumn, BooleansColumn, BoxPlotColumn, CategoricalColumn, CategoricalMapColumn, CategoricalsColumn, DateColumn, DatesColumn, DatesMapColumn, GroupColumn, HierarchyColumn, ImpositionBoxPlotColumn, ImpositionCompositeColumn, ImpositionCompositesColumn, LinkColumn, LinkMapColumn, LinksColumn, NestedColumn, NumberColumn, NumberMapColumn, NumbersColumn, OrdinalColumn, RankColumn, ReduceColumn, ScriptColumn, SelectionColumn, SetColumn, StackColumn, StringColumn, StringMapColumn, StringsColumn} from './';

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
