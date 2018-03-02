import {D3DragEvent, drag} from 'd3-drag';
import {event as d3event, selectAll} from 'd3-selection';
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
import {noop} from './utils';

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
      },
      render: noop
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
    template += `<span>${range[0]}</span><span>${range[1]}</span>`;
  }
  return {
    template: `${template}</div>`,
    update: (node: HTMLElement, hist: IStatistics | null) => {
      if (isMapAbleColumn(col)) {
        const range = col.getRange();
        Array.from(node.querySelectorAll('span')).forEach((d: HTMLElement, i) => d.textContent = range[i]);
      }

      node.classList.toggle('lu-missing', !hist);
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
      <div data-handle="min-hint" style="width: ${f.percent(f.filterMin)}%"></div>
      <div data-handle="max-hint" style="width: ${100 - f.percent(f.filterMax)}%"></div>
      <div data-handle="min" data-value="${round(f.filterMin, 2)}" style="left: ${f.percent(f.filterMin)}%" title="min filter, drag or shift click to change"></div>
      <div data-handle='max' data-value="${round(f.filterMax, 2)}" style="right: ${100 - f.percent(f.filterMax)}%" title="max filter, drag or shift click to change"></div>
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

      node.classList.toggle('lu-missing', !hist);
      if (!hist) {
        return;
      }
      render(node, {bins: hist.hist.length, max: hist.maxBin, hist: hist.hist});
    }
  };
}

function initFilter(node: HTMLElement, col: IMapAbleColumn, context: IRenderContext) {
  const min = <HTMLElement>node.querySelector('[data-handle=min]');
  const max = <HTMLElement>node.querySelector('[data-handle=max]');
  const minHint = <HTMLElement>node.querySelector('[data-handle=min-hint]');
  const maxHint = <HTMLElement>node.querySelector('[data-handle=max-hint]');
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
    if (!evt.shiftKey) {
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
    if (!evt.shiftKey) {
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

  selectAll([min, max]).call(drag<HTMLElement, {}>()
    .filter(() => d3event.button === 0 && !d3event.shiftKey)
    .on('start', function (this: HTMLElement) {
      this.classList.add('lu-dragging');
    })
    .on('drag', function (this: HTMLElement) {
      const evt = (<D3DragEvent<any, any, any>>d3event);
      const total = node.clientWidth;
      const px = Math.max(0, Math.min(evt.x, total));
      const percent = Math.round(100 * px / total);
      const domain = col.getMapping().domain;
      const unpercent = (v: number) => ((v / 100) * (domain[1] - domain[0]) + domain[0]);
      this.dataset.value = round(unpercent(percent), 2).toString();

      if (this.dataset.handle === 'min') {
        this.style.left = `${percent}%`;
        minHint.style.width = `${percent}%`;
        return;
      }
      this.style.right = `${100 - percent}%`;
      maxHint.style.width = `${100 - percent}%`;
    })
    .on('end', function (this: HTMLElement) {
      this.classList.remove('lu-dragging');
      setFilter();
    }));

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
    bins += `<div title="Bin ${i}: 0" data-x=""><div style="height: 0" ></div></div>`;
  }

  const render = (n: HTMLElement, stats: {bins: number, max: number, hist: INumberBin[]}) => {
    const {bins, max, hist} = stats;
    //adapt the number of children
    let nodes = <HTMLElement[]>Array.from(n.querySelectorAll('[data-x]'));
    if (nodes.length > bins) {
      nodes.splice(bins, nodes.length - bins).forEach((d) => d.remove());
    } else if (nodes.length < bins) {
      for (let i = nodes.length; i < bins; ++i) {
        n.insertAdjacentHTML('afterbegin', `<div title="Bin ${i}: 0" data-x=""><div style="height: 0" ></div></div>`);
      }
      nodes = Array.from(n.querySelectorAll('[data-x]'));
    }
    n.classList.toggle('lu-dense', bins > DENSE_HISTOGRAM);
    nodes.forEach((d: HTMLElement, i) => {
      const {x0, x1, length} = hist[i];
      const inner = <HTMLElement>d.firstElementChild!;
      d.title = `${DEFAULT_FORMATTER(x0)} - ${DEFAULT_FORMATTER(x1)} (${length})`;
      d.dataset.x = DEFAULT_FORMATTER(x0);
      inner.style.height = `${Math.round(length * 100 / max)}%`;
      inner.style.backgroundColor = colorOf(col, null, imposer);
    });
  };
  return {
    template: `<div${guessedBins > DENSE_HISTOGRAM ? ' class="lu-dense' : ''}>${bins}`, // no closing div to be able to append things
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
