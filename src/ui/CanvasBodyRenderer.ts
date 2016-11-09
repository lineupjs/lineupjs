/**
 * Created by Samuel Gratzl on 14.08.2015.
 */

import {max as d3max, event as d3event, mouse as d3mouse} from 'd3';
import {merge} from '../utils';
import Column from '../model/Column';
import SelectionColumn from '../model/SelectionColumn';
import {createCanvas, hideOverlays, ICanvasRenderContext} from '../renderer';
import DataProvider, {IDataRow}  from '../provider/ADataProvider';
import ABodyRenderer, {ISlicer, IRankingData, IBodyRenderContext, ERenderReason} from './ABodyRenderer';

export interface IStyleOptions {
  text?: string;
  font?: string
  slope?: string
  link?: string
  selection?: string
  hover?: string
  bg?: string
}

export interface ICurrentOptions {
  hovered: number;
}

export interface ICanvasBodyRendererOptions {
  style?: IStyleOptions;
  current?: ICurrentOptions;
}

export default class BodyCanvasRenderer extends ABodyRenderer {
  static CUSTOM_OPTIONS = {
    style: {
      text: 'black',
      font: '10pt "Helvetica Neue", Helvetica, Arial, sans-serif',
      slope: 'darkgray',
      link: 'blue',
      selection: '#ffa500',
      hover: '#e5e5e5',
      bg: '#f7f7f7',
    },
    current: {
      hovered: -1
    }
  };

  protected currentFreezeLeft = 0;

  private lastShifts: {column: Column; shift: number}[] = [];

  constructor(data: DataProvider, parent: Element, slicer: ISlicer, options: ICanvasBodyRendererOptions = {}) {
    super(data, parent, slicer, 'div', merge({}, BodyCanvasRenderer.CUSTOM_OPTIONS, options));
    this.$node.append('canvas');

    this.initInteraction();
  }

  private columnUnderMouse(x: number) {
    for (let shift of this.lastShifts) {
      if (shift.shift <= x && x < (shift.shift + shift.column.getWidth())) {
        return shift.column;
      }
    }
    return null;
  }

  private rowUnderMouse(y: number) {
    const rowHeight = this.options.rowHeight;
    return Math.floor((y + 1) / rowHeight);
  }

  private itemUnderMouse(xy: [number, number]) {
    const row = this.rowUnderMouse(xy[1]);
    if (row < 0) {
      return null;
    }
    const col = this.columnUnderMouse(xy[0]);
    if (col === null) {
      return null;
    }
    const order = col.findMyRanker().getOrder();
    return {
      dataIndex: order[row],
      column: col
    };
  }

  private initInteraction() {
    this.$node.on('selectstart', () => (<UIEvent>d3event).preventDefault());

    this.$node.on('mousemove', () => {
      const mouse = d3mouse(this.node);
      const pos = this.itemUnderMouse(mouse);
      this.mouseOver(pos ? pos.dataIndex : -1);
    });
    this.$node.on('mouseenter', () => {
      this.mouseOver(-1, false);
    });
    this.$node.on('mouseleave', () => {
      this.mouseOver(-1, false);
    });
    this.$node.on('click', () => {
      const mouse = d3mouse(this.node);
      const pos = this.itemUnderMouse(mouse);
      if (pos) {
        //additional if click on Selection Column
        this.select(pos.dataIndex, (<MouseEvent>d3event).ctrlKey || pos.column instanceof SelectionColumn);
      }
    });
  }

  /**
   * get a style
   */
  private style(name: string) {
    const o: any = this.options;
    return (o.style || {})[name];
  }

  select(dataIndex: number, additional = false) {
    var selected = super.select(dataIndex, additional);
    this.update();
    return selected;
  }

  drawSelection() {
    this.update(); //no shortcut so far
  }

  updateFreeze(left: number) {
    this.currentFreezeLeft = left;
    this.update(); //no shortcut so far
  }

  mouseOver(dataIndex: number, hover = true) {
    const o: any = this.options;
    if (o.current.hovered === dataIndex) {
      return;
    }
    o.current.hovered = dataIndex;
    super.mouseOver(dataIndex, dataIndex >= 0);
    if (!hover || dataIndex < 0) {
      hideOverlays();
    }
    this.update();
  }

  private isHovered(dataIndex: number) {
    const o: any = this.options;
    return o.current.hovered === dataIndex;
  }

