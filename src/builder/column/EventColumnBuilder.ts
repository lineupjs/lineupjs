import { EEventBoxplotDataKeys, ETimeUnit, EventColumn, type ICategory, type IEventColumnDesc } from '../../model';
import ColumnBuilder from './ColumnBuilder';

/**
 * Builder class for creating event columns.
 */
export default class EventColumnBuilder extends ColumnBuilder<IEventColumnDesc> {
  constructor(column: string) {
    super('event', column);
  }

  /**
   * Sets whether the event data supports boxplot visualization.
   * The default is false. If set to true, the boxplot visualization and related settings will be available in the LineUp UI.
   * @param boxplotPossible - A boolean indicating if boxplot visualization is possible.
   * @returns The updated EventColumnBuilder instance.
   */
  boxplotPossible(boxplotPossible: boolean) {
    this.desc.boxplotPossible = boxplotPossible;
    return this;
  }

  /**
   * Sets the reference event for the boxplot visualization.
   * All boxplots will be drawn relative to this event.
   * The default is to use the first event in the event list.
   * @param boxPlotReferenceEvent - The reference event to set.
   * @returns The updated EventColumnBuilder instance.
   */
  boxPlotReferenceEvent(boxPlotReferenceEvent: string) {
    this.desc.boxplotReferenceEvent = boxPlotReferenceEvent;
    return this;
  }

  /**
   * Sets the unit of the boxplot data as {@link ETimeUnit}.
   * If the unit is set to {@link ETimeUnit.custom}, the milliseconds per unit can be specified.
   * The default is {@link ETimeUnit.d}.
   * @param boxplotUnit - The unit of the boxplot data.
   * @param msPerUnit - The milliseconds per unit for a custom time unit.
   * @returns The updated EventColumnBuilder instance.
   */
  boxplotUnit(boxplotUnit: ETimeUnit, msPerUnit?: number) {
    if (boxplotUnit === ETimeUnit.custom) {
      this.desc.msPerBoxplotUnit = msPerUnit;
    } else {
      this.desc.msPerBoxplotUnit = EventColumn.TIME_UNITS_IN_MS[boxplotUnit];
    }
    return this;
  }

  /**
   * Sets the list of event for that should be displayed on initialization.
   * The default is to display all events specified in {@link eventList}.
   * @param displayEventList - The list of display events.
   *        It should be an array of strings representing the events to be displayed.
   * @returns The updated EventColumnBuilder instance.
   */
  displayEventList(displayEventList: string[]) {
    this.desc.displayEventList = displayEventList;
    return this;
  }

  /**
   * Displays a zero line in the event column if set to true.
   * The default is false.
   * @param displayZeroLine - A boolean indicating if the zero line should be displayed.
   * @returns The updated EventColumnBuilder instance.
   */
  displayZeroLine(displayZeroLine: boolean) {
    this.desc.displayZeroLine = displayZeroLine;
    return this;
  }

  /**
   * Sets the list of events for the event column. Other events will be ignored.
   * The default is to display all events of the data.
   * @param eventList - String array representing the events.
   * @returns The updated EventColumnBuilder instance.
   */
  eventList(eventList: string[]) {
    this.desc.eventList = eventList;
    return this;
  }

  /**
   * Sets the minimum and maximum values for the event column scale.
   * Values outside the bounds will only be visible when zooming.
   * The default is to use the minimum and maximum values of the data.
   * @param min - The minimum value.
   * @param max - The maximum value.
   * @returns The updated EventColumnBuilder instance.
   */
  eventScaleBounds(min: number, max: number) {
    this.desc.eventScaleMin = min;
    this.desc.eventScaleMax = max;
    return this;
  }

  /**
   * Sets the number of bins for the heatmap summary visualization.
   * The default is 50.
   * @param heatmapBinCount - The number of bins.
   * @returns The updated EventColumnBuilder instance.
   */
  heatmapBinCount(heatmapBinCount: number) {
    this.desc.heatmapBinCount = heatmapBinCount;
    return this;
  }

  /**
   * Sets the legend update callback function for displaying a legend outside of LineUp.
   * @param legendUpdateCallback - The callback function getting the new Categories on color mapping changes.
   * @returns The updated EventColumnBuilder instance.
   */
  legendUpdateCallback(legendUpdateCallback: (categories: ICategory[]) => void) {
    this.desc.legendUpdateCallback = legendUpdateCallback;
    return this;
  }

  /**
   * Sets the milliseconds per unit of the event scale.
   * @param eventScaleUnit - The unit of the event scale as {@link ETimeUnit}.
   * @param msPerUnit - The milliseconds per unit for a custom time unit ({@link ETimeUnit.custom}).
   * @returns The updated EventColumnBuilder instance.
   */
  eventScaleUnit(eventScaleUnit: ETimeUnit, msPerUnit?: number) {
    this.desc.eventScaleUnit = eventScaleUnit;
    if (eventScaleUnit === ETimeUnit.custom) {
      this.desc.msPerScaleUnit = msPerUnit;
    } else {
      this.desc.msPerScaleUnit = EventColumn.TIME_UNITS_IN_MS[eventScaleUnit];
    }
    return this;
  }

  /**
   * Sets the reference event for all other events.
   * The default is to use the current date from {@link Date.now()}.
   * @param referenceEvent - The reference event to set.
   * @returns The EventColumnBuilder instance.
   */
  referenceEvent(referenceEvent: string) {
    this.desc.referenceEvent = referenceEvent;
    return this;
  }

  /**
   * Sets the sort event for the event column.
   * The default is to use the first event in the event list.
   * @param sortEvent - The event to sort by.
   * @returns The updated EventColumnBuilder instance.
   */
  sortEvent(sortEvent: string) {
    this.desc.sortEvent = sortEvent;
    return this;
  }

  private deriveEvents(data: any[]) {
    const events = new Set<string>();
    const col = (this.desc as any).column;
    data.forEach((d) => {
      const v = Object.keys(d[col]);
      v.forEach((vi) => {
        if (!Object.keys(EEventBoxplotDataKeys).includes(vi)) events.add(vi);
      });
    });
    this.desc.eventList = Array.from(events);
  }

  /**
   * Builds the event column and derives all events from the data if no event list is specified.
   * The scale unit will be added to the column label.
   */
  build(data: any[]): IEventColumnDesc {
    if (!this.desc.eventList) {
      this.deriveEvents(data);
    }
    const eventScaleUnit = this.desc.eventScaleUnit || ETimeUnit.d;
    this.label((this.desc as any).column + ' [' + eventScaleUnit + ']');
    return super.build(data);
  }
}

/**
 * builds a date column builder
 * @param {string} column column which contains the associated data
 * @returns {DateColumnBuilder}
 */
export function buildEventColumn(column: string, displayEventList?: string[]) {
  return new EventColumnBuilder(column).displayEventList(displayEventList);
}
