import { IEventBoxplotDataKeys, type ICategory, type IEventColumnDesc } from '../../model';
import ColumnBuilder from './ColumnBuilder';

/**
 * Builder class for creating event columns.
 */
export default class EventColumnBuilder extends ColumnBuilder<IEventColumnDesc> {
  constructor(column: string) {
    super('event', column);
  }

  /**
   * Sets whether the event column supports boxplot visualization.
   * @param boxplotPossible - A boolean indicating if boxplot visualization is possible.
   * @returns The updated EventColumnBuilder instance.
   */
  boxplotPossible(boxplotPossible: boolean) {
    this.desc.boxplotPossible = boxplotPossible;
    return this;
  }

  boxPlotReferenceColumn(boxPlotReferenceColumn: string) {
    this.desc.boxPlotReferenceColumn = boxPlotReferenceColumn;
    return this;
  }

  /**
   * Sets the list of display events for the event column.
   * @param displayEventList - The list of display events.
   *                          It should be an array of strings representing the events to be displayed.
   * @returns The updated EventColumnBuilder instance.
   */
  displayEventList(displayEventList: string[]) {
    this.desc.displayEventList = displayEventList;
    return this;
  }

  /**
   * Sets the list of events for the event column. Other events will be ignored.
   * @param eventList - The list of events.
   *                    It should be an array of strings representing the events.
   * @returns The updated EventColumnBuilder instance.
   */
  eventList(eventList: string[]) {
    this.desc.eventList = eventList;
    return this;
  }

  /**
   * Sets the minimum and maximum values for the event column scale. Values outside will only be visible when zooming.
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
   * @param heatmapBinCount - The number of bins.
   * @returns The updated EventColumnBuilder instance.
   */
  heatmapBinCount(heatmapBinCount: number) {
    this.desc.heatmapBinCount = heatmapBinCount;
    return this;
  }

  /**
   * Sets the legend update callback function for displaying a legend outside of LineUp.
   * @param legendUpdateCallback - The callback function.
   * @returns The updated EventColumnBuilder instance.
   */
  legendUpdateCallback(legendUpdateCallback: (categories: ICategory[]) => void) {
    this.desc.legendUpdateCallback = legendUpdateCallback;
    return this;
  }

  /**
   * Sets the milliseconds per unit of the event scale.
   * @param maxEvents - The maximum number of events.
   * @returns The updated EventColumnBuilder instance.
   */
  msPerUnit(msPerUnit: number) {
    this.desc.msPerUnit = msPerUnit;
    return this;
  }

  /**
   * Sets the reference event for all other events.
   * @param referenceEvent - The reference column to set.
   * @returns The EventColumnBuilder instance.
   */
  referenceEvent(referenceEvent: string) {
    this.desc.referenceEvent = referenceEvent;
    return this;
  }

  /**
   * Sets the sort event for the event column.
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
        if (!Object.keys(IEventBoxplotDataKeys).includes(vi)) events.add(vi);
      });
    });
    this.desc.eventList = Array.from(events);
  }

  build(data: any[]): IEventColumnDesc {
    if (!this.desc.eventList) {
      this.deriveEvents(data);
    }
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
