import {noop} from './utils';
import {ICellRendererFactory} from './interfaces';


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
}
