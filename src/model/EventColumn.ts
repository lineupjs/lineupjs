import { Category, SortByDefault, dialogAddons, toolbar } from './annotations';
import Column, {
  dirty,
  dirtyCaches,
  dirtyHeader,
  dirtyValues,
  groupRendererChanged,
  labelChanged,
  metaDataChanged,
  rendererTypeChanged,
  summaryRendererChanged,
  visibilityChanged,
  widthChanged,
} from './Column';
import { zoomIdentity } from 'd3-zoom';
import { schemeSet1 } from 'd3-scale-chromatic';
import type { EAdvancedSortMethod, IColorMappingFunction, IMappingFunction, INumberFilter } from './INumberColumn';
import type { IMapColumnDesc } from './MapColumn';
import type { ICategoricalColorMappingFunction, ICategory } from './ICategoricalColumn';
import MapColumn from './MapColumn';
import NumberColumn from './NumberColumn';
import CategoricalColumn from './CategoricalColumn';
import { DEFAULT_CATEGORICAL_COLOR_FUNCTION } from './CategoricalColorMappingFunction';
import { ECompareValueType, type IDataRow, type ITypeFactory } from './interfaces';
import type { IKeyValue } from './IArrayColumn';
import type { dataLoaded } from './ValueColumn';
import type ValueColumn from './ValueColumn';
import type { IEventListener } from '../internal';
import { integrateDefaults } from './internal';

export interface IEventBoxplotData {
  min: number;
  max: number;
  median: number;
  q1: number;
  q3: number;
  outliers: number[];
}

export enum IEventBoxplotDataKeys {
  min = 'min',
  q1 = 'q1',
  median = 'median',
  q3 = 'q3',
  max = 'max',
}

/**
 * emitted when the mapping property changes
 * @asMemberOf NumberMapColumn
 * @event
 */
export declare function mappingChangedNMC(previous: IMappingFunction, current: IMappingFunction): void;
/**
 * emitted when the color mapping property changes
 * @asMemberOf NumberMapColumn
 * @event
 */
export declare function colorMappingChangedNMC(previous: IColorMappingFunction, current: IColorMappingFunction): void;

/**
 * emitted when the sort method property changes
 * @asMemberOf NumberMapColumn
 * @event
 */
export declare function sortMethodChangedNMC(previous: EAdvancedSortMethod, current: EAdvancedSortMethod): void;

/**
 * emitted when the filter property changes
 * @asMemberOf NumberMapColumn
 * @event
 */
export declare function filterChangedNMC(previous: INumberFilter | null, current: INumberFilter | null): void;

export declare type IEventColumnDesc = IMapColumnDesc<number> & {
  boxplotPossible?: boolean;
  boxPlotReferenceColumn?: string;
  displayEventList?: string[];
  eventList: string[];
  eventScaleMax?: number;
  eventScaleMin?: number;
  heatmapBinCount?: number;
  legendUpdateCallback?: (categories: ICategory[]) => void;
  msPerUnit?: number;
  referenceEvent?: string;
  sortEvent?: string;
  // tooltipServiceWrapper?: ITooltipServiceWrapper;
};

@toolbar('rename', 'sort', 'sortBy', 'eventSettings', 'colorMappedCategorical')
@dialogAddons('sort', 'eventSort')
@Category('event')
@SortByDefault('descending')
export default class EventColumn extends MapColumn<number> {
  static readonly CURRENT_DATE_REFERENCE = 'Current Date';

  static readonly BOXPLOT_DEFAULT_COLOR = '#ff7f00';

  static readonly BOXPLOT_COLOR_NAME = 'boxplotColor';

  static readonly EVENT_MAPPING_CHANGED = NumberColumn.EVENT_MAPPING_CHANGED;

  static readonly EVENT_COLOR_MAPPING_CHANGED = CategoricalColumn.EVENT_COLOR_MAPPING_CHANGED;

