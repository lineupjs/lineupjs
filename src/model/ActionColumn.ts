/**
 * Created by sam on 04.11.2016.
 */

import Column, {IColumnDesc} from './Column';

export interface IAction {
  name: string;
  icon: string;
  action(v: any, dataIndex: number): void;
}

/**
 * utility for creating an action description with optional label
 * @param label
 * @param actions
 * @returns {{type: string, label: string}}
 */
export function createDesc(label = 'actions', actions: IAction[] = []) {
  return {type: 'actions', label, actions};
}


export interface IActionColumnDesc extends IColumnDesc {
  actions?: IAction[];
}

/**
 * a default column with no values
 */
export default class ActionColumn extends Column {

  readonly actions: IAction[];

  constructor(id: string, desc: IActionColumnDesc) {
    super(id, desc);

    this.actions = desc.actions || [];
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
