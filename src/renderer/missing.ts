/**
 * Created by Samuel Gratzl on 11.10.2017.
 */
import {IDataRow} from '../provider/ADataProvider';
import Column from '../model/Column';


export function renderMissingValue(ctx: CanvasRenderingContext2D, width: number, height: number, x = 0, y = 0) {
  const dashColor = '#c1c1c1';
  const dashWidth = 10;
  const dashHeight = 3;
  const dashX = (width - x - dashWidth) / 2; // center horizontally
  const dashY = (height - y - dashHeight) / 2; // center vertically
  ctx.fillStyle = dashColor;
  ctx.fillRect(dashX, dashY, dashWidth, dashHeight);
}

export function renderMissingDOM(node: HTMLElement, col: Column, d: IDataRow) {
  const missing = col.isMissing(d.v, d.dataIndex);
  node.classList.toggle('lu-missing', missing);
  return missing;
}

export function renderMissingCanvas(ctx: CanvasRenderingContext2D, col: Column, d: IDataRow, height: number, x = 0, y = 0) {
  const missing = col.isMissing(d.v, d.dataIndex);
  if (missing) {
    renderMissingValue(ctx, col.getWidth(), height, x, y);
  }
  return missing;
}
