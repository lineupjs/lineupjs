import {IGroupData, IGroupItem} from '../../model';

export interface IRule {
  apply(data: (IGroupData | IGroupItem)[], availableHeight: number, selection: Set<number>): IRuleInstance;

  levelOfDetail(item: IGroupData | IGroupItem, height: number): 'high' | 'low';
}

export interface IRuleInstance {
  item: number | ((item: IGroupItem) => number);
  group: number | ((group: IGroupData) => number);
  violation?: string;
}
