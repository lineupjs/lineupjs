/**
 * Created by Samuel Gratzl on 06.08.2015.
 */

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

export {default, default as Column, IColumnDesc, IColumnMetaData, IColumnParent, IFlatColumn} from './Column';
export {default as CompositeColumn} from './CompositeColumn';
export {createMappingFunction, ScaleMappingFunction, ScriptMappingFunction} from './MappingFunction';
export {IDataRow, IGroup, IGroupData, IGroupItem, isGroup, IGroupParent, isSupportType} from './interfaces';
export {isNumberColumn, INumberColumn} from './INumberColumn';
export {isCategoricalColumn, ICategoricalColumn, ICategory} from './ICategoricalColumn';
export {default as Ranking} from './Ranking';
export {createDesc as createReduceDesc} from './ReduceColumn';
export {createDesc as createRankDesc} from './RankColumn';
export {createDesc as createSelectionDesc} from './SelectionColumn';
export {createDesc as createScriptDesc} from './ScriptColumn';
export {createDesc as createNestedDesc} from './NestedColumn';
export {createDesc as createStackDesc} from './StackColumn';
export {createDesc as createActionDesc} from './ActionColumn';
export {createDesc as createAggregateDesc} from './AggregateGroupColumn';
export {createDesc as createImpositionDesc} from './ImpositionCompositeColumn';
export {createDesc as createGroupDesc} from './GroupColumn';
export {isMissingValue, isUnknown} from './missing';

/**
 * defines a new column type
 * @param name
 * @param functions
 * @returns {CustomColumn}
 */
export function defineColumn<T>(name: string, functions: any = {}) {
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
