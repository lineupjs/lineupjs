/**
 * Created by Samuel Gratzl on 14.08.2015.
 */

import * as d3 from 'd3';
import {debounce, forEach, merge, suffix} from '../utils';
import {dragAble, dropAble} from '../dnd_d3';
import Column, {ICategoricalStatistics, IFlatColumn, IStatistics} from '../model/Column';
import StringColumn from '../model/StringColumn';
import Ranking from '../model/Ranking';
import {default as CompositeColumn, IMultiLevelColumn, isMultiLevelColumn} from '../model/CompositeColumn';
import {INumberColumn, isNumberColumn} from '../model/INumberColumn';
import {ICategoricalColumn, isCategoricalColumn} from '../model/ICategoricalColumn';
import {createDesc as createStackDesc} from '../model/StackColumn';
import {createDesc as createNestedDesc} from '../model/NestedColumn';
import DataProvider, {IDataRow} from '../provider/ADataProvider';
import SelectionColumn from '../model/SelectionColumn';
import {createShortcutMenuItems, MIMETYPE_PREFIX, toFullTooltip} from './engine/header';
import {defaultConfig, dummyRankingButtonHook} from '../config';
import ADialog, {IMaskRect} from '../dialogs/ADialog';
import {IRankingHeaderContext} from './engine/interfaces';
import {IHeaderRendererOptions} from './interfaces';
import NumberColumn from '../model/NumberColumn';
import {possibleGroupRenderer, possibleRenderer} from '../renderer';


function countMultiLevel(c: Column): number {
  if (isMultiLevelColumn(c) && !(<IMultiLevelColumn>c).getCollapsed()) {
    return 1 + Math.max.apply(Math, (<IMultiLevelColumn>c).children.map(countMultiLevel));
  }
  return 1;
}


export default class HeaderRenderer {
  private readonly options: IHeaderRendererOptions = defaultConfig().header;

  readonly $node: d3.Selection<any>;

  private histCache = new Map<string, Promise<IStatistics | ICategoricalStatistics> | IStatistics | ICategoricalStatistics | null>();

  private readonly dragHandler = d3.behavior.drag<Column>()
  //.origin((d) => d)
    .on('dragstart', function (this: HTMLElement) {
      d3.select(this).classed('dragging', true);
      (<any>d3.event).sourceEvent.stopPropagation();
      (<any>d3.event).sourceEvent.preventDefault();
    })
    .on('drag', function (this: HTMLElement, d) {
      //the new width
      const newValue = Math.max(d3.mouse(this.parentNode!)[0], 2);
      d.setWidth(newValue);
      (<any>d3.event).sourceEvent.stopPropagation();
      (<any>d3.event).sourceEvent.preventDefault();
    })
    .on('dragend', function (this: HTMLElement) {
      d3.select(this).classed('dragging', false);
      (<any>d3.event).sourceEvent.stopPropagation();

      (<any>d3.event).sourceEvent.preventDefault();
    });

  private readonly dropHandler = dropAble([`${MIMETYPE_PREFIX}-ref`, MIMETYPE_PREFIX], (data, d: Column, copy) => {
    let col: Column | null = null;
    if (`${MIMETYPE_PREFIX}-ref` in data) {
      const id = data[`${MIMETYPE_PREFIX}-ref`];
      col = this.data.find(id);
      if (!col) {
        return false;
      }
      if (copy) {
        col = this.data.clone(col!);
      } else {
        col.removeMe();
      }
    } else {
      const desc = JSON.parse(data[MIMETYPE_PREFIX]);
      col = this.data.create(this.data.fromDescRef(desc));
    }
    if (!col) {
      return false;
    }
    if (d instanceof Column) {
      return d.insertAfterMe(col) != null;
    }
    const r = this.data.getLastRanking();
    return r.push(col) !== null;
  });


  constructor(private data: DataProvider, parent: Element, options: Partial<IHeaderRendererOptions>) {
    merge(this.options, options);

    this.$node = d3.select(parent).append('div').classed('lu-header', true);
    this.$node.append('div').classed('drop', true).call(this.dropHandler);

    this.changeDataStorage(data);
  }

