import {DENSE_HISTOGRAM} from '../config';
import {computeStats, getNumberOfBins, INumberBin, IStatistics, round} from '../internal/math';
import {IDataRow, IGroup, isMissingValue} from '../model';
import Column from '../model/Column';
import {
  DEFAULT_FORMATTER, INumberColumn, INumbersColumn, isNumberColumn,
  isNumbersColumn
} from '../model/INumberColumn';
import {IMapAbleColumn, isMapAbleColumn} from '../model/MappingFunction';
import InputNumberDialog from '../ui/dialogs/InputNumberDialog';
import {filterMissingNumberMarkup, updateFilterMissingNumberMarkup} from '../ui/missing';
import {colorOf} from './impose';
import {default as IRenderContext, ERenderMode, ICellRendererFactory, IImposer} from './interfaces';
import {renderMissingDOM} from './missing';
import {cssClass} from '../styles';
import {dragHandle, IDragHandleOptions} from '../internal/drag';

/** @internal */
export default class HistogramCellRenderer implements ICellRendererFactory {
  readonly title = 'Histogram';

  canRender(col: Column, mode: ERenderMode) {
    return (isNumberColumn(col) && mode !== ERenderMode.CELL) || (isNumbersColumn(col) && mode === ERenderMode.CELL);
  }

  create(col: INumbersColumn, context: IRenderContext, hist: IStatistics | null, imposer?: IImposer) {
    const {template, render, guessedBins} = getHistDOMRenderer(context.totalNumberOfRows, col, imposer);
    return {
      template: `${template}</div>`,
      update: (n: HTMLElement, row: IDataRow) => {
        if (renderMissingDOM(n, col, row)) {
          return;
        }
        render(n, createHist(hist, guessedBins, [row], col));
      }
    };
  }

  createGroup(col: INumberColumn, context: IRenderContext, hist: IStatistics | null, imposer?: IImposer) {
    const {template, render, guessedBins} = getHistDOMRenderer(context.totalNumberOfRows, col, imposer);
    return {
      template: `${template}</div>`,
      update: (n: HTMLElement, _group: IGroup, rows: IDataRow[]) => {
        render(n, createHist(hist, guessedBins, rows, col));
      }
    };
  }

  createSummary(col: INumberColumn, context: IRenderContext, interactive: boolean, imposer?: IImposer) {
    const r = getHistDOMRenderer(context.totalNumberOfRows, col, imposer);

    const staticHist = !interactive || !isMapAbleColumn(col);
    return staticHist ? staticSummary(col, r.template, r.render) : interactiveSummary(<IMapAbleColumn>col, context, r.template, r.render);
  }
}


function staticSummary(col: INumberColumn, template: string, render: (n: HTMLElement, stats: {bins: number, max: number, hist: INumberBin[]}) => void) {
  if (isMapAbleColumn(col)) {
    const range = col.getRange();
    template += `<span class="${cssClass('mapping-hint')}">${range[0]}</span><span class="${cssClass('mapping-hint')}">${range[1]}</span>`;
  }
  return {
    template: `${template}</div>`,
    update: (node: HTMLElement, hist: IStatistics | null) => {
      if (isMapAbleColumn(col)) {
        const range = col.getRange();
        Array.from(node.querySelectorAll('span')).forEach((d: HTMLElement, i) => d.textContent = range[i]);
      }

      node.classList.toggle(cssClass('missing'), !hist);
      if (!hist) {
        return;
      }
      render(node, {bins: hist.hist.length, max: hist.maxBin, hist: hist.hist});
    }
  };
}

function interactiveSummary(col: IMapAbleColumn, context: IRenderContext, template: string, render: (n: HTMLElement, stats: {bins: number, max: number, hist: INumberBin[]}) => void) {
  const f = filter(col);
  template += `
      <div class="${cssClass('histogram-min-hint')}" style="width: ${f.percent(f.filterMin)}%"></div>
      <div class="${cssClass('histogram-max-hint')}" style="width: ${100 - f.percent(f.filterMax)}%"></div>
      <div class="${cssClass('histogram-min')}" data-value="${round(f.filterMin, 2)}" style="left: ${f.percent(f.filterMin)}%" title="min filter, drag or shift click to change"></div>
      <div class="${cssClass('histogram-max')}" data-value="${round(f.filterMax, 2)}" style="right: ${100 - f.percent(f.filterMax)}%" title="max filter, drag or shift click to change"></div>
      ${filterMissingNumberMarkup(f.filterMissing, 0, context.idPrefix)}
    `;

  let updateFilter: (missing: number, col: IMapAbleColumn) => void;

  return {
    template: `${template}</div>`,
    update: (node: HTMLElement, hist: IStatistics | null) => {
      if (!updateFilter) {
        updateFilter = initFilter(node, col, context);
      }
      updateFilter(hist ? hist.missing : 0, col);

      node.classList.toggle(cssClass('missing'), !hist);
      if (!hist) {
        return;
      }
      render(node, {bins: hist.hist.length, max: hist.maxBin, hist: hist.hist});
    }
  };
}

