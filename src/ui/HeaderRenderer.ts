/**
 * Created by Samuel Gratzl on 14.08.2015.
 */

import * as d3 from 'd3';
import {merge, dropAble, delayedCall, forEach} from '../utils';
import Column, {IStatistics, ICategoricalStatistics, IFlatColumn} from '../model/Column';
import StringColumn from '../model/StringColumn';
import Ranking from '../model/Ranking';
import {IMultiLevelColumn, isMultiLevelColumn} from '../model/CompositeColumn';
import NumberColumn, {isNumberColumn} from '../model/NumberColumn';
import CategoricalColumn, {isCategoricalColumn} from '../model/CategoricalColumn';
import RankColumn from '../model/RankColumn';
import StackColumn from '../model/StackColumn';
import LinkColumn from '../model/LinkColumn';
import ScriptColumn from '../model/ScriptColumn';
import DataProvider from '../provider/ADataProvider';
import {
  filterDialogs,
  openEditWeightsDialog,
  openEditLinkDialog,
  openEditScriptDialog,
  openRenameDialog,
  openSearchDialog
} from '../ui_dialogs';
import ADataProvider from "../provider/ADataProvider";

/**
 * utility function to generate the tooltip text with description
 * @param col the column
 */
export function toFullTooltip(col: { label: string, description?: string}) {
  var base = col.label;
  if (col.description != null && col.description !== '') {
    base += '\n' + col.description;
  }
  return base;
}

export interface IRankingHook {
  ($node: d3.Selection<Ranking>): void;
}

export function dummyRankingButtonHook() {
  return null;
}

export interface IHeaderRendererOptions {
  idPrefix?: string;
  slopeWidth?: number;
  columnPadding?: number;
  headerHistogramHeight?: number;
  headerHeight?: number;
  manipulative?: boolean;
  histograms?: boolean;

  filterDialogs?: { [type: string]: (col: Column, $header: d3.Selection<Column>, data: ADataProvider, idPrefix: string)=>void };
  linkTemplates?: string[];
  searchAble?(col: Column): boolean;
  sortOnLabel?: boolean;

  autoRotateLabels?: boolean;
  rotationHeight?: number;
  rotationDegree?: number;

  freezeCols?: number;

  rankingButtons?: IRankingHook;
}


export default class HeaderRenderer {
  private options: IHeaderRendererOptions = {
    idPrefix: '',
    slopeWidth: 150,
    columnPadding: 5,
    headerHistogramHeight: 40,
    headerHeight: 20,
    manipulative: true,
    histograms: false,

    filterDialogs: filterDialogs(),
    linkTemplates: [],
    searchAble: (col: Column) => col instanceof StringColumn,
    sortOnLabel: true,

    autoRotateLabels: false,
    rotationHeight: 50, //in px
    rotationDegree: -20, //in deg

    freezeCols: 0,

    rankingButtons: <IRankingHook>dummyRankingButtonHook
  };

  $node: d3.Selection<any>;

  private histCache = new Map<string,Promise<IStatistics|ICategoricalStatistics>>();

  private dragHandler = d3.behavior.drag<Column>()
  //.origin((d) => d)
    .on('dragstart', function () {
      d3.select(this).classed('dragging', true);
      (<any>d3.event).sourceEvent.stopPropagation();
      (<any>d3.event).sourceEvent.preventDefault();
    })
    .on('drag', function (d) {
      //the new width
      var newValue = Math.max(d3.mouse(this.parentNode)[0], 2);
      d.setWidth(newValue);
      (<any>d3.event).sourceEvent.stopPropagation();
      (<any>d3.event).sourceEvent.preventDefault();
    })
    .on('dragend', function (d) {
      d3.select(this).classed('dragging', false);
      (<any>d3.event).sourceEvent.stopPropagation();

      (<any>d3.event).sourceEvent.preventDefault();
    });

  private dropHandler = dropAble(['application/caleydo-lineup-column-ref', 'application/caleydo-lineup-column'], (data, d: Column, copy) => {
    var col: Column = null;
    if ('application/caleydo-lineup-column-ref' in data) {
      var id = data['application/caleydo-lineup-column-ref'];
      col = this.data.find(id);
      if (copy) {
        col = this.data.clone(col);
      } else {
        col.removeMe();
      }
    } else {
      var desc = JSON.parse(data['application/caleydo-lineup-column']);
      col = this.data.create(this.data.fromDescRef(desc));
    }
    if (d instanceof Column) {
      return d.insertAfterMe(col) != null;
    } else {
      var r = this.data.getLastRanking();
      return r.push(col) !== null;
    }
  });


