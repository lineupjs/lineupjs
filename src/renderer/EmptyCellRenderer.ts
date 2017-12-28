import Column from '../model/Column';
import ICellRendererFactory from './ICellRendererFactory';
import IDOMCellRenderer, {IDOMGroupRenderer} from './IDOMCellRenderers';
import ICanvasCellRenderer, {ICanvasGroupRenderer} from './ICanvasCellRenderer';
import {IDataRow, IGroup} from '../model/interfaces';

export class EmptyCellRenderer implements ICellRendererFactory {
  readonly title = 'Nothing';

  canRender() {
    return false; // just direct selection
  }

  createDOM(col: Column): IDOMCellRenderer {
    return {
      template: `<div title=""></div>`,
      update: (n: HTMLDivElement, d: IDataRow) => {
        n.title = col.getLabel(d);
      }
    };
  }

  createCanvas(): ICanvasCellRenderer {
    return () => {
      //dummy
    };
  }

  createGroupDOM(): IDOMGroupRenderer {
    return {
      template: `<div title=""></div>`,
      update: (n: HTMLDivElement, group: IGroup) => {
        n.title = group.name;
      }
    };
  }

  createGroupCanvas(): ICanvasGroupRenderer {
    return () => {
      //dummy
    };
  }
}