function initFilter(node: HTMLElement, col: IMapAbleColumn, context: IRenderContext) {
  const min = <HTMLElement>node.querySelector(`.${cssClass('histogram-min')}`);
  const max = <HTMLElement>node.querySelector(`.${cssClass('histogram-max')}`);
  const minHint = <HTMLElement>node.querySelector(`.${cssClass('histogram-min-hint')}`);
  const maxHint = <HTMLElement>node.querySelector(`.${cssClass('histogram-max-hint')}`);
  const filterMissing = <HTMLInputElement>node.querySelector('input');

  const setFilter = () => {
    const f = filter(col);
    const minValue = f.unpercent(parseFloat(min.style.left!));
    const maxValue = f.unpercent(100 - parseFloat(max.style.right!));
    col.setFilter({
      filterMissing: filterMissing.checked,
      min: Math.abs(minValue - f.domain[0]) < 0.001 ? NaN : minValue,
      max: Math.abs(maxValue - f.domain[1]) < 0.001 ? NaN : maxValue
    });
  };

  min.onclick = (evt) => {
    if (!evt.shiftKey && !evt.ctrlKey) {
      return;
    }
    evt.preventDefault();
    evt.stopPropagation();

    const f = filter(col);
    const value = f.unpercent(parseFloat(min.style.left!));

    const dialogCtx = {
      attachment: min,
      manager: context.dialogManager,
      level: 1,
      idPrefix: context.idPrefix
    };

    const dialog = new InputNumberDialog(dialogCtx, (newValue) => {
      minHint.style.width = `${f.percent(newValue)}%`;
      min.dataset.value = round(newValue, 2).toString();
      min.style.left = `${f.percent(newValue)}%`;
      setFilter();
    }, {
        value, min: f.domain[0], max: f.domain[1]
      });
    dialog.open();
  };

  max.onclick = (evt) => {
    if (!evt.shiftKey && !evt.ctrlKey) {
      return;
    }
    evt.preventDefault();
    evt.stopPropagation();

    const f = filter(col);
    const value = f.unpercent(100 - parseFloat(max.style.right!));

    const dialogCtx = {
      attachment: max,
      manager: context.dialogManager,
      level: 1,
      idPrefix: context.idPrefix
    };

    const dialog = new InputNumberDialog(dialogCtx, (newValue) => {
      maxHint.style.width = `${100 - f.percent(newValue)}%`;
      max.dataset.value = round(newValue, 2).toString();
      max.style.right = `${100 - f.percent(newValue)}%`;
      setFilter();
    }, {
        value, min: f.domain[0], max: f.domain[1]
      });
    dialog.open();
  };

  filterMissing.onchange = () => setFilter();

  const options: Partial<IDragHandleOptions> = {
    minDelta: 0,
    filter: (evt) => evt.button === 0 && !evt.shiftKey && !evt.ctrlKey,
    onStart: (handle) => handle.classList.add(cssClass('hist-dragging')),
    onDrag: (handle, x) => {
      const total = node.clientWidth;
      const px = Math.max(0, Math.min(x, total));
      const percent = Math.round(100 * px / total);
      const domain = col.getMapping().domain;
      (<HTMLElement>handle).dataset.value = round(((percent / 100) * (domain[1] - domain[0]) + domain[0]), 2).toString();

      if ((<HTMLElement>handle).classList.contains(cssClass('histogram-min'))) {
        handle.style.left = `${percent}%`;
        minHint.style.width = `${percent}%`;
        return;
      }
      handle.style.right = `${100 - percent}%`;
      maxHint.style.width = `${100 - percent}%`;
    },
    onEnd: (handle) => {
      handle.classList.remove(cssClass('hist-dragging'));
      setFilter();
    }
  };
  dragHandle(min, options);
  dragHandle(max, options);

  return (missing: number, actCol: IMapAbleColumn) => {
    col = actCol;
    const f = filter(col);
    minHint.style.width = `${f.percent(f.filterMin)}%`;
    maxHint.style.width = `${100 - f.percent(f.filterMax)}%`;
    min.dataset.value = round(f.filterMin, 2).toString();
    max.dataset.value = round(f.filterMax, 2).toString();
    min.style.left = `${f.percent(f.filterMin)}%`;
    max.style.right = `${100 - f.percent(f.filterMax)}%`;
    filterMissing.checked = f.filterMissing;
    updateFilterMissingNumberMarkup(<HTMLElement>filterMissing.parentElement, missing);
  };
}

