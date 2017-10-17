/**
 * Created by Samuel Gratzl on 14.08.2015.
 */

import {event as d3event, mouse as d3mouse} from 'd3';
import {createTextHints, hideOverlays, merge} from '../utils';
import Column, {ICategoricalStatistics, IStatistics} from '../model/Column';
import SelectionColumn from '../model/SelectionColumn';
import {createCanvas, createCanvasGroup} from '../renderer/index';
import DataProvider, {IDataRow} from '../provider/ADataProvider';
import ABodyRenderer, {IBodyRenderContext, IGroupedRangkingData, IRankingData, ISlicer} from './ABodyRenderer';
import {ICanvasRenderContext} from '../renderer/RendererContexts';

export interface IStyleOptions {
  text?: string;
  font?: string;
  slope?: string;
  link?: string;
  selection?: string;
  hover?: string;
  bg?: string;
  meanLine?: string;
  histogram?: string;
}

export interface ICanvasBodyRendererOptions {
  style?: IStyleOptions;
}

export default class BodyCanvasRenderer extends ABodyRenderer {
  static readonly CUSTOM_OPTIONS = {
    style: {
      text: 'black',
      font: '10pt "Helvetica Neue", Helvetica, Arial, sans-serif',
      slope: 'darkgray',
      link: 'blue',
      selection: '#ffa500',
      hover: '#e5e5e5',
      bg: '#f7f7f7',
      meanLine: 'darkgray',
      histogram: 'lightgray',
      boxplot: {
        box: '#e0e0e0',
        stroke: 'black',
        sortIndicator: '#ffa500'
      },
      upset: {
        circle: 'black',
        inactiveOpacity: 0.1,
        stroke: 'black'
      }
    }
  };

  protected currentFreezeLeft = 0;
  protected currentHover = -1;

  private lastShifts: { column: Column; shift: number }[] = [];

  constructor(data: DataProvider, parent: Element, slicer: ISlicer, options: ICanvasBodyRendererOptions = {}) {
    super(data, parent, slicer, 'div', merge({}, BodyCanvasRenderer.CUSTOM_OPTIONS, options));
    this.$node.append('canvas');

    this.initInteraction();
  }

  private columnUnderMouse(x: number) {
    for (const shift of this.lastShifts) {
      if (shift.shift <= x && x < (shift.shift + shift.column.getWidth())) {
        return shift.column;
      }
    }
    return null;
  }

  private rowUnderMouse(y: number) {
    //TODO doesn't support grouping
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
    const order = col.findMyRanker()!.getOrder();
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
    const selected = super.select(dataIndex, additional);
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
    if (hover === (this.currentHover === dataIndex)) {
      return;
    }
    this.currentHover = dataIndex;
    super.mouseOver(dataIndex, dataIndex >= 0);
    if (!hover || dataIndex < 0) {
      hideOverlays(<HTMLElement>this.$node.node());
    }
    this.update();
  }

  private isHovered(dataIndex: number) {
    return this.currentHover === dataIndex;
  }

