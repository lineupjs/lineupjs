import {Category, SupportType} from './annotations';
import {IDataRow, IColumnDesc, IGroup} from './interfaces';
import Column from './Column';

export interface IAction {
  name: string;
  icon?: string;
  className?: string;

  action(row: IDataRow): void;
}

export interface IGroupAction {
  name: string;
  icon?: string;
  className?: string;

  action(group: IGroup, rows: IDataRow[]): void;
}

/**
 * utility for creating an action description with optional label
 * @param label
 * @param actions
 * @param groupActions
 * @returns {{type: string, label: string}}
 */
export function createActionDesc(label = 'actions', actions: Readonly<IAction>[] = [], groupActions: Readonly<IGroupAction>[] = []) {
  return {type: 'actions', label, actions, groupActions, fixed: true};
}

export interface IActionDesc {
  actions?: Readonly<IAction>[];
  groupActions?: Readonly<IGroupAction>[];
}

export declare type IActionColumnDesc = IColumnDesc & IActionDesc;

/**
 * a default column with no values
 */
@SupportType()
@Category('support')
export default class ActionColumn extends Column {

  readonly actions: IAction[];
  readonly groupActions: IGroupAction[];

  constructor(id: string, desc: Readonly<IActionColumnDesc>) {
    super(id, desc);

    this.actions = desc.actions || [];
    this.groupActions = desc.groupActions || [];
  }

  getLabel() {
    return '';
  }

  getValue() {
    return '';
  }

  compare() {
    return 0; //can't compare
  }
}