  constructor(private data: DataProvider, parent: Element, options: IHeaderRendererOptions) {
    merge(this.options, options);

    this.$node = d3.select(parent).append('div').classed('lu-header', true);
    this.$node.append('div').classed('drop', true).call(this.dropHandler);

    this.changeDataStorage(data);
  }

  changeDataStorage(data: DataProvider) {
    if (this.data) {
      this.data.on([DataProvider.EVENT_DIRTY_HEADER + '.headerRenderer', DataProvider.EVENT_ORDER_CHANGED + '.headerRenderer', DataProvider.EVENT_SELECTION_CHANGED + '.headerRenderer'], null);
    }
    this.data = data;
    data.on(DataProvider.EVENT_DIRTY_HEADER + '.headerRenderer', delayedCall(this.update.bind(this), 1));
    if (this.options.histograms) {
      data.on(DataProvider.EVENT_ORDER_CHANGED + '.headerRenderer', () => {
        this.updateHist();
        this.update();
      });
      data.on(DataProvider.EVENT_SELECTION_CHANGED + '.headerRenderer', delayedCall(this.drawSelection.bind(this), 1));
    }
  }

  get sharedHistCache() {
    return this.histCache;
  }

  /**
   * defines the current header height in pixel
   * @returns {number}
   */
  currentHeight() {
    return parseInt(this.$node.style('height'), 10);
  }

  private updateHist() {
    const rankings = this.data.getRankings();
    rankings.forEach((ranking) => {
      const order = ranking.getOrder();
      const cols = ranking.flatColumns;
      const histo = order == null ? null : this.data.stats(order);
      cols.filter((d) => d instanceof NumberColumn && !d.isHidden()).forEach((col: any) => {
        this.histCache.set(col.id, histo === null ? null : histo.stats(col));
      });
      cols.filter((d) => isCategoricalColumn(d) && !d.isHidden()).forEach((col: any) => {
        this.histCache.set(col.id, histo === null ? null : histo.hist(col));
      });
    });
  }

  /**
   * update the selection in the histograms
   */
  drawSelection() {
    if (!this.options.histograms) {
      return;
    }
    //highlight the bins in the histograms
    const node = <HTMLElement>this.$node.node();

    forEach(node, 'div.bar', (d) => d.classList.remove('selected'));
    const indices = this.data.getSelection();
    if (indices.length <= 0) {
      return;
    }
    this.data.view(indices).then((data) => {
      //get the data

      const rankings = this.data.getRankings();

      rankings.forEach((ranking) => {
        const cols = ranking.flatColumns;
        //find all number histograms
        cols.filter((d) => d instanceof NumberColumn && !d.isHidden()).forEach((col: NumberColumn) => {
          const bars = [].slice.call(node.querySelectorAll(`div.header[data-id="${col.id}"] div.bar`));
          data.forEach((d) => {
            const v = col.getValue(d);
            //choose the right bin
            for (let i = 1; i < bars.length; ++i) {
              let bar = bars[i];
              if (bar.dataset.x > v) { //previous bin
                bars[i - 1].classList.add('selected');
                break;
              } else if (i === bars.length - 1) { //last bin
                bar.classList.add('selected');
                break;
              }
            }
          });
        });
        cols.filter((d) => isCategoricalColumn(d) && !d.isHidden()).forEach((col: CategoricalColumn) => {
          const header = node.querySelector(`div.header[data-id="${col.id}"]`);
          data.forEach((d) => {
            const cats = col.getCategories(d);
            (cats || []).forEach((cat) => {
              header.querySelector(`div.bar[data-cat="${cat}"]`).classList.add('selected');
            });
          });
        });
      });
    });
  }

  private renderRankingButtons(rankings: Ranking[], rankingsOffsets: number[]) {
    const $rankingbuttons = this.$node.selectAll('div.rankingbuttons').data(rankings);
    $rankingbuttons.enter().append('div')
      .classed('rankingbuttons', true)
      .call(this.options.rankingButtons);
    $rankingbuttons.style('left', (d, i) => rankingsOffsets[i] + 'px');
    $rankingbuttons.exit().remove();
  }

