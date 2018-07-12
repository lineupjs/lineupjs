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

export {isSupportType, Category, SupportType, SortByDefault, Categories, toolbar, dialogAddons} from './annotations';
export {isMissingValue, isUnknown, FIRST_IS_NAN, FIRST_IS_MISSING, missingGroup} from './missing';
export * from './Group';
export * from './interfaces';
export * from './ICategoricalColumn';
export * from './INumberColumn';
export * from './IArrayColumn';
export * from './MappingFunction';

export {default as ActionColumn} from './ActionColumn';
export * from './ActionColumn';
export {default as AggregateGroupColumn, createAggregateDesc, IAggregateGroupColumnDesc} from './AggregateGroupColumn';
export {default as AnnotateColumn} from './AnnotateColumn';
export {default as ArrayColumn, IArrayColumnDesc, IArrayDesc, ISplicer} from './ArrayColumn';
export {default as BooleanColumn, IBooleanColumnDesc, IBooleanDesc} from './BooleanColumn';
export * from './BooleansColumn';
export {default as BooleansColumn} from './BooleansColumn';
export {default as BoxPlotColumn, IBoxPlotColumnDesc, IBoxPlotDesc} from './BoxPlotColumn';
export {default as CategoricalColumn} from './CategoricalColumn';
export * from './CategoricalMapColumn';
export {default as CategoricalMapColumn} from './CategoricalMapColumn';
export * from './CategoricalsColumn';
export {default as CategoricalsColumn} from './CategoricalsColumn';
export {default, default as Column, IFlatColumn, IColumnParent, IColumnMetaData, IColumnDesc} from './Column';
export {default as CompositeColumn, isMultiLevelColumn, IMultiLevelColumn} from './CompositeColumn';
export * from './CompositeNumberColumn';
export {default as CompositeNumberColumn} from './CompositeNumberColumn';
export * from './DateColumn';
export {default as DateColumn} from './DateColumn';
export * from './DatesMapColumn';
export {default as DatesMapColumn} from './DatesMapColumn';
export * from './DummyColumn';
export {default as DummyColumn} from './DummyColumn';
export {default as GroupColumn, createGroupDesc, EGroupSortMethod} from './GroupColumn';
export {default as HierarchyColumn, ICategoryNode, IPartialCategoryNode, IHierarchyColumnDesc, IHierarchyDesc, ICategoryInternalNode, ICutOffNode} from './HierarchyColumn';
export * from './ImpositionBoxPlotColumn';
export {default as ImpositionBoxPlotColumn} from './ImpositionBoxPlotColumn';
export * from './ImpositionCompositeColumn';
export {default as ImpositionCompositeColumn} from './ImpositionCompositeColumn';
export * from './ImpositionCompositesColumn';
export {default as ImpositionCompositesColumn} from './ImpositionCompositesColumn';
export * from './MapColumn';
export {default as MapColumn} from './MapColumn';
export {default as MultiLevelCompositeColumn} from './MultiLevelCompositeColumn';
export * from './NestedColumn';
export {default as NestedColumn} from './NestedColumn';
export {default as NumberColumn, INumberColumnDesc, INumberColumn, isNumberColumn} from './NumberColumn';
export {default as NumberMapColumn, INumberMapDesc, INumberMapColumnDesc} from './NumberMapColumn';
export {default as NumbersColumn, INumbersDesc, INumbersColumnDesc} from './NumbersColumn';
export {default as OrdinalColumn, ICategoricalNumberColumnDesc} from './OrdinalColumn';
export * from './RankColumn';
export {default as RankColumn} from './RankColumn';
export {default as Ranking, ISortCriteria} from './Ranking';
export {default as ReduceColumn, createReduceDesc, IReduceDesc, IReduceColumnDesc} from './ReduceColumn';
export {default as ScriptColumn, createScriptDesc, IScriptDesc, IScriptColumnDesc} from './ScriptColumn';
export {default as SelectionColumn, createSelectionDesc, ISelectionColumnDesc} from './SelectionColumn';
export * from './SetColumn';
export {default as SetColumn} from './SetColumn';
export {default as StackColumn, createStackDesc} from './StackColumn';
export {default as StringColumn, EAlignment, IStringDesc, IStringColumnDesc} from './StringColumn';
export * from './StringMapColumn';
export {default as StringMapColumn} from './StringMapColumn';
export * from './StringsColumn';
export {default as StringsColumn} from './StringsColumn';
export {default as ValueColumn, IValueColumnDesc} from './ValueColumn';

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