  static readonly EVENT_SORTMETHOD_CHANGED = NumberColumn.EVENT_SORTMETHOD_CHANGED;

  static readonly EVENT_FILTER_CHANGED = NumberColumn.EVENT_FILTER_CHANGED;

  private sortEvent: string;

  private colorMapping: ICategoricalColorMappingFunction;

  private boxplotReferenceColumn: string;

  private displayEventList: string[] = [];

  private displayEventListOverview: string[] = [];

  private eventListOverview: string[] = [];

  private eventList: string[] = [];

  private categories: ICategory[];

  private readonly boxplotPossible: boolean;

  private legendUpdateCallback: (
    categories: ICategory[],
    colorMapping: ICategoricalColorMappingFunction,
    boxPlotlabel?: string,
    boxPlotColor?: string
  ) => void;

  // private tooltipServiceWrapper: ITooltipServiceWrapper;

  private scaleMin: number;

  private scaleMax: number;

  private scaleMinBound: number;

  private scaleMaxBound: number;

  private referenceEvent: string;

  private msPerUnit: number;

  transform = zoomIdentity;
  private showBoxplot: boolean;
  private heatmapBinCount: number = 50;

  constructor(id: string, desc: Readonly<IEventColumnDesc>) {
    super(
      id,
      integrateDefaults(desc, {
        renderer: 'event',
        groupRenderer: 'event',
        summaryRenderer: 'event',
      })
    );
    this.boxplotReferenceColumn = desc.boxPlotReferenceColumn || EventColumn.CURRENT_DATE_REFERENCE;
    this.scaleMinBound = desc.eventScaleMin || -Infinity;
    this.scaleMaxBound = desc.eventScaleMax || Infinity;
    this.heatmapBinCount = desc.heatmapBinCount || 50;
    this.boxplotPossible = desc.boxplotPossible || false;
    this.showBoxplot = this.boxplotPossible;
    this.eventList = desc.eventList || [];
    this.displayEventList = desc.displayEventList || [...this.eventList];
    this.displayEventListOverview = [...this.displayEventList];
    this.eventListOverview = [...this.eventList];
    this.legendUpdateCallback = desc.legendUpdateCallback || null;
    // this.tooltipServiceWrapper = desc.tooltipServiceWrapper || null;
    this.referenceEvent = desc.referenceEvent || EventColumn.CURRENT_DATE_REFERENCE;
    this.msPerUnit = desc.msPerUnit || 1000 * 60 * 60 * 24;
    if (this.boxplotPossible) {
      this.displayEventListOverview.push(IEventBoxplotDataKeys.median);
      for (const val of Object.keys(IEventBoxplotDataKeys)) {
        this.eventListOverview.push(val);
      }
    }
    this.sortEvent = desc.sortEvent || this.displayEventList.length > 0 ? this.displayEventList[0] : undefined;
    this.categories = this.eventList.map((d, i) => {
      return {
        name: d,
        label: d,
        color: schemeSet1[i % schemeSet1.length],
        value: i,
      };
    });
    this.categories.push({
      name: EventColumn.BOXPLOT_COLOR_NAME,
      label: EventColumn.BOXPLOT_COLOR_NAME,
      color: EventColumn.BOXPLOT_DEFAULT_COLOR,
      value: 0,
    });
    this.colorMapping = DEFAULT_CATEGORICAL_COLOR_FUNCTION;
    this.updateLegend();
  }

  private updateLegend() {
    if (this.legendUpdateCallback) {
      let boxPlotLabel = undefined;
      let boxPlotColor = undefined;
      if (this.showBoxplot) {
        const boxplotCategory = this.categories.filter((x) => x.name === EventColumn.BOXPLOT_COLOR_NAME)[0];
        boxPlotLabel = 'Deviation from ' + this.boxplotReferenceColumn;
        boxPlotColor = this.colorMapping.apply(boxplotCategory);
      }
      this.legendUpdateCallback(
        JSON.parse(JSON.stringify(this.categories.filter((x) => x.name !== EventColumn.BOXPLOT_COLOR_NAME))),
        this.colorMapping,
        boxPlotLabel,
        boxPlotColor
      );
    }
  }

