

import ICellRendererFactory from './ICellRendererFactory';
import Column from '../model/Column';
import {ICanvasRenderContext, IDOMRenderContext} from './RendererContexts';
import {ISVGCellRenderer, ISVGGroupRenderer} from './IDOMCellRenderers';
import {default as ICanvasCellRenderer, ICanvasGroupRenderer} from './ICanvasCellRenderer';
import {IGroup} from '../model/Group';
import {IDataRow} from '../provider/ADataProvider';

export abstract class AAggregatedGroupRenderer<T extends Column> implements ICellRendererFactory {
  abstract createSVG(col: T, context: IDOMRenderContext): ISVGCellRenderer;
  abstract createCanvas(col: T, context: ICanvasRenderContext): ICanvasCellRenderer;

  protected abstract aggregatedIndex(rows: IDataRow[], col: T): number;

  createGroupSVG(col: T, context: IDOMRenderContext): ISVGGroupRenderer {
    const single = this.createSVG(col, context);
    return {
      template: `<g>${single.template}</g>`,
      update: (node: SVGGElement, group: IGroup, rows: IDataRow[]) => {
        const aggregate = this.aggregatedIndex(rows, col);
        single.update(<SVGElement>node.firstElementChild, rows[aggregate], aggregate, group);
      }
    };
  }

  createGroupCanvas(col: T, context: ICanvasRenderContext): ICanvasGroupRenderer {
    const single = this.createCanvas(col, context);
    return (ctx: CanvasRenderingContext2D, group: IGroup, rows: IDataRow[], dx: number, dy: number) => {
      const aggregate = this.aggregatedIndex(rows, col);
      single(ctx, rows[aggregate], aggregate, dx, dy, group);
    };
  }
}

export default AAggregatedGroupRenderer;
