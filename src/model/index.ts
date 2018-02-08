import ActionColumn from './ActionColumn';
import AggregateGroupColumn from './AggregateGroupColumn';
import AnnotateColumn from './AnnotateColumn';
import BooleanColumn from './BooleanColumn';
import BooleansColumn from './BooleansColumn';
import BoxPlotColumn from './BoxPlotColumn';
import CategoricalColumn from './CategoricalColumn';
import CategoricalMapColumn from './CategoricalMapColumn';
import CategoricalsColumn from './CategoricalsColumn';
import Column from './Column';
import DateColumn from './DateColumn';
import DatesColumn from './DatesColumn';
import DatesMapColumn from './DatesMapColumn';
import GroupColumn from './GroupColumn';
import HierarchyColumn from './HierarchyColumn';
import ImpositionCompositeColumn from './ImpositionCompositeColumn';
import ImpositionCompositesColumn from './ImpositionCompositesColumn';
import NestedColumn from './NestedColumn';
import NumberColumn from './NumberColumn';
import NumberMapColumn from './NumberMapColumn';
import NumbersColumn from './NumbersColumn';
import OrdinalColumn from './OrdinalColumn';
import RankColumn from './RankColumn';
import ReduceColumn from './ReduceColumn';
import ScriptColumn from './ScriptColumn';
import SelectionColumn from './SelectionColumn';
import SetColumn from './SetColumn';
import StackColumn from './StackColumn';
import StringColumn from './StringColumn';
import StringMapColumn from './StringMapColumn';
import StringsColumn from './StringsColumn';
import ValueColumn, {IValueColumnDesc} from './ValueColumn';
import ImpositionBoxPlotColumn from './ImpositionBoxPlotColumn';

export {isSupportType, Category, SupportType} from './annotations';
export {isMissingValue, isUnknown, FIRST_IS_NAN, missingGroup} from './missing';
export * from './Group';
export * from './interfaces';
export * from './ICategoricalColumn';
export * from './INumberColumn';
export * from './IArrayColumn';

export * from './ActionColumn';
export * from './AggregateGroupColumn';
export * from './AnnotateColumn';
export * from './ArrayColumn';
export * from './BooleanColumn';
export * from './BooleansColumn';
export * from './BoxPlotColumn';
export * from './CategoricalColumn';
export * from './CategoricalMapColumn';
export * from './CategoricalsColumn';
export * from './Column';
export * from './CompositeColumn';
export * from './CompositeNumberColumn';
export * from './DateColumn';
export * from './DatesMapColumn';
export * from './DummyColumn';
export * from './GroupColumn';
export * from './HierarchyColumn';
export * from './ImpositionBoxPlotColumn';
export * from './ImpositionCompositeColumn';
export * from './ImpositionCompositesColumn';
export * from './MapColumn';
export * from './MappingFunction';
export * from './MultiLevelCompositeColumn';
export * from './NestedColumn';
export * from './NumberColumn';
export * from './NumberMapColumn';
export * from './NumbersColumn';
export * from './OrdinalColumn';
export * from './RankColumn';
export * from './Ranking';
export * from './ReduceColumn';
export * from './ScriptColumn';
export * from './SelectionColumn';
export * from './SetColumn';
export * from './StackColumn';
export * from './StringColumn';
export * from './StringMapColumn';
export * from './StringsColumn';
export * from './ValueColumn';
export {default} from './Column';

export {default as ActionColumn} from './ActionColumn';
export {default as AggregateGroupColumn} from './AggregateGroupColumn';
export {default as AnnotateColumn} from './AnnotateColumn';
export {default as ArrayColumn} from './ArrayColumn';
export {default as BooleanColumn} from './BooleanColumn';
export {default as BooleansColumn} from './BooleansColumn';
export {default as BoxPlotColumn} from './BoxPlotColumn';
export {default as CategoricalColumn} from './CategoricalColumn';
export {default as CategoricalMapColumn} from './CategoricalMapColumn';
export {default as CategoricalsColumn} from './CategoricalsColumn';
export {default as Column} from './Column';
export {default as CompositeColumn} from './CompositeColumn';
export {default as CompositeNumberColumn} from './CompositeNumberColumn';
export {default as DateColumn} from './DateColumn';
export {default as DatesMapColumn} from './DatesMapColumn';
export {default as DummyColumn} from './DummyColumn';
export {default as GroupColumn} from './GroupColumn';
export {default as HierarchyColumn} from './HierarchyColumn';
export {default as ImpositionBoxPlotColumn} from './ImpositionBoxPlotColumn';
export {default as ImpositionCompositeColumn} from './ImpositionCompositeColumn';
export {default as ImpositionCompositesColumn} from './ImpositionCompositesColumn';
export {default as MapColumn} from './MapColumn';
export {default as MultiLevelCompositeColumn} from './MultiLevelCompositeColumn';
export {default as NestedColumn} from './NestedColumn';
export {default as NumberColumn} from './NumberColumn';
export {default as NumberMapColumn} from './NumberMapColumn';
export {default as NumbersColumn} from './NumbersColumn';
export {default as OrdinalColumn} from './OrdinalColumn';
export {default as RankColumn} from './RankColumn';
export {default as Ranking} from './Ranking';
export {default as ReduceColumn} from './ReduceColumn';
export {default as ScriptColumn} from './ScriptColumn';
export {default as SelectionColumn} from './SelectionColumn';
export {default as SetColumn} from './SetColumn';
export {default as StackColumn} from './StackColumn';
export {default as StringColumn} from './StringColumn';
export {default as StringMapColumn} from './StringMapColumn';
export {default as StringsColumn} from './StringsColumn';
export {default as ValueColumn} from './ValueColumn';

/**
 * defines a new column type
 * @param name
 * @param functions
 * @returns {CustomColumn}
 */
export function defineColumn<T>(name: string, functions: any = {}): typeof Column {
  class CustomColumn extends ValueColumn<T> {
    constructor(id: string, desc: IValueColumnDesc<T>) {
      super(id, desc);
      if (typeof (this.init) === 'function') {
        this.init.apply(this, [].slice.apply(arguments));
      }
    }

    init() {
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
    strings: StringsColumn
  };
}
