/**
 * Created by Samuel Gratzl on 25.07.2017.
 */
import Column from '../../model/Column';
import {default as CategoricalColumn, ICategoricalColumn, isCategoricalColumn} from '../../model/CategoricalColumn';
import {ICategoricalStatistics, IStatistics} from '../../model/Column';
import NumberColumn, {INumberColumn, isNumberColumn,} from '../../model/NumberColumn';
import SelectionColumn from '../../model/SelectionColumn';
import StringColumn from '../../model/StringColumn';
import CategoricalNumberColumn from '../../model/CategoricalNumberColumn';
import {filterMissingMarkup} from '../../dialogs/AFilterDialog';
import {stringFilter} from '../../dialogs/StringFilterDialog';
import {IDataProvider} from '../../provider/ADataProvider';
import {behavior, DragEvent, event as d3event, select, selectAll} from 'd3';
import {round} from '../../utils';
import {IRankingHeaderContext} from './interfaces';

export default function createSummary(node: HTMLElement, col: Column, ctx: IRankingHeaderContext, interactive: boolean = false) {
  if (col instanceof StringColumn) {
    summaryString(col, node, interactive);
  } else if (isCategoricalColumn(col)) {
    summaryCategorical(col, node, <ICategoricalStatistics>ctx.statsOf(col), interactive);
  } else if (isNumberColumn(col)) {
    summaryNumerical(col, node, <IStatistics>ctx.statsOf(col), interactive);
  } else if (col instanceof SelectionColumn) {
    summarySelection(col, node, ctx.provider);
  }
}

function summaryCategorical(col: ICategoricalColumn & Column, node: HTMLElement, stats: ICategoricalStatistics, withLabels: boolean) {
  node.innerHTML = '';
  if (!stats) {
    return;
  }
  node.dataset.summary = 'hist';
  const cats = col.categories;
  const colors = col.categoryColors;
  const labels = col.categoryLabels;

  stats.hist.forEach(({cat, y}) => {
    const i = cats.indexOf(cat);
    node.insertAdjacentHTML('beforeend', `<div style="height: ${Math.round(y * 100 / stats.maxBin)}%; background-color: ${colors[i]}" title="${labels[i]}: ${y}" data-cat="${cat}" ${withLabels ? `data-title="${labels[i]}"` : ''}></div>`);
  });

  if (!(col instanceof CategoricalColumn || col instanceof CategoricalNumberColumn)) {
    return;
  }
  node.dataset.summary = 'interactive-hist';
  // make histogram interactive
  const ccol = <CategoricalColumn | CategoricalNumberColumn>col;
  const start = ccol.getFilter();

  Array.from(node.children).forEach((bin: HTMLElement, i) => {
    const cat = bin.dataset.cat!;
    bin.dataset.filtered = CategoricalColumn.filter(start, cat) ? '' : 'filtered';
    bin.onclick = (evt) => {
      evt.preventDefault();
      evt.stopPropagation();

      // toggle filter
      const old = ccol.getFilter();
      if (old === null || !Array.isArray(old.filter)) {
        // deselect
        const without = cats.slice();
        bin.dataset.filtered = 'filtered';
        without.splice(i, 1);
        ccol.setFilter({
          filterMissing: false,
          filter: without
        });
        return;
      }
      const filter = old.filter.slice();
      const contained = filter.indexOf(cat);
      if (contained >= 0) {
        // remove
        bin.dataset.filtered = 'filtered';
        filter.splice(contained, 1);
      } else {
        // readd
        bin.dataset.filtered = '';
        filter.push(cat);
      }
      ccol.setFilter({
        filterMissing: old.filterMissing,
        filter
      });
    };
  });
}

