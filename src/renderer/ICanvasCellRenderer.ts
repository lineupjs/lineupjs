import {IDataRow, IGroup} from '../model';
import {ICategoricalStatistics, IStatistics} from '../internal/math';

interface ICanvasCellRenderer {
  /**
   * renders the current item
   * @param ctx
   * @param d
   * @param i
   */
  (ctx: CanvasRenderingContext2D, d: IDataRow, i: number, dx: number, dy: number, group: IGroup, hist: IStatistics | ICategoricalStatistics | null): void;
}

export default ICanvasCellRenderer;

export interface ICanvasGroupRenderer {
  /**
   * renders the current item
   * @param ctx
   * @param rows
   */
  (ctx: CanvasRenderingContext2D, group: IGroup, rows: IDataRow[], dx: number, dy: number, hist: IStatistics | ICategoricalStatistics | null): void;
}
