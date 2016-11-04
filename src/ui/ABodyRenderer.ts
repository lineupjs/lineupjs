/**
 * Created by Samuel Gratzl on 14.08.2015.
 */

import * as d3 from 'd3';
import {merge, delayedCall, AEventDispatcher} from '../utils';
import {Ranking, isNumberColumn} from '../model';
import Column, {IStatistics} from '../model/Column';
import {IMultiLevelColumn, isMultiLevelColumn} from '../model/CompositeColumn';
import DataProvider, {IDataRow} from '../provider/ADataProvider';
import {IRenderContext, renderers as defaultRenderers, ICellRendererFactory} from '../renderer';

export interface ISlicer {
  (start: number, length: number, row2y: (i: number) => number): { from: number; to: number };
}

export interface IBodyRenderer extends AEventDispatcher {
  histCache: d3.Map<Promise<IStatistics>>;

  node: Element;

  setOption(key: string, value: any);

  changeDataStorage(data: DataProvider);

  select(dataIndex: number, additional?: boolean);

  updateFreeze(left: number);

  update();
}

export interface IBodyRenderContext extends IRenderContext<any> {
  cellY(index: number): number;
  cellPrevY(index: number): number;
}

export interface IRankingColumnData {
  column: Column;
  renderer: any;
  shift: number;
}

export interface IRankingData {
  id: string;
  ranking: Ranking;
  order: number[];
  shift: number;
  width: number;
  frozen: IRankingColumnData[];
  columns: IRankingColumnData[];
  data: Promise<IDataRow>[];
}

export interface IBodyRendererOptions {
  rowHeight?: number;
  rowPadding?: number;
  rowBarPadding?: number;
  idPrefix?: string;
  slopeWidth?: number;
  columnPadding?: number;
  stacked?: boolean;
  animation?: boolean;
  animationDuration?: number;

  renderers?: {[key: string]: ICellRendererFactory},

  meanLine?: boolean;

  actions?: { name: string, icon: string, action(v: any):void }[];

  freezeCols?: number;
}

abstract class ABodyRenderer extends AEventDispatcher implements IBodyRenderer {
  protected options : IBodyRendererOptions = {
    rowHeight: 20,
    rowPadding: 1,
    rowBarPadding: 1,
    idPrefix: '',
    slopeWidth: 150,
    columnPadding: 5,
    stacked: true,
    animation: false, //200
    animationDuration: 1000,

    renderers: merge({}, defaultRenderers),

    meanLine: false,

    actions: [],

    freezeCols: 0
  };

  protected $node: d3.Selection<any>;

  histCache = d3.map<Promise<IStatistics>>();

  constructor(protected data: DataProvider, parent: Element, private slicer: ISlicer, root: string, options : IBodyRendererOptions = {}) {
    super();
    //merge options
    merge(this.options, options);

    this.$node = d3.select(parent).append(root).classed('lu-body', true);

    this.changeDataStorage(data);
  }

  createEventList() {
    return super.createEventList().concat(['hoverChanged', 'renderFinished']);
  }

  get node() {
    return <HTMLElement>this.$node.node();
  }

  setOption(key: string, value: any) {
    this.options[key] = value;
  }

  changeDataStorage(data: DataProvider) {
    if (this.data) {
      this.data.on(['dirtyValues.bodyRenderer', 'selectionChanged.bodyRenderer'], null);
    }
    this.data = data;
    data.on('dirtyValues.bodyRenderer', delayedCall(this.update.bind(this), 1));
    data.on('selectionChanged.bodyRenderer', delayedCall((selection, jumpToFirst) => {
      if (jumpToFirst && selection.length > 0) {
        this.jumpToSelection();
      }
      this.drawSelection();
    }, 1));
  }

  protected jumpToSelection() {
    const indices = this.data.getSelection();
    const rankings = this.data.getRankings();
    if (indices.length <= 0 || rankings.length <= 0) {
      return;
    }
    const order = rankings[0].getOrder();
    const visibleRange = this.slicer(0, order.length, (i) => i * this.options.rowHeight);
    const visibleOrder = order.slice(visibleRange.from, visibleRange.to);
    //if any of the selected indices is in the visible range - done
    if (indices.some((d) => visibleOrder.indexOf(d) >= 0)) {
      return;
    }
    //TODO find the closest not visible one in the indices list
    //
  }