function summaryNumerical(col: INumberColumn & Column, node: HTMLElement, stats: IStatistics, interactive: boolean) {
  node.innerHTML = '';
  if (!stats) {
    return;
  }
  node.dataset.summary = 'hist';
  stats.hist.forEach(({x, y}, i) => {
    node.insertAdjacentHTML('beforeend', `<div style="height: ${Math.round(y * 100 / stats.maxBin)}%" title="Bin ${i}: ${y}" data-x="${x}"></div>`);
  });

  if (!interactive || !(col instanceof NumberColumn)) {
    return;
  }

  node.dataset.summary = 'slider-hist';

  const ncol = <NumberColumn>col;
  const filter = ncol.getFilter();
  const domain = ncol.getMapping().domain;
  const percent = (v: number) => 100 * (v - domain[0]) / (domain[1] - domain[0]);
  const unpercent = (v: number) => ((v / 100) * (domain[1] - domain[0]) + domain[0]);
  const filterMin = isFinite(filter.min) ? filter.min : domain[0];
  const filterMax = isFinite(filter.max) ? filter.max : domain[1];
  node.insertAdjacentHTML('beforeend', `
    <div data-handle="min-hint" style="width: ${Math.round(percent(filterMin))}%"></div>
    <div data-handle="max-hint" style="right: ${Math.round(100 - percent(filterMax))}%; width: ${Math.round(100 - percent(filterMax))}%"></div>
    <div data-handle="min" data-value="${round(filterMin, 2)}" style="left: ${Math.round(percent(filterMin))}%"></div>
    <div data-handle='max' data-value="${round(filterMax, 2)}" style="right: ${Math.round(100 - percent(filterMax))}%"></div>
    ${filterMissingMarkup(filter.filterMissing)}
  `);

  const min = <HTMLElement>node.querySelector('[data-handle=min]');
  const max = <HTMLElement>node.querySelector('[data-handle=max]');
  const minHint = <HTMLElement>node.querySelector('[data-handle=min-hint]');
  const maxHint = <HTMLElement>node.querySelector('[data-handle=max-hint]');
  const filterMissing = <HTMLInputElement>node.querySelector('input');

  const update = () => {
    const minValue = unpercent(parseFloat(min.style.left!));
    const maxValue = unpercent(parseFloat(max.style.left!));
    ncol.setFilter({
      filterMissing: filterMissing.checked,
      min: Math.abs(minValue - domain[0]) < 0.001 ? NaN : minValue,
      max: Math.abs(maxValue - domain[1]) < 0.001 ? NaN : maxValue
    });
  };

  filterMissing.addEventListener('change', () => update());

  selectAll([min, max]).call(behavior.drag()
    .on('dragstart', function (this: HTMLElement) {
      select(this).classed('lu-dragging', true);
    })
    .on('drag', function (this: HTMLElement) {
      const evt = (<DragEvent>d3event);
      const total = node.clientWidth;
      const px = Math.max(0, Math.min(evt.x, total));
      const percent = Math.round(100 * px / total);
      this.dataset.value = round(unpercent(percent), 2).toString();

      if (this.dataset.handle === 'min') {
        this.style.left = `${percent}%`;
        minHint.style.width = `${percent}%`;
        return;
      }
      this.style.right = `${100 - percent}%`;
      maxHint.style.right = `${100 - percent}%`;
      maxHint.style.width = `${100 - percent}%`;
    })
    .on('dragend', function (this: HTMLElement) {
      select(this).classed('lu-dragging', false);
      update();
    }));
}

export function summaryString(col: StringColumn, node: HTMLElement, interactive: boolean) {
  node.dataset.summary = 'string';
  if (!interactive) {
    const filter = col.getFilter() || '';
    node.textContent = filter === StringColumn.FILTER_MISSING ? '' : String(filter);
    return;
  }

  const base = stringFilter(col);

  node.innerHTML = base.template;
  base.init(node);
}

function summarySelection(col: SelectionColumn, node: HTMLElement, provider: IDataProvider) {
  node.dataset.summary = 'selection';
  node.innerHTML = `<i class='fa fa-square-o' title='(Un)Select All'></i>`;
  const button = (<HTMLElement>node.firstElementChild);
  button.onclick = (evt) => {
    evt.stopPropagation();
    if (button.classList.contains('fa-square-o')) {
      provider.selectAllOf(col.findMyRanker()!);
    } else {
      provider.setSelection([]);
    }
    button.classList.toggle('fa-square-o');
    button.classList.toggle('fa-check-square-o');
  };
}
