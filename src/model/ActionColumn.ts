/**
 * Created by sam on 04.11.2016.
 */

import {SupportType} from './annotations';
import Column, {IColumnDesc} from './Column';
import {IDataRow, IGroup} from './interfaces';

export interface IAction {
  name: string;
  icon: string;

  action(row: IDataRow): void;
}

export interface IGroupAction {
  name: string;
  icon: string;

  action(group: IGroup, rows: IDataRow[]): void;
}

/**
 * utility for creating an action description with optional label
 * @param label
 * @param actions
 * @param groupActions
 * @returns {{type: string, label: string}}
 */
export function createDesc(label = 'actions', actions: IAction[] = [], groupActions: IGroupAction[] = []) {
  return {type: 'actions', label, actions, groupActions};
}

export interface IActionDesc {
  actions?: IAction[];
  groupActions?: IGroupAction[];
}

export declare type IActionColumnDesc = IColumnDesc & IActionDesc;

/**
 * a default column with no values
 */
@SupportType()
export default class ActionColumn extends Column {

  readonly actions: IAction[];
  readonly groupActions: IGroupAction[];

  constructor(id: string, desc: IActionColumnDesc) {
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