  update() {
    const that = this;
    const rankings = this.data.getRankings();

    var shifts: IFlatColumn[] = [], offset = 0, rankingOffsets = [];
    rankings.forEach((ranking) => {
      offset += ranking.flatten(shifts, offset, 1, this.options.columnPadding) + this.options.slopeWidth;
      rankingOffsets.push(offset - this.options.slopeWidth);
    });
    //real width
    offset -= this.options.slopeWidth;

    var columns = shifts.map((d) => d.col);

    //update all if needed
    if (this.options.histograms && this.histCache.size === 0 && rankings.length > 0) {
      this.updateHist();
    }

    this.renderColumns(columns, shifts);

    if (this.options.rankingButtons !== dummyRankingButtonHook) {
      this.renderRankingButtons(rankings, rankingOffsets);
    }

    function countMultiLevel(c: Column): number {
      if (isMultiLevelColumn(c) && !(<IMultiLevelColumn>c).getCollapsed() && !c.getCompressed()) {
        return 1 + Math.max.apply(Math, (<IMultiLevelColumn>c).children.map(countMultiLevel));
      }
      return 1;
    }

    const levels = Math.max.apply(Math, columns.map(countMultiLevel));
    var height = (this.options.histograms ? this.options.headerHistogramHeight : this.options.headerHeight) + (levels - 1) * this.options.headerHeight;

    if (this.options.autoRotateLabels) {
      //check if we have overflows
      var rotatedAny = false;
      this.$node.selectAll('div.header')
        .style('height', height + 'px').select('div.lu-label').each(function (d) {
        const w = this.querySelector('span.lu-label').offsetWidth;
        const actWidth = d.getWidth();
        if (w > (actWidth + 30)) { //rotate
          d3.select(this).style('transform', `rotate(${that.options.rotationDegree}deg)`);
          rotatedAny = true;
        } else {
          d3.select(this).style('transform', null);
        }
      });
      this.$node.selectAll('div.header').style('margin-top', rotatedAny ? this.options.rotationHeight + 'px' : null);
      height += rotatedAny ? this.options.rotationHeight : 0;
    }
    this.$node.style('height', height + 'px');
  }

  private createToolbar($node: d3.Selection<Column>) {
    const filterDialogs = this.options.filterDialogs,
      provider = this.data,
      that = this;
    var $regular = $node.filter(d=> !(d instanceof Ranking)),
      $stacked = $node.filter(d=> d instanceof StackColumn),
      $multilevel = $node.filter(d=> isMultiLevelColumn(d));

    //edit weights
    $stacked.append('i').attr('class', 'fa fa-tasks').attr('title', 'Edit Weights').on('click', function (d) {
      openEditWeightsDialog(<StackColumn>d, d3.select(this.parentNode.parentNode));
      (<MouseEvent>d3.event).stopPropagation();
    });
    //rename
    $regular.append('i').attr('class', 'fa fa-pencil-square-o').attr('title', 'Rename').on('click', function (d) {
      openRenameDialog(d, d3.select(this.parentNode.parentNode));
      (<MouseEvent>d3.event).stopPropagation();
    });
    //clone
    $regular.append('i').attr('class', 'fa fa-code-fork').attr('title', 'Generate Snapshot').on('click', function (d) {
      provider.takeSnapshot(d);
      (<MouseEvent>d3.event).stopPropagation();
    });
    //edit link
    $node.filter((d) => d instanceof LinkColumn).append('i').attr('class', 'fa fa-external-link').attr('title', 'Edit Link Pattern').on('click', function (d) {
      openEditLinkDialog(<LinkColumn>d, d3.select(this.parentNode.parentNode), [].concat((<any>d.desc).templates || [], that.options.linkTemplates), that.options.idPrefix);
      (<MouseEvent>d3.event).stopPropagation();
    });
    //edit script
    $node.filter((d) => d instanceof ScriptColumn).append('i').attr('class', 'fa fa-gears').attr('title', 'Edit Combine Script').on('click', function (d) {
      openEditScriptDialog(<ScriptColumn>d, d3.select(this.parentNode.parentNode));
      (<MouseEvent>d3.event).stopPropagation();
    });
    //filter
    $node.filter((d) => filterDialogs.hasOwnProperty(d.desc.type)).append('i').attr('class', 'fa fa-filter').attr('title', 'Filter').on('click', function (d) {
      filterDialogs[d.desc.type](d, d3.select(this.parentNode.parentNode), provider, that.options.idPrefix);
      (<MouseEvent>d3.event).stopPropagation();
    });
    //search
    $node.filter((d) => this.options.searchAble(d)).append('i').attr('class', 'fa fa-search').attr('title', 'Search').on('click', function (d) {
      openSearchDialog(d, d3.select(this.parentNode.parentNode), provider);
      (<MouseEvent>d3.event).stopPropagation();
    });
    //collapse
    $regular.append('i')
      .attr('class', 'fa')
      .classed('fa-toggle-left', (d: Column) => !d.getCompressed())
      .classed('fa-toggle-right', (d: Column) => d.getCompressed())
      .attr('title', '(Un)Collapse')
      .on('click', function (d: Column) {
        d.setCompressed(!d.getCompressed());
        d3.select(this)
          .classed('fa-toggle-left', !d.getCompressed())
          .classed('fa-toggle-right', d.getCompressed());
        (<MouseEvent>d3.event).stopPropagation();
      });
    //compress
    $multilevel.append('i')
      .attr('class', 'fa')
      .classed('fa-compress', (d: IMultiLevelColumn) => !d.getCollapsed())
      .classed('fa-expand', (d: IMultiLevelColumn) => d.getCollapsed())
      .attr('title', 'Compress/Expand')
      .on('click', function (d: IMultiLevelColumn) {
        d.setCollapsed(!d.getCollapsed());
        d3.select(this)
          .classed('fa-compress', !d.getCollapsed())
          .classed('fa-expand', d.getCollapsed());
        (<MouseEvent>d3.event).stopPropagation();
      });
    //remove
    $node.append('i').attr('class', 'fa fa-times').attr('title', 'Hide').on('click', (d) => {
      if (d instanceof RankColumn) {
        provider.removeRanking(d.findMyRanker());
        if (provider.getRankings().length === 0) { //create at least one
          provider.pushRanking();
        }
      } else {
        d.removeMe();
      }
      (<MouseEvent>d3.event).stopPropagation();
    });
  }

