import {IDataRow} from '../provider/ADataProvider';
import {IGroup} from '../model/Group';
import {ICategoricalStatistics, IStatistics} from '../model/Column';

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
