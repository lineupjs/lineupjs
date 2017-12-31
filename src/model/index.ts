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
import CategoricalNumberColumn from './CategoricalNumberColumn';
import DateColumn from './DateColumn';
import GroupColumn from './GroupColumn';
import HierarchyColumn from './HierarchyColumn';
import ImpositionCompositeColumn from './ImpositionCompositeColumn';
import LinkColumn from './LinkColumn';
import MaxColumn from './MaxColumn';
import MeanColumn from './MeanColumn';
import MinColumn from './MinColumn';
import NestedColumn from './NestedColumn';
import NumberColumn from './NumberColumn';
import NumbersColumn from './NumbersColumn';
import RankColumn from './RankColumn';
import ScriptColumn from './ScriptColumn';
import SelectionColumn from './SelectionColumn';
import StackColumn from './StackColumn';
import StringColumn from './StringColumn';
import ValueColumn, {IValueColumnDesc} from './ValueColumn';

export {default, default as Column, IColumnDesc, IColumnMetaData, IColumnParent, IFlatColumn} from './Column';
export {default as CompositeColumn} from './CompositeColumn';
export {createMappingFunction, ScaleMappingFunction, ScriptMappingFunction} from './MappingFunction';
export {IDataRow, IGroup, IGroupData, IGroupItem, isGroup, IGroupParent, isSupportType} from './interfaces';
export {isNumberColumn, INumberColumn, INumbersColumn, isNumbersColumn} from './INumberColumn';
export {isCategoricalColumn, ICategoricalColumn, ICategory} from './ICategoricalColumn';
export {default as Ranking} from './Ranking';
export {createDesc as createMinDesc} from './MinColumn';
export {createDesc as createMaxDesc} from './MaxColumn';
export {createDesc as createMeanDesc} from './MeanColumn';
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
    number: NumberColumn,
    date: DateColumn,
    image: LinkColumn,
    numbers: NumbersColumn,
    string: StringColumn,
    link: LinkColumn,
    stack: StackColumn,
    rank: RankColumn,
    boolean: BooleanColumn,
    booleans: BooleansColumn,
    categorical: CategoricalColumn,
    ordinal: CategoricalNumberColumn,
    actions: ActionColumn,
    annotate: AnnotateColumn,
    selection: SelectionColumn,
    max: MaxColumn,
    min: MinColumn,
    mean: MeanColumn,
    script: ScriptColumn,
    nested: NestedColumn,
    boxplot: BoxPlotColumn,
    aggregate: AggregateGroupColumn,
    hierarchy: HierarchyColumn,
    imposition: ImpositionCompositeColumn,
    group: GroupColumn
  };
}
