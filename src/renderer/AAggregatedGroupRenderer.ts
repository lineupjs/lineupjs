import {ISequence} from '../internal';
import {Column, IDataRow, IOrderedGroup} from '../model';
import {ERenderMode, ICellRenderer, ICellRendererFactory, IGroupCellRenderer, IImposer, IRenderContext} from './interfaces';
import {noRenderer} from './utils';

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
      template: single.template,
      update: (node: HTMLElement, group: IOrderedGroup) => {
        return context.tasks.groupRows(col, group, 'aagreated', (rows) => this.aggregatedIndex(rows, col)).then((data) => {
          if (typeof data !== 'symbol') {
            single.update(node, data.row, data.index, group);
          }
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
