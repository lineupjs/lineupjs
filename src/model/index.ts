import Column from './Column';
import ValueColumn from './ValueColumn';
import {IValueColumnDesc} from './interfaces';

export * from './annotations';
export {isMissingValue, isUnknown, FIRST_IS_NAN, FIRST_IS_MISSING, missingGroup} from './missing';
export * from './interfaces';
export * from './ICategoricalColumn';
export * from './INumberColumn';
export * from './IDateColumn';
export * from './IArrayColumn';

export {ScaleMappingFunction, ScriptMappingFunction} from './MappingFunction';
export {DEFAULT_CATEGORICAL_COLOR_FUNCTION, ReplacmentColorMappingFunction} from './CategoricalColorMappingFunction';
export {CustomColorMappingFunction, DEFAULT_COLOR_FUNCTION, InterpolatingColorFunction, QuantizedColorFunction, SolidColorFunction} from './ColorMappingFunction';

export {default as ActionColumn} from './ActionColumn';
export * from './ActionColumn';
export {default as AggregateGroupColumn} from './AggregateGroupColumn';
export * from './AggregateGroupColumn';
export {default as AnnotateColumn} from './AnnotateColumn';
export * from './AnnotateColumn';
export {default as ArrayColumn} from './ArrayColumn';
export * from './ArrayColumn';
export {default as BooleanColumn} from './BooleanColumn';
export * from './BooleanColumn';
export {default as BooleansColumn} from './BooleansColumn';
export * from './BooleansColumn';
export {default as BoxPlotColumn} from './BoxPlotColumn';
export * from './BoxPlotColumn';
export {default as CategoricalColumn} from './CategoricalColumn';
export *from './CategoricalColumn';
export {default as CategoricalMapColumn} from './CategoricalMapColumn';
export * from './CategoricalMapColumn';
export {default as CategoricalsColumn} from './CategoricalsColumn';
export * from './CategoricalsColumn';
export {default, default as Column} from './Column';
// no * export
export {default as CompositeColumn} from './CompositeColumn';
// no * export
export {default as CompositeNumberColumn} from './CompositeNumberColumn';
export * from './CompositeNumberColumn';
export {default as DateColumn} from './DateColumn';
export * from './DateColumn';
export {default as DatesColumn} from './DatesColumn';
export * from './DatesColumn';
export {default as DatesMapColumn} from './DatesMapColumn';
export * from './DatesMapColumn';
export {default as DummyColumn} from './DummyColumn';
export * from './DummyColumn';
export {default as GroupColumn} from './GroupColumn';
export *from './GroupColumn';
export {default as HierarchyColumn} from './HierarchyColumn';
export * from './HierarchyColumn';
export {default as ImpositionBoxPlotColumn} from './ImpositionBoxPlotColumn';
export * from './ImpositionBoxPlotColumn';
export {default as ImpositionCompositeColumn} from './ImpositionCompositeColumn';
export * from './ImpositionCompositeColumn';
export {default as ImpositionCompositesColumn} from './ImpositionCompositesColumn';
export * from './ImpositionCompositesColumn';
export {default as LinkColumn} from './LinkColumn';
export * from './LinkColumn';
export {default as LinkMapColumn} from './LinkMapColumn';
export * from './LinkMapColumn';
export {default as LinksColumn} from './LinksColumn';
export * from './LinksColumn';
export {default as MapColumn} from './MapColumn';
export * from './MapColumn';
export {default as MultiLevelCompositeColumn} from './MultiLevelCompositeColumn';
export * from './MultiLevelCompositeColumn';
export {default as NestedColumn} from './NestedColumn';
export * from './NestedColumn';
export {default as NumberColumn} from './NumberColumn';
export * from './NumberColumn';
export {default as NumberMapColumn} from './NumberMapColumn';
export * from './NumberMapColumn';
export {default as NumbersColumn} from './NumbersColumn';
export * from './NumbersColumn';
export {default as OrdinalColumn} from './OrdinalColumn';
export * from './OrdinalColumn';
export {default as RankColumn} from './RankColumn';
export * from './RankColumn';
export {default as Ranking, EDirtyReason} from './Ranking';
// no * export
export {default as ReduceColumn} from './ReduceColumn';
export * from './ReduceColumn';
export {default as ScriptColumn} from './ScriptColumn';
export * from './ScriptColumn';
export {default as SelectionColumn} from './SelectionColumn';
export * from './SelectionColumn';
export {default as SetColumn} from './SetColumn';
export * from './SetColumn';
export {default as StackColumn} from './StackColumn';
export * from './StackColumn';
export {default as StringColumn} from './StringColumn';
export * from './StringColumn';
export {default as StringsColumn} from './StringsColumn';
export * from './StringsColumn';
export {default as StringMapColumn} from './StringMapColumn';
export * from './StringMapColumn';
export {default as ValueColumn} from './ValueColumn';
// no * export


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
