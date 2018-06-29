import {IActionColumnDesc, IAction, IGroupAction} from '../../model';
import ColumnBuilder from './ColumnBuilder';

export default class ActionsColumnBuilder extends ColumnBuilder<IActionColumnDesc> {

  constructor() {
    super('actions', '');
  }

  /**
   * adds another action
   * @param action the action
   */
  action(action: IAction) {
    return this.actions([action]);
  }

  /**
   * adds multiple actions
   * @param actions list of actions
   */
  actions(actions: IAction[]) {
    if (!this.desc.actions) {
      this.desc.actions = [];
    }
    this.desc.actions!.push(...actions);
    return this;
  }

  /**
   * adds another action that is shown in group rows
   * @param action the action
   */
  groupAction(action: IGroupAction) {
    return this.groupActions([action]);
  }

  /**
   * add multiple group actions that are shown in group rows
   * @param actions list of actions
   */
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
