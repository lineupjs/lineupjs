import {Category, SupportType} from './annotations';
import Column, {IColumnDesc, widthChanged, labelChanged, metaDataChanged, dirty, dirtyHeader, dirtyValues, rendererTypeChanged, groupRendererChanged, summaryRendererChanged, visibilityChanged} from './Column';
import {IGroup} from './interfaces';
import Ranking from './Ranking';
import {IEventListener} from '../internal/AEventDispatcher';

/**
 * factory for creating a description creating a rank column
 * @param label
 * @returns {{type: string, label: string}}
 */
export function createAggregateDesc(label: string = 'Aggregate Groups') {
  return {type: 'aggregate', label, fixed: true};
}

export interface IAggregateGroupColumnDesc extends IColumnDesc {
  isAggregated(ranking: Ranking, group: IGroup): boolean;

  setAggregated(ranking: Ranking, group: IGroup, value: boolean): void;
}

/**
 * emitted upon changing of the aggregate attribute
 * @asMemberOf AggregateGroupColumn
 * @event
 */
export declare function aggregate(ranking: Ranking, group: IGroup, value: boolean): void;

/**
 * a checkbox column for selections
 */
@SupportType()
@Category('support')
export default class AggregateGroupColumn extends Column {
  static readonly EVENT_AGGREGATE = 'aggregate';

  constructor(id: string, desc: Readonly<IAggregateGroupColumnDesc>) {
    super(id, desc);
    this.setDefaultWidth(20);
  }

  get frozen() {
    return this.desc.frozen !== false;
  }

  protected createEventList() {
    return super.createEventList().concat([AggregateGroupColumn.EVENT_AGGREGATE]);
  }

  on(type: typeof AggregateGroupColumn.EVENT_AGGREGATE, listener: typeof aggregate | null): this;
  on(type: typeof Column.EVENT_WIDTH_CHANGED, listener: typeof widthChanged | null): this;
  on(type: typeof Column.EVENT_LABEL_CHANGED, listener: typeof labelChanged | null): this;
  on(type: typeof Column.EVENT_METADATA_CHANGED, listener: typeof metaDataChanged | null): this;
  on(type: typeof Column.EVENT_DIRTY, listener: typeof dirty | null): this;
  on(type: typeof Column.EVENT_DIRTY_HEADER, listener: typeof dirtyHeader | null): this;
  on(type: typeof Column.EVENT_DIRTY_VALUES, listener: typeof dirtyValues | null): this;
  on(type: typeof Column.EVENT_RENDERER_TYPE_CHANGED, listener: typeof rendererTypeChanged | null): this;
  on(type: typeof Column.EVENT_GROUP_RENDERER_TYPE_CHANGED, listener: typeof groupRendererChanged | null): this;
  on(type: typeof Column.EVENT_SUMMARY_RENDERER_TYPE_CHANGED, listener: typeof summaryRendererChanged | null): this;
  on(type: typeof Column.EVENT_VISIBILITY_CHANGED, listener: typeof visibilityChanged | null): this;
  on(type: string | string[], listener: IEventListener | null): this {
    return super.on(<any>type, listener);
  }

  isAggregated(group: IGroup) {
    const ranking = this.findMyRanker()!;
    if ((<IAggregateGroupColumnDesc>this.desc).isAggregated) {
      return (<IAggregateGroupColumnDesc>this.desc).isAggregated(ranking, group);
    }
    return false;
  }

  setAggregated(group: IGroup, value: boolean) {
    const ranking = this.findMyRanker()!;
    const current = ((<IAggregateGroupColumnDesc>this.desc).isAggregated) && (<IAggregateGroupColumnDesc>this.desc).isAggregated(ranking, group);
    if (current === value) {
      return true;
    }

    if ((<IAggregateGroupColumnDesc>this.desc).setAggregated) {
      (<IAggregateGroupColumnDesc>this.desc).setAggregated(ranking, group, value);
    }
    this.fire(AggregateGroupColumn.EVENT_AGGREGATE, ranking, group, value);
    return false;
  }
}
