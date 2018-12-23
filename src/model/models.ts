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
import LinkColumn from './LinkColumn';
import LinkMapColumn from './LinkMapColumn';
import LinksColumn from './LinksColumn';

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
