import Column from '../model/Column';
import {IDataRow, IGroup} from '../model';
import {ICategoricalStatistics, IStatistics} from '../internal/math';
import {
  ICellRendererFactory, default as IRenderContext, IImposer, ICellRenderer,
  IGroupCellRenderer
} from './interfaces';

/**
 * helper class that renders a group renderer as a selected (e.g. median) single item
 */
export abstract class AAggregatedGroupRenderer<T extends Column> implements ICellRendererFactory {
  abstract readonly title: string;
  abstract canRender(col: Column): boolean;

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
}

export default AAggregatedGroupRenderer;
