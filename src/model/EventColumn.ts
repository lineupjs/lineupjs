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
import { select } from 'd3-selection';
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
import { format } from 'd3-format';
import { cssClass } from '../styles';
import { type Instance } from '@popperjs/core';

export interface IEventBoxplotData {
  min: number;
  max: number;
  median: number;
  q1: number;
  q3: number;
  outliers: number[];
}

export enum EEventBoxplotDataKeys {
  min = 'min',
  q1 = 'q1',
  median = 'median',
  q3 = 'q3',
  max = 'max',
}

export enum ETimeUnit {
  ms = 'ms',
  s = 's',
  min = 'min',
  h = 'h',
  d = 'd',
  w = 'w',
  m = 'm',
  y = 'y',
  custom = 'custom',
}

interface ITooltipRow {
  eventName: string;
  value: string;
  color: string;
  date?: Date;
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
  /**
   * indicates if boxplots can be displayed. When set to false, settings related to boxplots are hidden.
   * @default false
   */
  boxplotPossible?: boolean;

  /**
   * The reference column for the boxplot visualization. All boxplots will be drawn relative to this event.
   * @default 'Current Date'
   */
  boxplotReferenceColumn?: string;

  /**
   * The list of events to be displayed on initialization.
   * default are the events from {@link IEventColumnDesc.eventList}
   */
  displayEventList?: string[];

  /**
   * The list of events used in the {@link EventColumn}. All other events in the data are ignored.
   * default are all events in the data.
   */
  eventList: string[];

  /**
   * Minimum number of the event scale. If events are smaller than this value, they will be cut off and only visible on zoom in.
   * @default -Infinity
   */
  eventScaleMin?: number;

  /**
   * Maximum number of the event scale. If events are larger than this value, they will be cut off and only visible on zoom out.
   * @default Infinity
   */
  eventScaleMax?: number;

  /**
   * The unit of the event data scale used for display in the header.
   * @default 'd'
   */
  eventScaleUnit?: ETimeUnit;

  /**
   * Bin count of the summary visualization heatmap.
   * @default 50
   */
  heatmapBinCount?: number;

  /**
   * Callback function to update a legend outside of LineUp.
   * It is called whenever the color mapping changes.
   * @param categories - The categories of the legend.
   */
  legendUpdateCallback?: (categories: ICategory[]) => void;

  /**
   * The unit of the event scale in milliseconds.
   * @default 1000 * 60 * 60 * 24
   */
  msPerScaleUnit?: number;

  /**
   * The unit of the boxplot data in milliseconds.
   * @default 1
   */
  msPerBoxplotUnit?: number;

  /**
   * The reference event for the event scale. All events will be displayed relative to this event.
   * This means that the value on the event scale will be 0 for this event.
   * @default 'Current Date'
   */
  referenceEvent?: string;

  /**
   * The event used for sorting the column.
   *
   * Default is the first event in {@link IEventColumnDesc.eventList}
   */
  sortEvent?: string;
};

/**
 * Column storing events as map of numbers.
 * Each key of the map represents an event and the value represents the time of the event in milliseconds since 1.1.1970.
 * Keys can also be boxplotvalues defined in {@link EEventBoxplotDataKeys}.
 * All events values are displayed relative to the reference event.
 * @see {@link IEventColumnDesc} for a detailed description of the parameters.
 * @extends MapColumn<number>
 */
