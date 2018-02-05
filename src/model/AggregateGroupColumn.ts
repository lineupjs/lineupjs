import Column, {IColumnDesc} from './Column';
import {IGroup} from './Group';
import Ranking from './Ranking';

/**
 * factory for creating a description creating a rank column
 * @param label
 * @returns {{type: string, label: string}}
 */
export function createDesc(label: string = 'A') {
  return {type: 'aggregate', label, description: 'Aggregate Groups'};
}

export interface IAggregateGroupColumnDesc extends IColumnDesc {
  isAggregated(ranking: Ranking, group: IGroup): boolean;

  setAggregated(ranking: Ranking, group: IGroup, value: boolean): void;
}

/**
 * a checkbox column for selections
 */
export default class AggregateGroupColumn extends Column {
  static readonly EVENT_AGGREGATE = 'aggregate';

  constructor(id: string, desc: IAggregateGroupColumnDesc) {
    super(id, desc);
    this.setWidth(20);
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
