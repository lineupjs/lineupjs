import type { ISequence } from '../internal';
import type { Column, IDataRow, IOrderedGroup } from '../model';
import type {
  ERenderMode,
  ICellRenderer,
  ICellRendererFactory,
  IGroupCellRenderer,
  IImposer,
  IRenderContext,
  ISummaryRenderer,
} from './interfaces';
import { noRenderer } from './utils';

/**
 * helper class that renders a group renderer as a selected (e.g. median) single item
 */
export abstract class AAggregatedGroupRenderer<T extends Column> implements ICellRendererFactory {
  abstract readonly title: string;

  abstract canRender(col: Column, mode: ERenderMode): boolean;

  abstract create(col: T, context: IRenderContext, imposer?: IImposer): ICellRenderer;

  protected abstract aggregatedIndex(rows: ISequence<IDataRow>, col: T): { row: IDataRow; index: number };

  createGroup(col: T, context: IRenderContext, imposer?: IImposer): IGroupCellRenderer {
    const single = this.create(col, context, imposer);
    return {
      template: single.template,
      update: (node: HTMLElement, group: IOrderedGroup) => {
        return context.tasks
          .groupRows(col, group, 'aggregated', (rows) => this.aggregatedIndex(rows, col))
          .then((data) => {
            if (typeof data !== 'symbol') {
              single.update(node, data.row, data.index, group);
            }
          });
      },
    };
  }

  createSummary(): ISummaryRenderer {
    return noRenderer;
  }
}

export default AAggregatedGroupRenderer;
