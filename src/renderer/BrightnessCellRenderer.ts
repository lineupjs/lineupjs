import { hsl } from 'd3-color';
import {
  Column,
  isNumbersColumn,
  IDataRow,
  INumberColumn,
  isNumberColumn,
  isMapAbleColumn,
  DEFAULT_COLOR,
  SolidColorFunction,
} from '../model';
import { CANVAS_HEIGHT, cssClass } from '../styles';
import { colorOf } from './impose';
import {
  IRenderContext,
  ERenderMode,
  ICellRendererFactory,
  IImposer,
  ICellRenderer,
  IGroupCellRenderer,
  ISummaryRenderer,
} from './interfaces';
import { renderMissingCanvas, renderMissingDOM } from './missing';
import { noRenderer, setText } from './utils';

export function toHeatMapColor(v: number | null, row: IDataRow, col: INumberColumn, imposer?: IImposer) {
  if (v == null || Number.isNaN(v)) {
    v = 1; // max = brightest
  }
  if (imposer || !isMapAbleColumn(col)) {
    //hsl space encoding, encode in lightness
    const color = hsl(colorOf(col, row, imposer, v) || DEFAULT_COLOR);
    color.l = 1 - v; // largest value = darkest color
    return color.toString();
  }
  const map = col.getColorMapping();
  const valueColor = map.apply(v);
  if (map instanceof SolidColorFunction) {
    //hsl space encoding, encode in lightness
    const color = hsl(valueColor);
    color.l = 1 - v; // largest value = darkest color
    return color.toString();
  }
  // some custom logic that maps to another value
  return valueColor;
}

export default class BrightnessCellRenderer implements ICellRendererFactory {
  readonly title: string = 'Brightness';

  canRender(col: Column, mode: ERenderMode): boolean {
    return isNumberColumn(col) && mode === ERenderMode.CELL && !isNumbersColumn(col);
  }

  create(col: INumberColumn, context: IRenderContext, imposer?: IImposer): ICellRenderer {
    const width = context.colWidth(col);
    return {
      template: `<div title="">
        <div class="${cssClass('cat-color')}" style="background-color: ${DEFAULT_COLOR}"></div><div class="${cssClass(
        'cat-label'
      )}"> </div>
      </div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        const missing = renderMissingDOM(n, col, d);
        n.title = col.getLabel(d);
        (n.firstElementChild! as HTMLDivElement).style.backgroundColor = missing
          ? null
          : toHeatMapColor(col.getNumber(d), d, col, imposer);
        setText(n.lastElementChild!, n.title);
      },
      render: (ctx: CanvasRenderingContext2D, d: IDataRow) => {
        if (renderMissingCanvas(ctx, col, d, width)) {
          return;
        }
        ctx.fillStyle = toHeatMapColor(col.getNumber(d), d, col, imposer);
        ctx.fillRect(0, 0, width, CANVAS_HEIGHT);
      },
    };
  }

  createGroup(): IGroupCellRenderer {
    return noRenderer;
  }

  createSummary(): ISummaryRenderer {
    return noRenderer;
  }
}
