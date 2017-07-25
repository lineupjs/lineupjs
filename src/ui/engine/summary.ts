/**
 * Created by Samuel Gratzl on 25.07.2017.
 */
import Column from '../..//model/Column';
import {ICategoricalColumn} from '../../model/CategoricalColumn';
import {ICategoricalStatistics, IStatistics} from '../../model/Column';
import {INumberColumn} from '../../model/NumberColumn';
import SelectionColumn from '../../model/SelectionColumn';
import StringColumn from '../../model/StringColumn';
import ADataProvider from '../../provider/ADataProvider';

export function summaryCategorical(col: ICategoricalColumn & Column, node: HTMLElement, stats: ICategoricalStatistics) {
  const cats = col.categories;
  const colors = col.categoryColors;

  node.innerHTML = '';
  stats.hist.forEach(({cat, y}) => {
    node.insertAdjacentHTML('beforeend', `<div style="height: ${Math.round(y * 100 / stats.maxBin)}%; background-color: ${colors[cats.indexOf(cat)]}" title="${cat}: ${y}" data-cat="${cat}"></div>`);
  });
}

export function summaryNumerical(col: INumberColumn & Column, node: HTMLElement, stats: IStatistics) {
  node.innerHTML = '';
  stats.hist.forEach(({y}, i) => {
    node.insertAdjacentHTML('beforeend', `<div style="height: ${Math.round(y * 100 / stats.maxBin)}%" title="Bin ${i}: ${y}"></div>`);
  });
}

export function summaryString(col: StringColumn & Column, node: HTMLElement) {
  const f = col.getFilter();
  node.textContent = f === null ? '' : f.toString();
}

export function summarySelection(col: SelectionColumn, node: HTMLElement, provider: ADataProvider) {
  node.innerHTML = `<i class="fa fa-square-o" title="(Un)Select All"></i>`;
  const button = (<HTMLElement>node.firstElementChild);
  button.onclick = (evt) => {
    evt.stopPropagation();
    if (button.classList.contains('fa-square-o')) {
      const order = (col.findMyRanker()!).getOrder();
      provider.setSelection(order);
    } else {
      provider.clearSelection();
    }
    button.classList.toggle('fa-square-o');
    button.classList.toggle('fa-check-square-o');
  };
}
