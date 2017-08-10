import Column from '../model/Column';
import ICellRendererFactory from './ICellRendererFactory';
import IDOMCellRenderer from './IDOMCellRenderers';
import ICanvasCellRenderer from './ICanvasCellRenderer';
import {IDataRow} from '../provider/ADataProvider';

export class EmptyCellRenderer implements ICellRendererFactory {

  createDOM(col: Column): IDOMCellRenderer {
    return {
      template: `<div title=""></div>`,
      update: (n: HTMLDivElement, d: IDataRow) => {
        n.title = col.getLabel(d.v, d.dataIndex);
      }
    };
  }

  createCanvas(): ICanvasCellRenderer {
    return () => {
      //dummy
    };
  }
}
