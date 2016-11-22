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
  hovered: Set<number>;
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
    }
  };

  protected currentFreezeLeft = 0;
  protected currentHover = -1;

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
    if (hover === (this.currentHover === dataIndex)) {
      return;
    }
    this.currentHover = dataIndex;
    super.mouseOver(dataIndex, dataIndex >= 0);
    if (!hover || dataIndex < 0) {
      hideOverlays();
    }
    this.update();
  }

  private isHovered(dataIndex: number) {
    return this.currentHover === dataIndex;
  }

  private renderRow(ctx: CanvasRenderingContext2D, context: IBodyRenderContext&ICanvasRenderContext, ranking: IRankingData, di: IDataRow, i: number) {
    const dataIndex = di.dataIndex;
    var dx = ranking.shift;
    const dy = context.cellY(i);
    ctx.translate(dx, dy);
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
    //shift if needs to shifted and then maximal that just the shifted columns are visible
    const frozenLeft = this.currentFreezeLeft < ranking.shift ? 0 : Math.min(this.currentFreezeLeft - ranking.shift, ranking.width - ranking.frozenWidth);
    if (ranking.frozenWidth > 0 && frozenLeft > 0) {
      ctx.rect(dx + frozenLeft + ranking.frozenWidth, 0, ranking.width, context.rowHeight(i));
      ctx.clip();
    }
    ranking.columns.forEach((child) => {
      ctx.save();
      ctx.translate(child.shift, 0);
      child.renderer(ctx, di, i, dx + child.shift, dy);
      ctx.restore();
    });
    ctx.restore();

    ctx.translate(frozenLeft, 0);
    dx += frozenLeft;
    ranking.frozen.forEach((child) => {
      ctx.save();
      ctx.translate(child.shift, 0);
      child.renderer(ctx, di, i, dx + child.shift, dy);
      ctx.restore();
    });
    ctx.translate(-dx, -dy);
  }

  renderRankings(ctx: CanvasRenderingContext2D, data: IRankingData[], context: IBodyRenderContext&ICanvasRenderContext) {

    const renderRow = this.renderRow.bind(this, ctx, context);

    //asynchronous rendering!!!
    const all = Promise.all.bind(Promise);
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

  protected createContextImpl(index_shift: number): ICanvasRenderContext&IBodyRenderContext {
    const base: any = this.createContext(index_shift, createCanvas);
    base.hovered = this.isHovered.bind(this);
    base.selected = (dataIndex: number) => this.data.isSelected(dataIndex);
    return base;
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

  protected updateImpl(data: IRankingData[], context: IBodyRenderContext&ICanvasRenderContext, width: number, height: number, reason: ERenderReason) {
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

    return this.renderRankings(ctx, data, context).then(() => {
      ctx.restore();
    });
  }
}
