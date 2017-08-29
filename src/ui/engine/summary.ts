/**
 * Created by Samuel Gratzl on 25.07.2017.
 */
import Column from '../..//model/Column';
import {ICategoricalColumn, isCategoricalColumn} from '../../model/CategoricalColumn';
import {ICategoricalStatistics, IStatistics} from '../../model/Column';
import {INumberColumn, isNumberColumn} from '../../model/NumberColumn';
import SelectionColumn from '../../model/SelectionColumn';
import StringColumn from '../../model/StringColumn';
import {IDataProvider} from '../../provider/ADataProvider';
import {IRankingHeaderContext} from './RenderColumn';

export default function createSummary(node: HTMLElement, col: Column, ctx: IRankingHeaderContext) {
  if (col instanceof StringColumn) {
    summaryString(col, node);
  } else if (isCategoricalColumn(col)) {
    summaryCategorical(<ICategoricalColumn & Column>col, node, <ICategoricalStatistics>ctx.statsOf(<ICategoricalColumn & Column>col));
  } else if (isNumberColumn(col)) {
    summaryNumerical(node, <IStatistics>ctx.statsOf(<INumberColumn & Column>col));
  } else if (col instanceof SelectionColumn) {
    summarySelection(col, node, ctx.provider);
  }
}

function summaryCategorical(col: ICategoricalColumn & Column, node: HTMLElement, stats: ICategoricalStatistics) {
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
    node.insertAdjacentHTML('beforeend', `<div style="height: ${Math.round(y * 100 / stats.maxBin)}%; background-color: ${colors[i]}" title="${labels[i]}: ${y}" data-cat="${cat}"></div>`);
  });
}

function summaryNumerical(node: HTMLElement, stats: IStatistics) {
  node.innerHTML = '';
  if (!stats) {
    return;
  }
  node.dataset.summary = 'hist';
  stats.hist.forEach(({x, y}, i) => {
    node.insertAdjacentHTML('beforeend', `<div style="height: ${Math.round(y * 100 / stats.maxBin)}%" title="Bin ${i}: ${y}" data-x="${x}"></div>`);
  });
}

function summaryString(col: StringColumn & Column, node: HTMLElement) {
  const f = col.getFilter();
  node.textContent = f === null ? '' : f.toString();
}

function summarySelection(col: SelectionColumn, node: HTMLElement, provider: IDataProvider) {
  node.innerHTML = `<i class="fa fa-square-o" title="(Un)Select All"></i>`;
  const button = (<HTMLElement>node.firstElementChild);
  button.onclick = (evt) => {
    evt.stopPropagation();
    if (button.classList.contains('fa-square-o')) {
      const order = (col.findMyRanker()!).getOrder();
      provider.setSelection(order);
    } else {
      provider.setSelection([]);
    }
    button.classList.toggle('fa-square-o');
    button.classList.toggle('fa-check-square-o');
  };
}
