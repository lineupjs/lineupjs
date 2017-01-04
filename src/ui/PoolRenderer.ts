/**
 * Created by Samuel Gratzl on 14.08.2015.
 */

import {Selection, round, select, event as d3event} from 'd3';
import {merge} from '../utils';
import {IColumnDesc, isNumberColumn, Column} from '../model';
import DataProvider from '../provider/ADataProvider';
import {toFullTooltip} from './HeaderRenderer';

class PoolEntry {
  used: number = 0;

  constructor(public readonly desc: IColumnDesc) {

  }
}

export interface IPoolRendererOptions {
  layout?: string;
  elemWidth?: number;
  elemHeight?: number;
  width?: number;
  height?: number;
  additionalDesc?: IColumnDesc[];
  hideUsed?: boolean;
  addAtEndOnClick?: boolean;
}

export default class PoolRenderer {
  private readonly options: IPoolRendererOptions = {
    layout: 'vertical',
    elemWidth: 100,
    elemHeight: 40,
    width: 100,
    height: 500,
    additionalDesc: [],
    hideUsed: true,
    addAtEndOnClick: false
  };

  private readonly $node: Selection<any>;
  private entries: PoolEntry[];

  constructor(private data: DataProvider, parent: Element, options: IPoolRendererOptions = {}) {
    merge(this.options, options);

    this.$node = select(parent).append('div').classed('lu-pool', true);

    this.changeDataStorage(data);
  }

  changeDataStorage(data: DataProvider) {
    if (this.data) {
      this.data.on([DataProvider.EVENT_ADD_COLUMN + '.pool', DataProvider.EVENT_REMOVE_COLUMN + '.pool',
        DataProvider.EVENT_ADD_RANKING + '.pool', DataProvider.EVENT_REMOVE_RANKING + '.pool',
        DataProvider.EVENT_ADD_DESC + '.pool'], null);
    }
    this.data = data;
    this.entries = data.getColumns().concat(this.options.additionalDesc).map((d) => new PoolEntry(d));
    data.on(DataProvider.EVENT_ADD_DESC + '.pool', (desc) => {
      this.entries.push(new PoolEntry(desc));
      this.update();
    });
    if (this.options.hideUsed) {
      const that = this;
      data.on([DataProvider.EVENT_ADD_COLUMN + '.pool', DataProvider.EVENT_REMOVE_COLUMN + '.pool'], function (col) {
        const desc = col.desc, change = this.type === 'addColumn' ? 1 : -1;
        that.entries.some((entry) => {
          if (entry.desc !== desc) {
            return false;
          }
          entry.used += change;
          return true;
        });
        that.update();
      });
      data.on([DataProvider.EVENT_ADD_RANKING + '.pool', DataProvider.EVENT_REMOVE_RANKING + '.pool'], function (ranking) {
        const descs = ranking.flatColumns.map((d) => d.desc), change = this.type === 'addRanking' ? 1 : -1;
        that.entries.some((entry) => {
          if (descs.indexOf(entry.desc) < 0) {
            return false;
          }
          entry.used += change;
          return true;
        });
        that.update();
      });
      data.getRankings().forEach((ranking) => {
        const descs = ranking.flatColumns.map((d) => d.desc), change = +1;
        that.entries.some((entry) => {
          if (descs.indexOf(entry.desc) < 0) {
            return false;
          }
          entry.used += change;
        });
      });
    }
  }

  remove() {
    this.$node.remove();
    if (this.data) {
      this.data.on([DataProvider.EVENT_ADD_COLUMN + '.pool', DataProvider.EVENT_REMOVE_COLUMN + '.pool', 'addRanking.pool', 'removeRanking.pool', 'addDesc.pool'], null);
    }
  }

  update() {
    const data = this.data;
    const descToShow = this.entries.filter((e) => e.used === 0).map((d) => d.desc);
    const $headers = this.$node.selectAll('div.header').data(descToShow);
    const $headerEnter = $headers.enter().append('div').attr({
      'class': 'header',
      'draggable': true
    }).on('dragstart', (d) => {
      const e = <DragEvent>(<any>d3event);
      e.dataTransfer.effectAllowed = 'copyMove'; //none, copy, copyLink, copyMove, link, linkMove, move, all
      e.dataTransfer.setData('text/plain', d.label);
      e.dataTransfer.setData('application/caleydo-lineup-column', JSON.stringify(data.toDescRef(d)));
      if (isNumberColumn(d)) {
        e.dataTransfer.setData('application/caleydo-lineup-column-number', JSON.stringify(data.toDescRef(d)));
      }
    }).style({
      width: this.options.elemWidth + 'px',
      height: this.options.elemHeight + 'px'
    });
    if (this.options.addAtEndOnClick) {
      $headerEnter.on('click', (d) => {
        this.data.push(this.data.getLastRanking(), d);
      });
    }
    $headerEnter.append('span').classed('label', true).text((d) => d.label);
    $headers.attr('class', (d) => `header ${((<any>d).cssClass || '')} ${d.type}`);
    $headers.style({
      'transform': (d, i) => {
        const pos = this.layout(i);
        return 'translate(' + pos.x + 'px,' + pos.y + 'px)';
      },
      'background-color': (d) => {
        const s = (<any>d);
        return s.cssClass ? null : s.color || Column.DEFAULT_COLOR;
      }
    });
    $headers.attr({
      title: (d) => toFullTooltip(d)
    });
    $headers.select('span').text((d) => d.label);
    $headers.exit().remove();

    //compute the size of this node
    switch (this.options.layout) {
      case 'horizontal':
        this.$node.style({
          width: (this.options.elemWidth * descToShow.length) + 'px',
          height: (this.options.elemHeight) + 'px'
        });
        break;
      case 'grid':
        const perRow = round(this.options.width / this.options.elemWidth, 0);
        this.$node.style({
          width: perRow * this.options.elemWidth + 'px',
          height: Math.ceil(descToShow.length / perRow) * this.options.elemHeight + 'px'
        });
        break;
      //case 'vertical':
      default:
        this.$node.style({
          width: (this.options.elemWidth) + 'px',
          height: (this.options.elemHeight * descToShow.length) + 'px'
        });
        break;
    }
  }

  private layout(i: number) {
    switch (this.options.layout) {
      case 'horizontal':
        return {x: i * this.options.elemWidth, y: 0};
      case 'grid':
        const perRow = round(this.options.width / this.options.elemWidth, 0);
        return {x: (i % perRow) * this.options.elemWidth, y: Math.floor(i / perRow) * this.options.elemHeight};
      //case 'vertical':
      default:
        return {x: 0, y: i * this.options.elemHeight};
    }
  }
}
