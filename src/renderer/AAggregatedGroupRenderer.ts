import {ICategoricalStatistics, IStatistics} from '../internal';
import {IDataRow, IGroup} from '../model';
import Column from '../model/Column';
import {
  default as IRenderContext, ERenderMode, ICellRenderer, ICellRendererFactory, IGroupCellRenderer,
  IImposer
} from './interfaces';
import {noRenderer} from './utils';

/**
 * helper class that renders a group renderer as a selected (e.g. median) single item
 * @internal
 */
export abstract class AAggregatedGroupRenderer<T extends Column> implements ICellRendererFactory {
  abstract readonly title: string;

  abstract canRender(col: Column, mode: ERenderMode): boolean;

  abstract create(col: T, context: IRenderContext, hist: IStatistics | ICategoricalStatistics | null, imposer?: IImposer): ICellRenderer;

  protected abstract aggregatedIndex(rows: IDataRow[], col: T): number;

  createGroup(col: T, context: IRenderContext, hist: IStatistics | ICategoricalStatistics | null, imposer?: IImposer): IGroupCellRenderer {
    const single = this.create(col, context, hist, imposer);
    return {
      template: `<div>${single.template}</div>`,
      update: (node: HTMLElement, group: IGroup, rows: IDataRow[]) => {
        const aggregate = this.aggregatedIndex(rows, col);
        single.update(<HTMLElement>node.firstElementChild!, rows[aggregate], aggregate, group);
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
