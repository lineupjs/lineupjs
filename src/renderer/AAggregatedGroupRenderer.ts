import {IDataRow, IGroupMeta, IOrderedGroup} from '../model';
import Column from '../model/Column';
import {
  default as IRenderContext, ERenderMode, ICellRenderer, ICellRendererFactory, IGroupCellRenderer,
  IImposer
} from './interfaces';
import {noRenderer} from './utils';
import {ISequence} from '../internal/interable';

/**
 * helper class that renders a group renderer as a selected (e.g. median) single item
 * @internal
 */
export abstract class AAggregatedGroupRenderer<T extends Column> implements ICellRendererFactory {
  abstract readonly title: string;

  abstract canRender(col: Column, mode: ERenderMode): boolean;

  abstract create(col: T, context: IRenderContext, imposer?: IImposer): ICellRenderer;

  protected abstract aggregatedIndex(rows: ISequence<IDataRow>, col: T): {row: IDataRow, index: number};

  createGroup(col: T, context: IRenderContext, imposer?: IImposer): IGroupCellRenderer {
    const single = this.create(col, context, imposer);
    return {
      template: `<div>${single.template}</div>`,
      update: (node: HTMLElement, group: IOrderedGroup, groupMeta: IGroupMeta) => {
        return context.tasks.groupRows(col, group, (rows) => {
          return this.aggregatedIndex(rows, col);
        }, (data) => {
          single.update(<HTMLElement>node.firstElementChild!, data.row, data.index, group, groupMeta);
        });
      }
    };
  }

  createSummary() {
    return noRenderer;
  }
}

/**
 * @internal
 */
export default AAggregatedGroupRenderer;
