import ActionColumn from './ActionColumn';
import AggregateGroupColumn from './AggregateGroupColumn';
import AnnotateColumn from './AnnotateColumn';
import BooleanColumn from './BooleanColumn';
import BooleansColumn from './BooleansColumn';
import BoxPlotColumn from './BoxPlotColumn';
import CategoricalColumn from './CategoricalColumn';
import CategoricalMapColumn from './CategoricalMapColumn';
import CategoricalsColumn from './CategoricalsColumn';
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
import Column from './Column';

export {isSupportType, Category, SupportType} from './annotations';
export * from './Group';
export * from './interfaces';
export * from './ICategoricalColumn';
export * from './INumberColumn';
export * from './IArrayColumn';
export {isMissingValue, isUnknown, FIRST_IS_NAN, missingGroup } from './missing';
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
export {default, default as Column} from './Column';
export * from './CompositeColumn';
export * from './CompositeNumberColumn';
export * from './DateColumn';
export * from './DatesMapColumn';
export * from './DummyColumn';
export * from './GroupColumn';
export * from './HierarchyColumn';
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
