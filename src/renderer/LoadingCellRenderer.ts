import {ICellRendererFactory, IGroupCellRenderer, ISummaryRenderer} from './interfaces';
import {noop} from './utils';

export default class LoadingCellRenderer implements ICellRendererFactory {
  readonly title = 'Loading';

  canRender() {
    return false; // just direct selection
  }

  create() { // no typing because ICellRenderer would not be assignable to IGroupCellRenderer and ISummaryRenderer
    return {
      template: `<div>Loading &hellip;</div>`,
      update: noop
    };
  }

  createGroup(): IGroupCellRenderer {
    return this.create();
  }

  createSummary(): ISummaryRenderer {
    return this.create();
  }
}