  private renderRow(ctx: CanvasRenderingContext2D, context: IBodyRenderContext & ICanvasRenderContext, ranking: IRankingData, di: IDataRow, i: number, group: IGroupedRangkingData) {
    const dataIndex = di.dataIndex;
    let dx = ranking.shift;
    const dy = context.cellY(i) + group.y;
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
      child.renderer(ctx, di, i, dx + child.shift, dy, group.group);
      ctx.restore();
    });
    ctx.restore();

    ctx.translate(frozenLeft, 0);
    dx += frozenLeft;
    ranking.frozen.forEach((child) => {
      ctx.save();
      ctx.translate(child.shift, 0);
      child.renderer(ctx, di, i, dx + child.shift, dy, group);
      ctx.restore();
    });
    ctx.translate(-dx, -dy);
  }

  private renderMeanlines(ctx: CanvasRenderingContext2D, ranking: IRankingData, y: number, height: number) {
    const cols = ranking.columns.filter((c) => this.showMeanLine(c.column));
    return Promise.all(cols.map((d) => {
      const h = this.histCache.get(d.column.id);
      if (!h) {
        return;
      }
      return Promise.resolve(h).then((stats: IStatistics) => {
        const xPos = ranking.shift + d.shift + d.column.getWidth() * stats.mean;
        if (isNaN(xPos)) {
          return;
        }
        ctx.strokeStyle = this.style('meanLine');
        ctx.beginPath();
        ctx.moveTo(xPos, y);
        ctx.lineTo(xPos, y + height);
        ctx.stroke();
      });
    }));
  }

  private renderGroup(ctx: CanvasRenderingContext2D, ranking: IRankingData, group: IGroupedRangkingData, rows: IDataRow[], hists: Map<string, IStatistics | ICategoricalStatistics>) {
    let dx = ranking.shift;
    const dy = group.y;
    ctx.translate(dx, dy);

    //clip the remaining children
    ctx.save();
    //shift if needs to shifted and then maximal that just the shifted columns are visible
    const frozenLeft = this.currentFreezeLeft < ranking.shift ? 0 : Math.min(this.currentFreezeLeft - ranking.shift, ranking.width - ranking.frozenWidth);
    if (ranking.frozenWidth > 0 && frozenLeft > 0) {
      ctx.rect(dx + frozenLeft + ranking.frozenWidth, 0, ranking.width, group.height);
      ctx.clip();
    }
    ranking.columns.forEach((child) => {
      ctx.save();
      ctx.translate(child.shift, 0);
      child.groupRenderer(ctx, group.group, rows, dx + child.shift, dy, hists.get(child.column.id));
      ctx.restore();
    });
    ctx.restore();

    ctx.translate(frozenLeft, 0);
    dx += frozenLeft;
    ranking.frozen.forEach((child) => {
      ctx.save();
      ctx.translate(child.shift, 0);
      child.groupRenderer(ctx, group.group, rows, dx + child.shift, dy, hists.get(child.column.id));
      ctx.restore();
    });
    ctx.translate(-dx, -dy);
  }

  renderRankings(ctx: CanvasRenderingContext2D, data: IRankingData[], context: IBodyRenderContext & ICanvasRenderContext) {

    const renderRow = this.renderRow.bind(this, ctx, context);
    const renderGroup = this.renderGroup.bind(this, ctx);


    //asynchronous rendering!!!
    const all = Promise.all.bind(Promise);
    return all(data.map((ranking) => {
      let histMap: Promise<Map<string, IStatistics | ICategoricalStatistics>>;
      return all(ranking.groups.map((group) => {
        if (group.aggregate) {
          if (histMap == null) {
            histMap = this.resolveHistMap(ranking);
          }
          return Promise.all([all(group.data), histMap]).then((data) => {
            const rows = data[0];
            const hists = data[1];
            return renderGroup(ranking, group, rows, hists);
          });
        }
        const toRender = group.data;
        return all(toRender.map((p, i) => {
          // TODO render loading row
          return Promise.resolve(p).then((di: IDataRow) =>
            renderRow(ranking, di, i, group)
          );
        })).then(() => this.renderMeanlines(ctx, ranking, group.y, group.height));
      }));
    }));
  }

  renderSlopeGraphs(ctx: CanvasRenderingContext2D, data: IRankingData[], context: IBodyRenderContext & ICanvasRenderContext) {
    const slopes = data.slice(1).map((d, i) => ({
      left: data[i].groups[0].order,
      left_i: i,
      right: d.groups[0].order,
      right_i: i + 1
    }));
    ctx.save();
    ctx.strokeStyle = this.style('slope');
    slopes.forEach((slope, i) => {
      ctx.save();
      ctx.translate(data[i + 1].shift - this.options.slopeWidth, 0);

      const cache = new Map<number, number>();
      slope.right.forEach((dataIndex, pos) => {
        cache.set(dataIndex, pos);
      });
      const lines = slope.left.map((dataIndex, pos) => ({
        dataIndex,
        lpos: pos,
        rpos: cache.get(dataIndex)!
      })).filter((d) => d.rpos != null);


      lines.forEach((line) => {
        const isSelected = this.data.isSelected(line.dataIndex);
        const isHovered = this.isHovered(line.dataIndex);
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

  protected createContextImpl(indexShift: number, totalNumberOfRows: number): ICanvasRenderContext & IBodyRenderContext {
    const base: any = this.createContext(indexShift, totalNumberOfRows, createCanvas, createCanvasGroup);
    base.hovered = this.isHovered.bind(this);
    base.groupHovered = () => false; // TODO support grouping hovering
    base.selected = (dataIndex: number) => this.data.isSelected(dataIndex);
    (<any>base).bodyDOMElement = <HTMLElement>this.$node.node();
    base.rowHeight = () => this.options.rowHeight;
    base.groupHeight = () => this.options.groupHeight;
    base.colWidth = (col: Column) => col.getWidth();
    return base;
  }

  private computeShifts(data: IRankingData[]) {
    const r: { column: Column; shift: number }[] = [];
    data.forEach((d) => {
      const base = d.shift;
      r.push(...d.frozen.map((c) => ({column: c.column, shift: c.shift + base + this.currentFreezeLeft})));
      r.push(...d.columns.map((c) => ({column: c.column, shift: c.shift + base})));
    });
    return r;
  }

  protected updateImpl(data: IRankingData[], context: IBodyRenderContext & ICanvasRenderContext, width: number, height: number) {
    const $canvas = this.$node.select('canvas');

    const firstLine = Math.max(context.cellY(0) - 20, 0); //where to start
    const lastLine = Math.min(Math.max(...data.map((d) => d.height)) + 20, height);

    this.$node.style({
      width: `${Math.max(0, width)}px`,
      height: `${height}px`
    });

    $canvas.attr({
      width: Math.max(0, width),
      height: lastLine - firstLine
    }).style('margin-top', `${firstLine}px`);

    this.lastShifts = this.computeShifts(data);


    const ctx = (<HTMLCanvasElement>$canvas.node()).getContext('2d')!;
    ctx.save();
    ctx.font = this.style('font');
    ctx.textBaseline = 'top';
    ctx.fillStyle = this.style('text');
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    //hacky to set to since I'm creating the context, okish
    (<any>context).textHints = createTextHints(ctx, this.style('font'));

    ctx.translate(0, -firstLine);

    this.renderSlopeGraphs(ctx, data, context);

    return this.renderRankings(ctx, data, context).then(() => {
      ctx.restore();
    });
  }
}
