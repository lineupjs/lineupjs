import {IActionColumnDesc, IAction, IGroupAction} from '../../model';
import ColumnBuilder from './ColumnBuilder';

export default class ActionsColumnBuilder extends ColumnBuilder<IActionColumnDesc> {

  constructor() {
    super('actions', '');
  }

  action(action: IAction) {
    return this.actions([action]);
  }

  actions(actions: IAction[]) {
    if (!this.desc.actions) {
      this.desc.actions = [];
    }
    this.desc.actions!.push(...actions);
    return this;
  }

  groupAction(action: IGroupAction) {
    return this.groupActions([action]);
  }

  groupActions(actions: IGroupAction[]) {
    if (!this.desc.groupActions) {
      this.desc.groupActions = [];
    }
    this.desc.groupActions!.push(...actions);
    return this;
  }
}

/**
 * builds a actions column builder
 * @returns {ActionsColumnBuilder}
 */
export function buildActionsColumn() {
  return new ActionsColumnBuilder();
}