  // addTooltips(row: IDataRow, selection: d3.Selection<d3.BaseType, unknown, null, undefined>) {
  //   if (!this.tooltipServiceWrapper) return;
  //   const events = this.getMap(row);
  //   const formatter = (x) => valueFormatter.format(x, '0.###');
  //   const tooltipList = this.getDisplayEventList().map((x) => {
  //     return {
  //       displayName: x,
  //       value: formatter(this.getEventValue(events, x)),
  //       color: this.getCategoryColor(x),
  //       header: 'Event Data',
  //     } as powerbi.extensibility.VisualTooltipDataItem;
  //   });

  //   if (this.boxplotPossible && this.showBoxplot) {
  //     this.getEventValues(events, false, Object.keys(IBoxPlotDataKeys))
  //       .map((x) => {
  //         return {
  //           displayName: x.key,
  //           value: formatter(x.value),
  //           color: this.getCategoryColor(Constants.BOXPLOT_COLOR_NAME),
  //         } as powerbi.extensibility.VisualTooltipDataItem;
  //       })
  //       .filter((x) => x.value !== 'NaN')
  //       .forEach((x) => tooltipList.push(x));
  //   }

  //   this.tooltipServiceWrapper.addTooltip(
  //     selection,
  //     () => tooltipList,
  //     () => null
  //   );
  // }

  getHeatmapBinCount() {
    return this.heatmapBinCount;
  }

  // getTooltipServiceWrapper() {
  //   return this.tooltipServiceWrapper;
  // }

  getColorMapping(): ICategoricalColorMappingFunction {
    return this.colorMapping.clone();
  }
  setColorMapping(mapping: ICategoricalColorMappingFunction): void {
    if (this.colorMapping.eq(mapping)) {
      return;
    }
    this.fire(
      [
        CategoricalColumn.EVENT_COLOR_MAPPING_CHANGED,
        Column.EVENT_DIRTY_VALUES,
        Column.EVENT_DIRTY_HEADER,
        Column.EVENT_DIRTY,
      ],
      this.colorMapping.clone(),
      (this.colorMapping = mapping)
    );
    this.updateLegend();
  }

  getCategoryColor(category: string) {
    category = Object.keys(IEventBoxplotDataKeys).includes(category) ? EventColumn.BOXPLOT_COLOR_NAME : category;
    const filtered = this.categories.filter((x) => x.name === category);
    if (filtered.length === 1) {
      return this.colorMapping.apply(filtered[0]);
    }

    return this.colorMapping.apply({ name: category, label: category, color: '#000000', value: 0 });
  }

  getEventList(overview = false): string[] {
    if (overview) {
      return [...this.eventListOverview];
    }
    return [...this.eventList];
  }

  getDisplayEventList(overview = false): string[] {
    if (overview) {
      return [...this.displayEventListOverview];
    }
    return [...this.displayEventList];
  }

  setDisplayEventList(eventList: string[], overview = false) {
    if (overview) {
      this.displayEventListOverview = eventList;
      return;
    }
    this.displayEventList = eventList;
  }

  getBoxplotPossible() {
    return this.boxplotPossible;
  }

  getScaleMin() {
    return this.scaleMin;
  }

  getScaleMax() {
    return this.scaleMax;
  }

  getBoxplotReferenceColumn() {
    return this.boxplotReferenceColumn;
  }

  setBoxplotReferenceColumn(boxplotReferenceColumn: string) {
    this.boxplotReferenceColumn = boxplotReferenceColumn;
    this.updateLegend();
  }

  getShowBoxplot() {
    return this.showBoxplot;
  }
  setShowBoxplot(showBoxplot: boolean) {
    this.showBoxplot = showBoxplot;
    this.updateLegend();
  }