function createHist(globalHist: IStatistics | null, guessedBins: number, rows: IDataRow[], col: INumberColumn) {
  const bins = globalHist ? globalHist.hist.length : guessedBins;
  let stats: IStatistics;
  if (isNumbersColumn(col)) {
    //multiple values
    const values = (<number[]>[]).concat(...rows.map((r) => col.getNumbers(r)));
    stats = computeStats(values, (v: number) => v, isMissingValue, [0, 1], bins);
  } else {
    stats = computeStats(rows, (r: IDataRow) => col.getNumber(r), (r: IDataRow) => col.isMissing(r), [0, 1], bins);
  }

  const max = Math.max(stats.maxBin, globalHist ? globalHist.maxBin : 0);
  return {bins, max, hist: stats.hist};
}

export function getHistDOMRenderer(totalNumberOfRows: number, col: INumberColumn, imposer?: IImposer) {
  const guessedBins = getNumberOfBins(totalNumberOfRows);
  let bins = '';
  for (let i = 0; i < guessedBins; ++i) {
    bins += `<div class="${cssClass('histogram-bin')}" title="Bin ${i}: 0" data-x=""><div style="height: 0" ></div></div>`;
  }

  const render = (n: HTMLElement, stats: {bins: number, max: number, hist: INumberBin[]}) => {
    const {bins, max, hist} = stats;
    //adapt the number of children
    let nodes = <HTMLElement[]>Array.from(n.querySelectorAll('[data-x]'));
    if (nodes.length > bins) {
      nodes.splice(bins, nodes.length - bins).forEach((d) => d.remove());
    } else if (nodes.length < bins) {
      for (let i = nodes.length; i < bins; ++i) {
        n.insertAdjacentHTML('afterbegin', `<div class="${cssClass('histogram-bin')}" title="Bin ${i}: 0" data-x=""><div style="height: 0" ></div></div>`);
      }
      nodes = Array.from(n.querySelectorAll('[data-x]'));
    }
    n.classList.toggle(cssClass('dense'), bins > DENSE_HISTOGRAM);
    nodes.forEach((d: HTMLElement, i) => {
      const {x0, x1, length} = hist[i];
      const inner = <HTMLElement>d.firstElementChild!;
      d.title = `${DEFAULT_FORMATTER(x0)} - ${DEFAULT_FORMATTER(x1)} (${length})`;
      d.dataset.x = DEFAULT_FORMATTER(x0);
      inner.style.height = `${Math.round(length * 100 / max)}%`;
      inner.style.backgroundColor = colorOf(col, null, imposer, (x1 + x0) / 2);
    });
  };
  return {
    template: `<div class="${cssClass('histogram')} ${guessedBins > DENSE_HISTOGRAM ? cssClass('dense'): ''}">${bins}`, // no closing div to be able to append things
    render,
    guessedBins
  };
}


function filter(col: IMapAbleColumn) {
  const filter = col.getFilter();
  const domain = col.getMapping().domain;
  const percent = (v: number) => Math.round(100 * (v - domain[0]) / (domain[1] - domain[0]));
  const unpercent = (v: number) => ((v / 100) * (domain[1] - domain[0]) + domain[0]);
  const filterMin = isFinite(filter.min) ? filter.min : domain[0];
  const filterMax = isFinite(filter.max) ? filter.max : domain[1];
  return {
    filterMissing: filter.filterMissing,
    domain,
    percent,
    unpercent,
    filterMin,
    filterMax
  };
}