  updateFreeze(left: number) {
    const numColumns = this.options.freezeCols;
    this.$node.selectAll('div.header')
      .style('z-index', (d, i) => i < numColumns ? 1 : null)
      .style('transform', (d, i) => i < numColumns ? `translate(${left}px,0)` : null);
  }

  private renderColumns(columns: Column[], shifts: IFlatColumn[], $base: d3.Selection<any> = this.$node, clazz: string = 'header') {
    const that = this;
    const $headers = $base.selectAll('div.' + clazz).data(columns, (d) => d.id);
    const $headers_enter = $headers.enter().append('div').attr('class', clazz)
      .on('click', (d) => {
        const mevent = <MouseEvent>d3.event;
        if (this.options.manipulative && !mevent.defaultPrevented && mevent.currentTarget === mevent.target) {
          d.toggleMySorting();
        }
      });
    const $header_enter_div = $headers_enter.append('div').classed('lu-label', true)
      .on('click', (d) => {
        const mevent = <MouseEvent>d3.event;
        if (this.options.manipulative && !mevent.defaultPrevented) {
          d.toggleMySorting();
        }
      })
      .on('dragstart', (d) => {
        var e = <DragEvent>(<any>d3.event);
        e.dataTransfer.effectAllowed = 'copyMove'; //none, copy, copyLink, copyMove, link, linkMove, move, all
        e.dataTransfer.setData('text/plain', d.label);
        e.dataTransfer.setData('application/caleydo-lineup-column-ref', d.id);
        var ref = JSON.stringify(this.data.toDescRef(d.desc));
        e.dataTransfer.setData('application/caleydo-lineup-column', ref);
        if (isNumberColumn(d)) {
          e.dataTransfer.setData('application/caleydo-lineup-column-number', ref);
          e.dataTransfer.setData('application/caleydo-lineup-column-number-ref', d.id);
        }
      });
    $header_enter_div.append('i').attr('class', 'fa fa sort_indicator');
    $header_enter_div.append('span').classed('lu-label', true).attr({
      'draggable': this.options.manipulative
    });

    if (this.options.manipulative) {
      $headers_enter.append('div').classed('handle', true)
        .call(this.dragHandler)
        .style('width', this.options.columnPadding + 'px')
        .call(this.dropHandler);
      $headers_enter.append('div').classed('toolbar', true).call(this.createToolbar.bind(this));
    }

    if (this.options.histograms) {
      $headers_enter.append('div').classed('histogram', true);
    }

    $headers.style({
      width: (d, i) => (shifts[i].width + this.options.columnPadding) + 'px',
      left: (d, i) => shifts[i].offset + 'px',
      'background-color': (d) => d.color
    });
    $headers.attr({
      'class': (d) => `${clazz} ${d.cssClass || ''} ${(d.getCompressed() ? 'compressed' : '')} ${d.headerCssClass} ${this.options.autoRotateLabels ? 'rotateable' : ''} ${d.isFiltered() ? 'filtered' : ''}`,
      title: (d) => toFullTooltip(d),
      'data-id': (d) => d.id
    });
    $headers.select('i.sort_indicator').attr('class', (d) => {
      const r = d.findMyRanker();
      if (r && r.getSortCriteria().col === d) {
        return 'sort_indicator fa fa-sort-' + (r.getSortCriteria().asc ? 'asc' : 'desc');
      }
      return 'sort_indicator fa';
    });
    $headers.select('span.lu-label').text((d) => d.label);

    $headers.filter((d) => isMultiLevelColumn(d)).each(function (col: IMultiLevelColumn) {
      if (col.getCollapsed() || col.getCompressed()) {
        d3.select(this).selectAll('div.' + clazz + '_i').remove();
      } else {
        let s_shifts = [];
        col.flatten(s_shifts, 0, 1, that.options.columnPadding);

        let s_columns = s_shifts.map((d) => d.col);
        that.renderColumns(s_columns, s_shifts, d3.select(this), clazz + (clazz.substr(clazz.length - 2) !== '_i' ? '_i' : ''));
      }
    }).select('div.lu-label').call(dropAble(['application/caleydo-lineup-column-number-ref', 'application/caleydo-lineup-column-number'], (data, d: IMultiLevelColumn, copy) => {
      var col: Column = null;
      if ('application/caleydo-lineup-column-number-ref' in data) {
        var id = data['application/caleydo-lineup-column-number-ref'];
        col = this.data.find(id);
        if (copy) {
          col = this.data.clone(col);
        } else if (col) {
          col.removeMe();
        }
      } else {
        var desc = JSON.parse(data['application/caleydo-lineup-column-number']);
        col = this.data.create(this.data.fromDescRef(desc));
      }
      return d.push(col) != null;
    }));

    if (this.options.histograms) {

      $headers.filter((d) => isCategoricalColumn(d)).each(function (col: CategoricalColumn) {
        const $this = d3.select(this).select('div.histogram');
        const hist = that.histCache.get(col.id);
        if (hist) {
          hist.then((stats: ICategoricalStatistics) => {
            const $bars = $this.selectAll('div.bar').data(stats.hist);
            $bars.enter().append('div').classed('bar', true);
            const sx = d3.scale.ordinal().domain(col.categories).rangeBands([0, 100], 0.1);
            const sy = d3.scale.linear().domain([0, stats.maxBin]).range([0, 100]);
            $bars.style({
              left: (d) => sx(d.cat) + '%',
              width: (d) => sx.rangeBand() + '%',
              top: (d) => (100 - sy(d.y)) + '%',
              height: (d) => sy(d.y) + '%',
              'background-color': (d) => col.colorOf(d.cat)
            }).attr({
              title: (d) => `${d.cat}: ${d.y}`,
              'data-cat': (d) => d.cat
            });
            $bars.exit().remove();
          });
        }
      });
      $headers.filter((d) => d instanceof NumberColumn).each(function (col: Column) {
        const $this = d3.select(this).select('div.histogram');
        const hist = that.histCache.get(col.id);
        if (hist) {
          hist.then((stats: IStatistics) => {
            const $bars = $this.selectAll('div.bar').data(stats.hist);
            $bars.enter().append('div').classed('bar', true);
            const sx = d3.scale.ordinal().domain(d3.range(stats.hist.length).map(String)).rangeBands([0, 100], 0.1);
            const sy = d3.scale.linear().domain([0, stats.maxBin]).range([0, 100]);
            $bars.style({
              left: (d, i) => sx(String(i)) + '%',
              width: (d, i) => sx.rangeBand() + '%',
              top: (d) => (100 - sy(d.y)) + '%',
              height: (d) => sy(d.y) + '%'
            }).attr({
              title: (d, i) => `Bin ${i}: ${d.y}`,
              'data-x': (d) => d.x
            });
            $bars.exit().remove();

            var $mean = $this.select('div.mean');
            if ($mean.empty()) {
              $mean = $this.append('div').classed('mean', true);
            }
            $mean.style('left', (stats.mean * 100) + '%');
          });
        }
      });
    }

    $headers.exit().remove();
  }
}
