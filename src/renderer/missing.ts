import {IDataRow} from '../model';
import Column from '../model/Column';
import {CANVAS_HEIGHT, DASH, cssClass} from '../styles';

export function renderMissingValue(ctx: CanvasRenderingContext2D, width: number, height: number, x = 0, y = 0) {

  const dashX = Math.max(0, (width - x - DASH.width) / 2); // center horizontally
  const dashY = Math.max(0, (height - y - DASH.height) / 2); // center vertically
  ctx.fillStyle = DASH.color;
  ctx.fillRect(dashX, dashY, Math.min(width, DASH.width), Math.min(height, DASH.height));
}

export function renderMissingDOM(node: HTMLElement, col: Column, d: IDataRow) {
  const missing = col.isMissing(d);
  node.classList.toggle(cssClass('missing'), missing);
  return missing;
}

export function renderMissingCanvas(ctx: CanvasRenderingContext2D, col: Column, d: IDataRow, width: number, x = 0, y = 0) {
  const missing = col.isMissing(d);
  if (missing) {
    renderMissingValue(ctx, width, CANVAS_HEIGHT, x, y);
  }
  return missing;
}