  protected showMeanLine(col: Column) {
    //show mean line if option is enabled and top level
    return this.options.meanLine && isNumberColumn(col) && !col.getCompressed() && col.parent instanceof Ranking;
  }

  protected createContext(index_shift: number, creator: (col: Column, renderers: {[key: string]: ICellRendererFactory}, context: IRenderContext<any>)=> any): IBodyRenderContext {
    const options = this.options;

    function findOption(key: string, default_: any) {
      if (key in options) {
        return options[key];
      }
      if (key.indexOf('.') > 0) {
        let p = key.substring(0, key.indexOf('.'));
        key = key.substring(key.indexOf('.') + 1);
        if (p in options && key in options[p]) {
          return options[p][key];
        }
      }
      return default_;
    }

    return {
      cellY: (index: number) => (index + index_shift) * (this.options.rowHeight),
      cellPrevY: (index: number) => (index + index_shift) * (this.options.rowHeight),

      idPrefix: options.idPrefix,

      option: findOption,

      rowHeight(index: number) {
        return options.rowHeight - options.rowPadding;
      },

      renderer(col: Column) {
        return creator(col, options.renderers, this);
      }
    };
  }

  protected animated<T>($rows: d3.Selection<T>): d3.Selection<T> {
    if (this.options.animationDuration > 0 && this.options.animation) {
      return <any>$rows.transition().duration(this.options.animationDuration);
    }
    return $rows;
  }

  private createData(rankings: Ranking[], orders: number[][], shifts: any[], context: IRenderContext<any>): IRankingData[] {
    const data = this.data.fetch(rankings.map((r) => r.getOrder()));

    return rankings.map((r, i) => {
      const cols = r.children.filter((d) => !d.isHidden());
      const s = shifts[i];
      const order = orders[i];
      const colData = cols.map((c, j) => ({
        column: c,
        renderer: context.renderer(c),
        shift: s.shifts[j]
      }));
      return {
        id: r.id,
        ranking: r,
        order: order,
        shift: s.shift,
        width: s.width,
        //compute frozen columns just for the first one
        frozen: i === 0 ? colData.slice(0,this.options.freezeCols) : [],
        columns: i === 0 ? colData.slice(this.options.freezeCols) : colData,
        data: data[i]
      };
    });
  }

  select(dataIndex: number, additional = false) {
    return this.data.toggleSelection(dataIndex, additional);
  }

  abstract drawSelection();

  mouseOver(dataIndex: number, hover = true) {
    this.fire('hoverChanged', hover ? dataIndex : -1);
  }


  abstract updateFreeze(left: number);

  /**
   * render the body
   */
  /**
   * render the body
   */
  update() {
    const rankings = this.data.getRankings();
    const maxElems = d3.max(rankings, (d) => d.getOrder().length) || 0;
    const height = this.options.rowHeight * maxElems;
    const visibleRange = this.slicer(0, maxElems, (i) => i * this.options.rowHeight);
    const orderSlicer = (order: number[]) => {
      if (visibleRange.from === 0 && order.length <= visibleRange.to) {
        return order;
      }
      return order.slice(visibleRange.from, Math.min(order.length, visibleRange.to));
    };
    const orders = rankings.map((r) => orderSlicer(r.getOrder()));

    //compute offsets and shifts for individual rankings and columns inside the rankings
    var offset = 0,
      shifts = rankings.map((d, i) => {
        var r = offset;
        offset += this.options.slopeWidth;
        var o2 = 0,
          shift2 = d.children.filter((d) => !d.isHidden()).map((o) => {
            var r = o2;
            o2 += (o.getCompressed() ? Column.COMPRESSED_WIDTH : o.getWidth()) + this.options.columnPadding;
            if (isMultiLevelColumn(o) && !(<IMultiLevelColumn>o).getCollapsed() && !o.getCompressed()) {
              o2 += this.options.columnPadding * ((<IMultiLevelColumn>o).length - 1);
            }
            return r;
          });
        offset += o2;
        return {
          shift: r,
          shifts: shift2,
          width: o2
        };
      });

    const context = this.createContextImpl(visibleRange.from);
    const data = this.createData(rankings, orders, shifts, context);
    this.updateImpl(data, context, offset, height);
  }

  protected abstract createContextImpl(index_shift: number): IBodyRenderContext;

  protected abstract updateImpl(data: IRankingData[], context: IBodyRenderContext, offset: number, height: number);
}

export default ABodyRenderer;