  private renderRow(ctx: CanvasRenderingContext2D, context: IBodyRenderContext&ICanvasRenderContext, maxFrozen:number, ranking: IRankingData, di: IDataRow, i: number) {
    const dataIndex = di.dataIndex;
    var dx = 0, dy = 0;
    ctx.translate(dx = ranking.shift, dy = context.cellY(i));
    if (i % 2 === 0) {
      ctx.fillStyle = this.style('bg');
      ctx.fillRect(0, 0, ranking.width, context.rowHeight(i));
      ctx.fillStyle = this.style('text');
    }
    const isSelected = this.data.isSelected(dataIndex);
    if (isSelected) {
      ctx.strokeStyle = this.style('selection');
      ctx.strokeRect(0, 0, ranking.width, context.rowHeight(i));
    } else if (this.isHovered(dataIndex)) {
      ctx.strokeStyle = this.style('hover');
      ctx.strokeRect(0, 0, ranking.width, context.rowHeight(i));
    }

    //clip the remaining children
    ctx.save();
    if (maxFrozen > 0) {
      ctx.rect(this.currentFreezeLeft + maxFrozen, 0, ranking.width, context.rowHeight(i));
      ctx.clip();
    }
    ranking.columns.forEach((child) => {
      ctx.save();
      ctx.translate(child.shift, 0);
      dx += child.shift;
      child.renderer(ctx, di, i, dx, dy);
      dx -= child.shift;
      ctx.restore();
    });
    ctx.restore();

    ctx.translate(this.currentFreezeLeft, 0);
    dx += this.currentFreezeLeft;
    ranking.frozen.forEach((child) => {
      ctx.save();
      ctx.translate(child.shift, 0);
      dx += child.shift;
      child.renderer(ctx, di, i, dx, dy);
      dx -= child.shift;
      ctx.restore();
    });
    dx -= this.currentFreezeLeft;
    ctx.translate(-dx, -context.cellY(i));
  }

  renderRankings(ctx: CanvasRenderingContext2D, data: IRankingData[], context: IBodyRenderContext&ICanvasRenderContext, height: number) {
    const maxFrozen = data.length === 0 || data[0].frozen.length === 0 ? 0 : d3max(data[0].frozen, (f) => f.shift + f.column.getWidth());

    const renderRow = this.renderRow.bind(this, ctx, context, maxFrozen);

    //asynchronous rendering!!!
    const all = Promise.all;
    return all(data.map((ranking) => {
      const toRender = ranking.data;
      return all(toRender.map((p, i) => {
        // TODO render loading row
        return p.then((di: IDataRow) =>
          renderRow(ranking, di, i)
        );
      }));
    }));
  }

  renderSlopeGraphs(ctx: CanvasRenderingContext2D, data: IRankingData[], context: IBodyRenderContext&ICanvasRenderContext) {
    var slopes = data.slice(1).map((d, i) => ({left: data[i].order, left_i: i, right: d.order, right_i: i + 1}));
    ctx.save();
    ctx.strokeStyle = this.style('slope');
    slopes.forEach((slope, i) => {
      ctx.save();
      ctx.translate(data[i + 1].shift - this.options.slopeWidth, 0);

      var cache = {};
      slope.right.forEach((data_index, pos) => {
        cache[data_index] = pos;
      });
      const lines = slope.left.map((data_index, pos) => ({
        data_index: data_index,
        lpos: pos,
        rpos: cache[data_index]
      })).filter((d) => d.rpos != null);


      lines.forEach((line) => {
        const isSelected = this.data.isSelected(line.data_index);
        const isHovered = this.isHovered(line.data_index);
        if (isSelected) {
          ctx.strokeStyle = this.style('selection');
        } else if (isHovered) {
          ctx.strokeStyle = this.style('hover');
        }
        ctx.beginPath();
        ctx.moveTo(0, context.rowHeight(line.lpos) * 0.5 + context.cellY(line.lpos));
        ctx.lineTo(this.options.slopeWidth, context.rowHeight(line.rpos) * 0.5 + context.cellY(line.rpos));
        ctx.stroke();
        if (isSelected || isHovered) {
          ctx.strokeStyle = this.style('slope');
        }

      });

      ctx.restore();
    });
    ctx.restore();
  }


  protected createContextImpl(index_shift: number): IBodyRenderContext {
    return this.createContext(index_shift, createCanvas);
  }

  private computeShifts(data: IRankingData[]) {
    var r = [];
    data.forEach((d) => {
      const base = d.shift;
      r.push(...d.frozen.map((c) => ({column: c.column, shift: c.shift + base + this.currentFreezeLeft})));
      r.push(...d.columns.map((c) => ({column: c.column, shift: c.shift + base})));
    });
    return r;
  }

  protected updateImpl(data: IRankingData[], context: IBodyRenderContext, width: number, height: number, reason: ERenderReason) {
    const $canvas = this.$node.select('canvas');

    const firstLine = Math.max(context.cellY(0) - 20, 0); //where to start
    const lastLine = Math.min(context.cellY(Math.max(...data.map((d) => d.order.length))) + 20, height);

    this.$node.style({
      width: Math.max(0, width) + 'px',
      height: height + 'px'
    });

    $canvas.attr({
      width: Math.max(0, width),
      height: lastLine - firstLine
    }).style('margin-top', firstLine + 'px');

    this.lastShifts = this.computeShifts(data);


    const ctx = (<HTMLCanvasElement>$canvas.node()).getContext('2d');
    ctx.save();
    ctx.font = this.style('font');
    ctx.textBaseline = 'top';
    ctx.fillStyle = this.style('text');
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.translate(0, -firstLine);

    this.renderSlopeGraphs(ctx, data, context);

    this.renderRankings(ctx, data, context, height).then(() => {
      ctx.restore();
    });
  }
}
