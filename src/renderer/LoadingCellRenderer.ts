import {ICellRendererFactory} from './interfaces';
import {noop} from './utils';

export default class LoadingCellRenderer implements ICellRendererFactory {
  readonly title = 'Loading';

  canRender() {
    return false; // just direct selection
  }

  create() {
    return {
      template: `<div>Loading…</div>`,
      update: noop,
      render: noop
    };
  }

  createGroup() {
    return this.create();
  }

  createSummary() {
    return this.create();
  }
}