  getBoxplotData(eventData: IKeyValue<number>[]): IEventBoxplotData {
    const BPkeys = Object.keys(IEventBoxplotDataKeys);
    const dataKeys = eventData.map((x) => x.key);
    if (
      !BPkeys.every((key) => {
        return dataKeys.filter((x) => x === key).length > 0;
      })
    ) {
      return null;
    }

    return {
      min: this.getEventValue(eventData, IEventBoxplotDataKeys.min),
      max: this.getEventValue(eventData, IEventBoxplotDataKeys.max),
      median: this.getEventValue(eventData, IEventBoxplotDataKeys.median),
      q1: this.getEventValue(eventData, IEventBoxplotDataKeys.q1),
      q3: this.getEventValue(eventData, IEventBoxplotDataKeys.q3),
      outliers: [],
    };
  }

  private getBoxplotOffset(eventData: IKeyValue<number>[]): number {
    if (this.boxplotReferenceColumn === EventColumn.CURRENT_DATE_REFERENCE) return Date.now();
    const referenceValueFiltered = eventData.filter((x) => x.key === this.boxplotReferenceColumn);
    const offset = referenceValueFiltered.length === 1 ? referenceValueFiltered[0].value : 0;
    return offset;
  }

  getEventValue(events: IKeyValue<number>[], valKey?: string): number {
    valKey = valKey || this.sortEvent;
    let eventVal = events.filter((x) => x.key === valKey)[0]?.value ?? NaN;
    let reference = Date.now();
    if (this.referenceEvent !== EventColumn.CURRENT_DATE_REFERENCE) {
      const referenceValueFiltered = events.filter((x) => x.key === this.referenceEvent);
      reference = referenceValueFiltered.length === 1 ? referenceValueFiltered[0].value : 0;
    }
    if (Object.keys(IEventBoxplotDataKeys).includes(valKey)) {
      eventVal = eventVal * this.msPerUnit + this.getBoxplotOffset(events);
    }
    return (eventVal - reference) / this.msPerUnit;
  }

  getEventValues(events: IKeyValue<number>[], overview = false, eventKeys = []): IKeyValue<number>[] {
    if (eventKeys.length === 0) eventKeys = this.getDisplayEventList(overview);
    const values = eventKeys.map((x) => {
      return { key: x, value: this.getEventValue(events, x) };
    });

    return values.filter((x) => !isNaN(x.value));
  }

  toCompareValue(row: IDataRow): number {
    const eventData = this.getMap(row);
    return this.getEventValue(eventData);
  }

  toCompareValueType() {
    return ECompareValueType.FLOAT;
  }

  getRange(): [number, number] {
    return [this.scaleMin, this.scaleMax];
  }

  getSortMethod() {
    return this.sortEvent;
  }

  getReferenceColumn() {
    return this.referenceEvent;
  }

  setReferenceColumn(referenceColumn: string) {
    this.referenceEvent = referenceColumn;
  }

  setSortMethod(sort: string) {
    if (this.sortEvent === sort) {
      return;
    }
    this.fire([EventColumn.EVENT_SORTMETHOD_CHANGED], this.sortEvent, (this.sortEvent = sort));

    if (!this.isSortedByMe().asc) {
      this.sortByMe();
    }
    this.markDirty('values');
  }

  setScaleMin(min: number) {
    this.scaleMin = Math.max(min, this.scaleMinBound);
  }

  setScaleMax(max: number) {
    this.scaleMax = Math.min(max, this.scaleMaxBound);
  }

  dump(toDescRef: (desc: any) => any): any {
    const r = super.dump(toDescRef);
    r.sortMethod = this.getSortMethod();
    r.boxplotReferenceColumn = this.boxplotReferenceColumn;
    r.displayEventList = this.displayEventList;
    r.displayEventListOverview = this.displayEventListOverview;
    r.showBoxplot = this.showBoxplot;
    r.colorMapping = this.colorMapping.toJSON();
    r.categories = this.categories;
    r.msPerUnit = this.msPerUnit;
    r.referenceColumn = this.referenceEvent;
    return r;
  }

