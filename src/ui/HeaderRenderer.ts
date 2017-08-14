/**
 * Created by Samuel Gratzl on 14.08.2015.
 */

import * as d3 from 'd3';
import {merge, dropAble, delayedCall, forEach} from '../utils';
import Column, {IStatistics, ICategoricalStatistics, IFlatColumn} from '../model/Column';
import StringColumn from '../model/StringColumn';
import Ranking from '../model/Ranking';
import {default as CompositeColumn, IMultiLevelColumn, isMultiLevelColumn} from '../model/CompositeColumn';
import NumberColumn, {isNumberColumn, INumberColumn} from '../model/NumberColumn';
import CategoricalColumn, {isCategoricalColumn} from '../model/CategoricalColumn';
import RankColumn from '../model/RankColumn';
import StackColumn, {createDesc as createStackDesc} from '../model/StackColumn';
import {createDesc as createNestedDesc} from '../model/NestedColumn';
import LinkColumn from '../model/LinkColumn';
import ScriptColumn from '../model/ScriptColumn';
import DataProvider from '../provider/ADataProvider';
import MultiValueColumn from '../model/MultiValueColumn';
import BoxPlotColumn, {IBoxPlotColumn} from '../model/BoxPlotColumn';

import SearchDialog from '../dialogs/SearchDialog';
import RenameDialog from '../dialogs/RenameDialog';
import EditLinkDialog from '../dialogs/EditLinkDialog';
import RendererTypeDialog from '../dialogs/RendererTypeDialog';
import WeightsEditDialog from '../dialogs/WeightsEditDialog';
import SortDialog from '../dialogs/SortDialog';

import StringFilterDialog from '../dialogs/StringFilterDialog';
import BooleanFilterDialog from '../dialogs/BooleanFilterDialog';
import CategoricalFilterDialog from '../dialogs/CategoricalFilterDialog';
import MappingsFilterDialog from '../dialogs/MappingsFilterDialog';
import CategoricalMappingFilterDialog from '../dialogs/CategoricalMappingFilterDialog';

import {IFilterDialog} from '../dialogs/AFilterDialog';
import ScriptEditDialog from '../dialogs/ScriptEditDialog';

/**
 * utility function to generate the tooltip text with description
 * @param col the column
 */
export function toFullTooltip(col: {label: string, description?: string}) {
  let base = col.label;
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

  filters?: {[type: string]: IFilterDialog};
  linkTemplates?: string[];
  searchAble?(col: Column): boolean;
  sortOnLabel?: boolean;

  autoRotateLabels?: boolean;
  rotationHeight?: number;
  rotationDegree?: number;

  freezeCols?: number;

  rankingButtons?: IRankingHook;
}

function countMultiLevel(c: Column): number {
  if (isMultiLevelColumn(c) && !(<IMultiLevelColumn>c).getCollapsed() && !c.getCompressed()) {
    return 1 + Math.max.apply(Math, (<IMultiLevelColumn>c).children.map(countMultiLevel));
  }
  return 1;
}


export default class HeaderRenderer {
  private readonly options: IHeaderRendererOptions = {
    idPrefix: '',
    slopeWidth: 150,
    columnPadding: 5,
    headerHistogramHeight: 40,
    headerHeight: 20,
    manipulative: true,
    histograms: false,
    filters:  <{[type: string]: IFilterDialog}>{
      'string': StringFilterDialog,
      'boolean': BooleanFilterDialog,
      'categorical': CategoricalFilterDialog,
      'number': MappingsFilterDialog,
      'ordinal': CategoricalMappingFilterDialog
    },
    linkTemplates: [],
    searchAble: (col: Column) => col instanceof StringColumn,
    sortOnLabel: true,

    autoRotateLabels: false,
    rotationHeight: 50, //in px
    rotationDegree: -20, //in deg

    freezeCols: 0,

    rankingButtons: <IRankingHook>dummyRankingButtonHook
  };

  readonly $node: d3.Selection<any>;

  private histCache = new Map<string,Promise<IStatistics|ICategoricalStatistics>>();

