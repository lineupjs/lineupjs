import {Category, SupportType} from './annotations';
import Column, {IColumnDesc} from './Column';
import {IGroup} from './interfaces';
import Ranking from './Ranking';

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