  restore(dump: any, factory: ITypeFactory) {
    super.restore(dump, factory);
    if (dump.sortMethod) {
      this.sortEvent = dump.sortMethod;
    }
    if (dump.boxplotReferenceColumn) {
      this.boxplotReferenceColumn = dump.boxplotReferenceColumn;
    }
    if (dump.displayEventList) {
      this.displayEventList = dump.displayEventList;
    }
    if (dump.displayEventListOverview) {
      this.displayEventListOverview = dump.displayEventListOverview;
    }
    if (dump.showBoxplot) {
      this.showBoxplot = dump.showBoxplot;
    }
    if (dump.categories) {
      this.categories = dump.categories;
    }
    if (dump.colorMapping) {
      this.colorMapping = factory.categoricalColorMappingFunction(dump.colorMapping, this.categories);
    }
    if (dump.msPerUnit) {
      this.msPerUnit = dump.msPerUnit;
    }
    if (dump.referenceColumn) {
      this.referenceEvent = dump.referenceColumn;
    }
    this.updateLegend();
  }

  protected createEventList() {
    return super
      .createEventList()
      .concat([
        EventColumn.EVENT_MAPPING_CHANGED,
        EventColumn.EVENT_SORTMETHOD_CHANGED,
        EventColumn.EVENT_FILTER_CHANGED,
        EventColumn.EVENT_COLOR_MAPPING_CHANGED,
      ]);
  }

  on(type: typeof EventColumn.EVENT_COLOR_MAPPING_CHANGED, listener: typeof colorMappingChangedNMC | null): this;
  on(type: typeof EventColumn.EVENT_MAPPING_CHANGED, listener: typeof mappingChangedNMC | null): this;
  on(type: typeof EventColumn.EVENT_SORTMETHOD_CHANGED, listener: typeof sortMethodChangedNMC | null): this;
  on(type: typeof EventColumn.EVENT_FILTER_CHANGED, listener: typeof filterChangedNMC | null): this;
  on(type: typeof ValueColumn.EVENT_DATA_LOADED, listener: typeof dataLoaded | null): this;
  on(type: typeof Column.EVENT_WIDTH_CHANGED, listener: typeof widthChanged | null): this;
  on(type: typeof Column.EVENT_LABEL_CHANGED, listener: typeof labelChanged | null): this;
  on(type: typeof Column.EVENT_METADATA_CHANGED, listener: typeof metaDataChanged | null): this;
  on(type: typeof Column.EVENT_DIRTY, listener: typeof dirty | null): this;
  on(type: typeof Column.EVENT_DIRTY_HEADER, listener: typeof dirtyHeader | null): this;
  on(type: typeof Column.EVENT_DIRTY_VALUES, listener: typeof dirtyValues | null): this;
  on(type: typeof Column.EVENT_DIRTY_CACHES, listener: typeof dirtyCaches | null): this;
  on(type: typeof Column.EVENT_RENDERER_TYPE_CHANGED, listener: typeof rendererTypeChanged | null): this;
  on(type: typeof Column.EVENT_GROUP_RENDERER_TYPE_CHANGED, listener: typeof groupRendererChanged | null): this;
  on(type: typeof Column.EVENT_SUMMARY_RENDERER_TYPE_CHANGED, listener: typeof summaryRendererChanged | null): this;
  on(type: typeof Column.EVENT_VISIBILITY_CHANGED, listener: typeof visibilityChanged | null): this;
  on(type: string | string[], listener: IEventListener | null): this; // required for correct typings in *.d.ts
  on(type: string | string[], listener: IEventListener | null): this {
    return super.on(type as any, listener);
  }
}