  private readonly dragHandler = d3.behavior.drag<Column>()
  //.origin((d) => d)
    .on('dragstart', function () {
      d3.select(this).classed('dragging', true);
      (<any>d3.event).sourceEvent.stopPropagation();
      (<any>d3.event).sourceEvent.preventDefault();
    })
    .on('drag', function (d) {
      //the new width
      const newValue = Math.max(d3.mouse(this.parentNode)[0], 2);
      d.setWidth(newValue);
      (<any>d3.event).sourceEvent.stopPropagation();
      (<any>d3.event).sourceEvent.preventDefault();
    })
    .on('dragend', function () {
      d3.select(this).classed('dragging', false);
      (<any>d3.event).sourceEvent.stopPropagation();

      (<any>d3.event).sourceEvent.preventDefault();
    });

  private readonly dropHandler = dropAble(['application/caleydo-lineup-column-ref', 'application/caleydo-lineup-column'], (data, d: Column, copy) => {
    let col: Column = null;
    if ('application/caleydo-lineup-column-ref' in data) {
      const id = data['application/caleydo-lineup-column-ref'];
      col = this.data.find(id);
      if (copy) {
        col = this.data.clone(col);
      } else {
        col.removeMe();
      }
    } else {
      const desc = JSON.parse(data['application/caleydo-lineup-column']);
      col = this.data.create(this.data.fromDescRef(desc));
    }
    if (d instanceof Column) {
      return d.insertAfterMe(col) != null;
    } else {
      const r = this.data.getLastRanking();
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
          data.forEach((d, i) => {
            const v = col.getValue(d, indices[i]);
            //choose the right bin
            for (let i = 1; i < bars.length; ++i) {
              const bar = bars[i];
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
          data.forEach((d, i) => {
            const cats = col.getCategories(d, indices[i]);
            (cats || []).forEach((cat) => {
              const h = header.querySelector(`div.bar[data-cat="${cat}"]`);
              if (h) {
                h.classList.add('selected');
              }
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

    const shifts: IFlatColumn[] = [], rankingOffsets = [];
    let totalWidth = 0;
    rankings.forEach((ranking) => {
      totalWidth += ranking.flatten(shifts, totalWidth, 1, this.options.columnPadding) + this.options.slopeWidth;
      rankingOffsets.push(totalWidth - this.options.slopeWidth);
    });
    //real width
    totalWidth -= this.options.slopeWidth;

    // fix for #179
    this.$node.select('div.drop').style('width', totalWidth + 'px');

    const columns = shifts.map((d) => d.col);

    //update all if needed
    if (this.options.histograms && this.histCache.size === 0 && rankings.length > 0) {
      this.updateHist();
    }

    this.renderColumns(columns, shifts);

    if (this.options.rankingButtons !== dummyRankingButtonHook) {
      this.renderRankingButtons(rankings, rankingOffsets);
    }

    const levels = Math.max(...columns.map(countMultiLevel));
    let height = (this.options.histograms ? this.options.headerHistogramHeight : this.options.headerHeight) + (levels - 1) * this.options.headerHeight;

    if (this.options.autoRotateLabels) {
      //check if we have overflows
      let rotatedAny = false;
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
    const provider = this.data,
      that = this;
    const $regular = $node.filter((d) => !(d instanceof RankColumn));

    //rename
    $regular.append('i').attr('class', 'fa fa-pencil-square-o').attr('title', 'Rename').on('click', function (d) {
      const dialog = new RenameDialog(d, d3.select(this.parentNode.parentNode));
      dialog.openDialog();
      (<MouseEvent>d3.event).stopPropagation();
    });
    //clone
    $regular.append('i').attr('class', 'fa fa-code-fork').attr('title', 'Generate Snapshot').on('click', function (d) {
      provider.takeSnapshot(d);
      (<MouseEvent>d3.event).stopPropagation();
    });

    //MultiValue Sort
    $node.filter((d) => d instanceof MultiValueColumn || d instanceof BoxPlotColumn).append('i').attr('class', 'fa fa-sort').attr('title', 'Sort By').on('click', function (d) {
      const dialog = new SortDialog(<IBoxPlotColumn><any>d, d3.select(this.parentNode.parentNode));
      dialog.openDialog();
      (<MouseEvent>d3.event).stopPropagation();
    });


    //Renderer Change
    $node.filter((d) => d.getRendererList().length > 1).append('i').attr('class', 'fa fa-exchange').attr('title', 'Change Visualization').on('click', function (d) {
      const dialog = new RendererTypeDialog(d, d3.select(this.parentNode.parentNode));
      dialog.openDialog();
      (<MouseEvent>d3.event).stopPropagation();
    });


    //edit link
    $node.filter((d) => d instanceof LinkColumn).append('i').attr('class', 'fa fa-external-link').attr('title', 'Edit Link Pattern').on('click', function (d) {
      const dialog = new EditLinkDialog(<LinkColumn>d, d3.select(this.parentNode.parentNode), that.options.idPrefix, [].concat((<any>d.desc).templates || [], that.options.linkTemplates));
      dialog.openDialog();
      (<MouseEvent>d3.event).stopPropagation();
    });
    //edit script
    $node.filter((d) => d instanceof ScriptColumn).append('i').attr('class', 'fa fa-gears').attr('title', 'Edit Combine Script').on('click', function (d) {
      const dialog = new ScriptEditDialog(<ScriptColumn>d, d3.select(this.parentNode.parentNode));
      dialog.openDialog();
      (<MouseEvent>d3.event).stopPropagation();
    });
    //filter
    $node.filter((d) => this.options.filters.hasOwnProperty(d.desc.type)).append('i').attr('class', 'fa fa-filter').attr('title', 'Filter').on('click', (d) => {
      const target = (<MouseEvent>d3.event).target;
      const dialog = new this.options.filters[d.desc.type](d, d3.select((<HTMLElement>target).parentNode), '', provider, that.options.idPrefix);
      dialog.openDialog();
      (<MouseEvent>d3.event).stopPropagation();
    });
    //search
    $node.filter((d) => this.options.searchAble(d)).append('i').attr('class', 'fa fa-search').attr('title', 'Search').on('click', function (d) {
      const dialog = new SearchDialog(d, d3.select(this.parentNode.parentNode), provider);
      dialog.openDialog();
      (<MouseEvent>d3.event).stopPropagation();
    });
    //edit weights
    $node.filter((d) => d instanceof StackColumn).append('i').attr('class', 'fa fa-tasks').attr('title', 'Edit Weights').on('click', function (d) {
      const dialog = new WeightsEditDialog(<StackColumn>d, d3.select(this.parentNode.parentNode));
      dialog.openDialog();
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
    $node.filter((d) => isMultiLevelColumn(d)).append('i')
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
    const $headersEnter = $headers.enter().append('div').attr('class', clazz)
      .on('click', (d) => {
        const mevent = <MouseEvent>d3.event;
        if (this.options.manipulative && !mevent.defaultPrevented && mevent.currentTarget === mevent.target) {
          d.toggleMySorting();
        }
      });
    const $headersEnterDiv = $headersEnter.append('div').classed('lu-label', true)
      .on('click', (d) => {
        const mevent = <MouseEvent>d3.event;
        if (this.options.manipulative && !mevent.defaultPrevented) {
          d.toggleMySorting();
        }
      })
      .on('dragstart', (d) => {
        const e = <DragEvent>(<any>d3.event);
        e.dataTransfer.effectAllowed = 'copyMove'; //none, copy, copyLink, copyMove, link, linkMove, move, all
        e.dataTransfer.setData('text/plain', d.label);
        e.dataTransfer.setData('application/caleydo-lineup-column-ref', d.id);
        const ref = JSON.stringify(this.data.toDescRef(d.desc));
        e.dataTransfer.setData('application/caleydo-lineup-column', ref);
        if (isNumberColumn(d)) {
          e.dataTransfer.setData('application/caleydo-lineup-column-number', ref);
          e.dataTransfer.setData('application/caleydo-lineup-column-number-ref', d.id);
        }
      });
    $headersEnterDiv.append('i').attr('class', 'fa fa sort_indicator');
    $headersEnterDiv.append('span').classed('lu-label', true).attr({
      'draggable': this.options.manipulative
    });

    if (this.options.manipulative) {
      $headersEnter.append('div').classed('handle', true)
        .call(this.dragHandler)
        .style('width', this.options.columnPadding + 'px')
        .call(this.dropHandler);
      $headersEnter.append('div').classed('toolbar', true).call(this.createToolbar.bind(this));
    }

    if (this.options.histograms) {
      $headersEnter.append('div').classed('histogram', true);
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
      if (!r) {
        return 'sort_indicator fa';
      }
      const criterias = r.getSortCriterias();
      const index = criterias.findIndex((c) => c.col === d);
      if (index === 0) { // just show the primary for now
        // TODO handle if secondary, ... criteria
        return 'sort_indicator fa fa-sort-' + (criterias[index].asc ? 'asc' : 'desc');
      }
      return 'sort_indicator fa';
    });
    $headers.select('span.lu-label').text((d) => d.label);

    const resolveDrop = (data: {[key: string]: string}, copy: boolean, numbersOnly: boolean) => {
      const prefix = `application/caleydo-lineup-column${numbersOnly?'-number':''}`;
      if (`${prefix}-ref` in data) {
        const id = data[`${prefix}-ref`];
        let col: Column = this.data.find(id);
        if (copy) {
          col = this.data.clone(col);
        } else if (col) {
          col.removeMe();
        }
        return col;
      } else {
        const desc = JSON.parse(data[prefix]);
        return this.data.create(this.data.fromDescRef(desc));
      }
    };

    const renderMultiLevel = function (this: HTMLElement, col: IMultiLevelColumn) {
      if (col.getCollapsed() || col.getCompressed()) {
        d3.select(this).selectAll('div.' + clazz + '_i').remove();
      } else {
        const sShifts = [];
        col.flatten(sShifts, 0, 1, that.options.columnPadding);

        const sColumns = sShifts.map((d) => d.col);
        that.renderColumns(sColumns, sShifts, d3.select(this), clazz + (clazz.substr(clazz.length - 2) !== '_i' ? '_i' : ''));
      }
    };

    $headers.filter((d) => isMultiLevelColumn(d) && (<IMultiLevelColumn>d).canJustAddNumbers).each(renderMultiLevel).select('div.lu-label').call(dropAble(['application/caleydo-lineup-column-number-ref', 'application/caleydo-lineup-column-number'], (data, d: IMultiLevelColumn, copy) => {
      const col: Column = resolveDrop(data, copy, true);
      return d.push(col) != null;
    }));

    $headers.filter((d) => isMultiLevelColumn(d) && !(<IMultiLevelColumn>d).canJustAddNumbers).each(renderMultiLevel).select('div.lu-label').call(dropAble(['application/caleydo-lineup-column-ref', 'application/caleydo-lineup-number'], (data, d: IMultiLevelColumn, copy) => {
      const col: Column = resolveDrop(data, copy, false);
      return d.push(col) != null;
    }));

    const justNumbers = (d: Column) => (d instanceof CompositeColumn && d.canJustAddNumbers) || (isNumberColumn(d) && d.parent instanceof Ranking);
    const dropOrMerge = (justNumbers: boolean) => {
      return (data, d: CompositeColumn|(Column & INumberColumn), copy) => {
        const col: Column = resolveDrop(data, copy, justNumbers);
        if (d instanceof CompositeColumn) {
          return (d.push(col) !== null);
        }
        const ranking = d.findMyRanker();
        const index = ranking.indexOf(d);
        const parent = <CompositeColumn>this.data.create(justNumbers ? createStackDesc(): createNestedDesc());
        d.removeMe();
        parent.push(d);
        parent.push(col);
        return ranking.insert(parent, index) != null;
      };
    };

    $headers.filter((d) => !isMultiLevelColumn(d) && justNumbers(d)).select('div.lu-label').call(dropAble(['application/caleydo-lineup-column-number-ref', 'application/caleydo-lineup-number'], dropOrMerge(true)));
    $headers.filter((d) => !isMultiLevelColumn(d) && !justNumbers(d)).select('div.lu-label').call(dropAble(['application/caleydo-lineup-column-ref', 'application/caleydo-lineup'], dropOrMerge(false)));

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

            let $mean = $this.select('div.mean');
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
