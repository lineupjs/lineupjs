import {IDataRow} from '../provider/ADataProvider';

interface ICanvasCellRenderer {
  /**
   * renders the current item
   * @param ctx
   * @param d
   * @param i
   */
  (ctx: CanvasRenderingContext2D, d: IDataRow, i: number, dx: number, dy: number): void;
}

export default ICanvasCellRenderer;