@toolbar('rename', 'sort', 'sortBy', 'eventSettings', 'eventReferences', 'colorMappedCategorical')
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

  static readonly TIME_UNITS_IN_MS = {
    ms: 1,
    s: 1000,
    min: 1000 * 60,
    h: 1000 * 60 * 60,
    d: 1000 * 60 * 60 * 24,
    w: 1000 * 60 * 60 * 24 * 7,
    m: 1000 * 60 * 60 * 24 * 30,
    y: 1000 * 60 * 60 * 24 * 365,
    custom: -1,
  };

  private sortEvent: string;

  private colorMapping: ICategoricalColorMappingFunction;

  private boxplotReferenceColumn: string;

  private msPerBoxplotUnit: number;

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

  private scaleMin: number;

  private scaleMax: number;

  private scaleMinBound: number;

  private scaleMaxBound: number;

  private referenceEvent: string;

  private msPerUnit: number;

  transform = zoomIdentity;
  private showBoxplot: boolean;
  private heatmapBinCount: number = 50;

  popperInstance: Instance;

  constructor(id: string, desc: Readonly<IEventColumnDesc>) {
    super(
      id,
      integrateDefaults(desc, {
        renderer: 'event',
        groupRenderer: 'event',
        summaryRenderer: 'event',
      })
    );
    this.boxplotReferenceColumn = desc.boxplotReferenceColumn || EventColumn.CURRENT_DATE_REFERENCE;
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
    this.referenceEvent = desc.referenceEvent || EventColumn.CURRENT_DATE_REFERENCE;
    this.msPerUnit = desc.msPerScaleUnit || 1000 * 60 * 60 * 24;
    this.msPerBoxplotUnit = desc.msPerBoxplotUnit || 1;
    if (this.boxplotPossible) {
      this.displayEventListOverview.push(EEventBoxplotDataKeys.median);
      for (const val of Object.keys(EEventBoxplotDataKeys)) {
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

  updateTooltipContent(row: IDataRow, tooltipContentDiv: HTMLElement) {
    const events = this.getMap(row);
    const tooltipList: ITooltipRow[] = this.getTooltipData(events);
    this.getTooltipTable(tooltipContentDiv, tooltipList);
  }

  private getTooltipTable(tooltipContentDiv: HTMLElement, tooltipList: ITooltipRow[]) {
    const tooltipSelection = select(tooltipContentDiv);
    tooltipSelection.selectAll('*').remove();
    const table = tooltipSelection.append('table').attr('class', cssClass('event-tooltip-table'));
    table
      .append('thead')
      .selectAll('th')
      .data(['', 'Event', 'Value', 'Date'])
      .join('th')
      .text((d) => d);
    const rows = table.append('tbody').selectAll('tr').data(tooltipList).join('tr');
    rows
      .append('td')
      .append('div')
      .style('background-color', (d) => d.color)
      .attr('class', cssClass('event-tooltip') + ' circle');
    rows
      .append('td')
      .attr('class', 'event-name')
      .text((d) => d.eventName);
    rows.append('td').text((d) => d.value);
    rows.append('td').text((d) => (d.date ? d.date.toLocaleString() : ''));
  }

  private getTooltipData(events: IKeyValue<number>[]) {
    const formatter = format('.3f');
    const tooltipList: ITooltipRow[] = this.getDisplayEventList().map((x) => {
      const dateVal = events.filter((e) => e.key === x)[0]?.value ?? undefined;
      return {
        eventName: x,
        value: formatter(this.getEventValue(events, x)),
        color: this.getCategoryColor(x),
        date: dateVal ? new Date(dateVal) : undefined,
      };
    });

    if (this.boxplotPossible && this.showBoxplot) {
      this.getEventValues(events, false, Object.keys(EEventBoxplotDataKeys))
        .map((x) => {
          return {
            eventName: x.key,
            value: formatter(x.value),
            color: this.getCategoryColor(EventColumn.BOXPLOT_COLOR_NAME),
          };
        })
        .filter((x) => x.value !== 'NaN')
        .forEach((x) => tooltipList.push(x));
    }
    return tooltipList;
  }

  getHeatmapBinCount() {
    return this.heatmapBinCount;
  }

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
    category = Object.keys(EEventBoxplotDataKeys).includes(category) ? EventColumn.BOXPLOT_COLOR_NAME : category;
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
    const BPkeys = Object.keys(EEventBoxplotDataKeys);
    const dataKeys = eventData.map((x) => x.key);
    if (
      !BPkeys.every((key) => {
        return dataKeys.filter((x) => x === key).length > 0;
      })
    ) {
      return null;
    }

    return {
      min: this.getEventValue(eventData, EEventBoxplotDataKeys.min),
      max: this.getEventValue(eventData, EEventBoxplotDataKeys.max),
      median: this.getEventValue(eventData, EEventBoxplotDataKeys.median),
      q1: this.getEventValue(eventData, EEventBoxplotDataKeys.q1),
      q3: this.getEventValue(eventData, EEventBoxplotDataKeys.q3),
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
    if (Object.keys(EEventBoxplotDataKeys).includes(valKey)) {
      eventVal = eventVal * this.msPerBoxplotUnit + this.getBoxplotOffset(events);
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