  changeDataStorage(data: DataProvider) {
    if (this.data) {
      this.data.on(suffix('.headerRenderer', DataProvider.EVENT_DIRTY_HEADER, DataProvider.EVENT_ORDER_CHANGED, DataProvider.EVENT_SELECTION_CHANGED), null);
    }
    this.data = data;
    data.on(`${DataProvider.EVENT_DIRTY_HEADER}.headerRenderer`, debounce(this.update.bind(this), 1));
    if (!this.options.summary) {
      return;
    }
    data.on(`${DataProvider.EVENT_ORDER_CHANGED}.headerRenderer`, () => {
      this.updateHist();
      this.update();
    });
    data.on(`${DataProvider.EVENT_SELECTION_CHANGED}.headerRenderer`, debounce(this.drawSelection.bind(this), 1));
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
    if (!this.options.summary) {
      return;
    }
    //highlight the bins in the histograms
    const node = <HTMLElement>this.$node.node();

    forEach(node, 'div.bar', (d) => d.classList.remove('selected'));
    const indices = this.data.getSelection();
    if (indices.length <= 0) {
      return;
    }

    const render = (data: IDataRow[]) => {
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
              }
              if (i === bars.length - 1) { //last bin
                bar.classList.add('selected');
                break;
              }
            }
          });
        });
        cols.filter((d) => isCategoricalColumn(d) && !d.isHidden()).forEach((col: ICategoricalColumn & Column) => {
          const header = node.querySelector(`div.header[data-id="${col.id}"]`)!;
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
    };

    const r = this.data.view(indices);
    if (Array.isArray(r)) {
      render(r);
    } else {
      r.then(render);
    }
  }

  private renderRankingButtons(rankings: Ranking[], rankingsOffsets: number[]) {
    const $rankingbuttons = this.$node.selectAll('div.rankingbuttons').data(rankings);
    $rankingbuttons.enter().append('div')
      .classed('rankingbuttons', true)
      .call(this.options.rankingButtons);
    $rankingbuttons.style('left', (_d, i) => `${rankingsOffsets[i]}px`);
    $rankingbuttons.exit().remove();
  }

  update() {
    const that = this;
    const rankings = this.data.getRankings();

    const shifts: IFlatColumn[] = [], rankingOffsets: number[] = [];
    let totalWidth = 0;
    rankings.forEach((ranking) => {
      totalWidth += ranking.flatten(shifts, totalWidth, 1, this.options.columnPadding) + this.options.slopeWidth;
      rankingOffsets.push(totalWidth - this.options.slopeWidth);
    });
    //real width
    totalWidth -= this.options.slopeWidth;

    // fix for #179
    this.$node.select('div.drop').style('min-width', `${totalWidth}px`);

    const columns = shifts.map((d) => d.col);

    //update all if needed
    if (this.options.summary && this.histCache.size === 0 && rankings.length > 0) {
      this.updateHist();
    }

    this.renderColumns(columns, shifts);

    if (this.options.rankingButtons !== dummyRankingButtonHook) {
      this.renderRankingButtons(rankings, rankingOffsets);
    }

    const levels = Math.max(...columns.map(countMultiLevel));
    let height = (this.options.summary ? this.options.headerHistogramHeight : this.options.headerHeight) + (levels - 1) * this.options.headerHeight;

    if (this.options.autoRotateLabels) {
      //check if we have overflows
      let rotatedAny = false;
      this.$node.selectAll('div.header')
        .style('height', `${height}px`).select('div.lu-label').each(function (this: HTMLElement, d) {
        const w = (<HTMLElement>this.querySelector('span.lu-label')!).offsetWidth;
        const actWidth = d.getWidth();
        if (w > (actWidth + 30)) { //rotate
          d3.select(this).style('transform', `rotate(${that.options.rotationDegree}deg)`);
          rotatedAny = true;
        } else {
          d3.select(this).style('transform', null!);
        }
      });
      this.$node.selectAll('div.header').style('margin-top', rotatedAny ? `${this.options.rotationHeight}px` : null!);
      height += rotatedAny ? this.options.rotationHeight : 0;
    }
    this.$node.style('height', `${height}px`);
  }

  private createToolbar($node: d3.Selection<Column>) {
    const renderers = defaultConfig().renderers;
    const ctx: IRankingHeaderContext = Object.assign({
      provider: this.data,
      statsOf: () => null,
      getPossibleRenderer: (col: Column): {item: {type: string, label: string}[], group: {type: string, label: string}[]} => {
        return {item: possibleRenderer(col, renderers), group: possibleGroupRenderer(col, renderers)};
      }
    }, this.options);

    $node.each(function (this: HTMLElement, col) {
      const $this = d3.select(this);
      const addIcon = (title: string, dialogClass?: { new(col: any, header: HTMLElement, ...args: any[]): ADialog }, ...dialogArgs: any[]) => {
        const proxy: { onclick: (e: MouseEvent) => any } = {onclick: () => undefined};
        $this.append('i').attr('title', title).html(`<span aria-hidden="true">${title}</span>`).on('click', function () {
          proxy.onclick(<MouseEvent>d3.event);
        });
        if (!dialogClass) {
          return <any>proxy;
        }
        proxy.onclick = (evt: MouseEvent) => {
          evt.stopPropagation();
          const dialog = new dialogClass(col, (<HTMLElement>evt.currentTarget).parentElement!, ...dialogArgs);
          dialog.open();
        };
        return proxy;
      };
      const dialogBackdropMask:() => IMaskRect = () => {
        const mask = this.getBoundingClientRect();
        // manipulate bottom to highlight the whole column (and not only the header)
        return {top: mask.top, left: mask.left, right: mask.right, bottom: document.body.clientHeight};
      };
      createShortcutMenuItems(addIcon, col, ctx, dialogBackdropMask);
    });
  }

  updateFreeze(left: number) {
    const numColumns = this.options.freezeCols;
    this.$node.selectAll('div.header')
      .style('z-index', (_d, i) => i < numColumns ? 1 : null!)
      .style('transform', (_d, i) => i < numColumns ? `translate(${left}px,0)` : null!);
  }

  private renderColumns(columns: Column[], shifts: IFlatColumn[], $base: d3.Selection<any> = this.$node, clazz: string = 'header') {
    const that = this;
    const $headers = $base.selectAll(`div.${clazz}`).data(columns, (d) => d.id);
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
      .call(dragAble<Column>((d) => {
        const ref = JSON.stringify(this.data.toDescRef(d.desc));
        const data: any = {
          'text/plain': d.label,
          [`${MIMETYPE_PREFIX}-ref`]: d.id,
          [MIMETYPE_PREFIX]: ref
        };
        if (isNumberColumn(d)) {
          data[`${MIMETYPE_PREFIX}-number`] = ref;
          data[`${MIMETYPE_PREFIX}-number-ref`] = d.id;
        }
        return {
          data,
          effectAllowed: 'copyMove' //none, copy, copyLink, copyMove, link, linkMove, move, all
        };
      }));
    $headersEnterDiv.append('i').attr('class', 'fa fa sort_indicator');
    $headersEnterDiv.append('span').classed('lu-label', true).attr({
      'draggable': this.options.manipulative
    });

    if (this.options.manipulative) {
      $headersEnter.append('div').classed('lu-handle', true)
        .call(this.dragHandler)
        .style('width', `${this.options.columnPadding}px`)
        .call(this.dropHandler);
      $headersEnter.append('div').classed('lu-toolbar', true).call(this.createToolbar.bind(this));
    }

    if (this.options.summary) {
      $headersEnter.append('div').classed('summary', true);
    }

    $headers.style({
      width: (_d, i) => `${shifts[i].width + this.options.columnPadding}px`,
      left: (_d, i) => `${shifts[i].offset}px`,
      'background-color': (d) => d.color!
    });
    $headers.attr({
      'class': (d) => `${clazz} ${d.cssClass || ''} ${d.headerCssClass} ${this.options.autoRotateLabels ? 'rotateable' : ''} ${d.isFiltered() ? 'filtered' : ''} ${d.isGroupedBy() >= 0 ? 'grouped' : ''}`,
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
        return `sort_indicator fa fa-sort-${criterias[index].asc ? 'asc' : 'desc'}`;
      }
      return 'sort_indicator fa';
    });

    $headers.select('span.lu-label').text((d) => d.label);

    const resolveDrop = (data: { [key: string]: string }, copy: boolean, numbersOnly: boolean) => {
      const prefix = `${MIMETYPE_PREFIX}${numbersOnly ? '-number' : ''}`;
      if (`${prefix}-ref` in data) {
        const id = data[`${prefix}-ref`];
        let col: Column = this.data.find(id)!;
        if (copy) {
          col = this.data.clone(col);
        } else if (col) {
          col.removeMe();
        }
        return col;
      }
      const desc = JSON.parse(data[prefix]);
      return this.data.create(this.data.fromDescRef(desc))!;
    };

    const renderMultiLevel = function (this: HTMLElement, col: IMultiLevelColumn) {
      if (col.getCollapsed()) {
        d3.select(this).selectAll(`div.${clazz}_i`).remove();
        return;
      }
      const sShifts = <IFlatColumn[]>[];
      col.flatten(sShifts, 0, 1, that.options.columnPadding);

      const sColumns = sShifts.map((d) => d.col);
      that.renderColumns(sColumns, sShifts, d3.select(this), clazz + (clazz.substr(clazz.length - 2) !== '_i' ? '_i' : ''));
    };

    $headers.filter((d) => isMultiLevelColumn(d) && (<IMultiLevelColumn>d).canJustAddNumbers).each(renderMultiLevel).select('div.lu-label').call(dropAble([`${MIMETYPE_PREFIX}-number-ref`, `${MIMETYPE_PREFIX}-number`], (data, d: IMultiLevelColumn, copy) => {
      const col: Column = resolveDrop(data, copy, true);
      return d.push(col) != null;
    }));

    $headers.filter((d) => isMultiLevelColumn(d) && !(<IMultiLevelColumn>d).canJustAddNumbers).each(renderMultiLevel).select('div.lu-label').call(dropAble([`${MIMETYPE_PREFIX}-ref`, MIMETYPE_PREFIX], (data, d: IMultiLevelColumn, copy) => {
      const col: Column = resolveDrop(data, copy, false);
      return d.push(col) != null;
    }));

    const justNumbers = (d: Column) => (d instanceof CompositeColumn && d.canJustAddNumbers) || (isNumberColumn(d) && d.parent instanceof Ranking);
    const dropOrMerge = (justNumbers: boolean) => {
      return (data: { [key: string]: string }, d: CompositeColumn | (Column & INumberColumn), copy: boolean) => {
        const col: Column = resolveDrop(data, copy, justNumbers);
        if (d instanceof CompositeColumn) {
          return (d.push(col) !== null);
        }
        const ranking = d.findMyRanker()!;
        const index = ranking.indexOf(d);
        const parent = <CompositeColumn>this.data.create(justNumbers ? createStackDesc() : createNestedDesc());
        d.removeMe();
        parent.push(d);
        parent.push(col);
        return ranking.insert(parent, index) != null;
      };
    };

    $headers.filter((d) => !isMultiLevelColumn(d) && justNumbers(d)).select('div.lu-label').call(dropAble([`${MIMETYPE_PREFIX}-number-ref`, `${MIMETYPE_PREFIX}-number`], dropOrMerge(true)));
    $headers.filter((d) => !isMultiLevelColumn(d) && !justNumbers(d)).select('div.lu-label').call(dropAble([`${MIMETYPE_PREFIX}-ref`, MIMETYPE_PREFIX], dropOrMerge(false)));

    if (this.options.summary) {

      $headers.filter((d) => isCategoricalColumn(d)).each(function (this: HTMLElement, col: ICategoricalColumn & Column) {
        that.renderCategoricalSummary(col, d3.select(this).select('div.summary'));
      });
      $headers.filter((d) => d instanceof NumberColumn).each(function (this: HTMLElement, col: NumberColumn) {
        that.renderNumericalSummary(col, d3.select(this).select('div.summary'));
      });
      $headers.filter((d) => d instanceof StringColumn).each(function (this: HTMLElement, col: StringColumn) {
        that.renderStringSummary(col, d3.select(this).select('div.summary'));
      });
      $headers.filter((d) => d instanceof SelectionColumn).each(function (this: HTMLElement, col: SelectionColumn) {
        that.renderSelectionSummary(col, d3.select(this).select('div.summary'));
      });
    }

    $headers.exit().remove();
  }

  private renderCategoricalSummary(col: ICategoricalColumn & Column, $this: d3.Selection<Column>) {
    const hist = this.histCache.get(col.id);
    if (!hist) {
      return;
    }
    const render = (stats: ICategoricalStatistics) => {
      const cats = col.categories;
      const colors = col.categoryColors;
      const $bars = $this.selectAll('div.bar').data(stats.hist);
      $bars.enter().append('div').classed('bar', true);
      const sx = d3.scale.ordinal().domain(cats).rangeBands([0, 100], 0.1);
      const sy = d3.scale.linear().domain([0, stats.maxBin]).range([0, 100]);
      $bars.style({
        left: (d) => `${sx(d.cat)}%`,
        width: `${sx.rangeBand()}%`,
        top: (d) => `${100 - sy(d.y)}%`,
        height: (d) => `${sy(d.y)}%`,
        'background-color': (d) => colors[cats.indexOf(d.cat)]
      }).attr({
        title: (d) => `${d.cat}: ${d.y}`,
        'data-cat': (d) => d.cat
      });
      $bars.exit().remove();
    };
    if (hist instanceof Promise) {
      hist.then(render);
    } else {
      render(<ICategoricalStatistics>hist);
    }
  }

  private renderNumericalSummary(col: INumberColumn & Column, $this: d3.Selection<Column>) {
    const hist = this.histCache.get(col.id);
    if (!hist) {
      return;
    }
    const render = (stats: IStatistics) => {
      const $bars = $this.selectAll('div.bar').data(stats.hist);
      $bars.enter().append('div').classed('bar', true);
      const sx = d3.scale.ordinal().domain(d3.range(stats.hist.length).map(String)).rangeBands([0, 100], 0.1);
      const sy = d3.scale.linear().domain([0, stats.maxBin]).range([0, 100]);
      $bars.style({
        left: (_d, i) => `${sx(String(i))}%`,
        width: `${sx.rangeBand()}%`,
        top: (d) => `${100 - sy(d.y)}%`,
        height: (d) => `${sy(d.y)}%`
      }).attr({
        title: (d, i) => `Bin ${i}: ${d.y}`,
        'data-x': (d) => d.x
      });
      $bars.exit().remove();

      let $mean = $this.select('div.mean');
      if ($mean.empty()) {
        $mean = $this.append('div').classed('mean', true);
      }
      $mean.style('left', `${stats.mean * 100}%`);
    };
    if (hist instanceof Promise) {
      hist.then(render);
    } else {
      render(<IStatistics>hist);
    }
  }

  private renderStringSummary(col: StringColumn, $this: d3.Selection<Column>) {
    const f = col.getFilter();
    $this.text(f === null ? '' : f.toString());
  }

  private renderSelectionSummary(col: SelectionColumn, $this: d3.Selection<Column>) {
    let $i = $this.select('i');
    if ($i.empty()) {
      $i = $this.append('i')
        .attr('class', 'fa fa-square-o')
        .attr('title', 'Toggle Select All');
    }
    $i.on('click', () => {
      if ($i.classed('fa-square-o')) {
        const all = col.findMyRanker()!.getOrder();
        $i.attr('class', 'fa fa-check-square-o');
        this.data.setSelection(all);
      } else {
        $i.attr('class', 'fa fa-square-o');
        this.data.clearSelection();
      }
    });
  }
}
