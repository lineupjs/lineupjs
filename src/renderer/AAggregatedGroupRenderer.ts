import ICellRendererFactory from './ICellRendererFactory';
import Column, {ICategoricalStatistics, IStatistics} from '../model/Column';
import {ICanvasRenderContext, IDOMRenderContext} from './RendererContexts';
import {default as ICanvasCellRenderer, ICanvasGroupRenderer} from './ICanvasCellRenderer';
import {IGroup} from '../model/Group';
import {IDataRow} from '../provider/ADataProvider';
import {IDOMCellRenderer, IDOMGroupRenderer} from './IDOMCellRenderers';

/**
 * helper class that renders a group renderer as a selected (e.g. median) single item
 */
export abstract class AAggregatedGroupRenderer<T extends Column> implements ICellRendererFactory {
  abstract readonly title: string;
  abstract canRender(col: Column): boolean;

  abstract createDOM(col: T, context: IDOMRenderContext): IDOMCellRenderer;

  abstract createCanvas(col: T, context: ICanvasRenderContext): ICanvasCellRenderer;

  protected abstract aggregatedIndex(rows: IDataRow[], col: T): number;

  createGroupDOM(col: T, context: IDOMRenderContext): IDOMGroupRenderer {
    const single = this.createDOM(col, context);
    return {
      template: `<div>${single.template}</div>`,
      update: (node: HTMLElement, group: IGroup, rows: IDataRow[], hist: IStatistics | ICategoricalStatistics | null) => {
        const aggregate = this.aggregatedIndex(rows, col);
        single.update(<HTMLElement>node.firstElementChild!, rows[aggregate], aggregate, group, hist);
      }
    };
  }

  createGroupCanvas(col: T, context: ICanvasRenderContext): ICanvasGroupRenderer {
    const single = this.createCanvas(col, context);
    return (ctx: CanvasRenderingContext2D, group: IGroup, rows: IDataRow[], dx: number, dy: number, hist: IStatistics | ICategoricalStatistics | null) => {
      const aggregate = this.aggregatedIndex(rows, col);
      const shift = (context.groupHeight(group) - context.rowHeight(aggregate)) / 2;
      ctx.translate(0, shift);
      single(ctx, rows[aggregate], aggregate, dx, dy + shift, group, hist);
      ctx.translate(0, -shift);
    };
  }
}

export default AAggregatedGroupRenderer;
