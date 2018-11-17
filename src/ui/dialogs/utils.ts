import Column from '../../model';
import {forEach, uniqueId} from '../../renderer/utils';
import {cssClass} from '../../styles';
import {isMapAbleColumn} from '../../model/MappingFunction';

/** @internal */
export function updateFilterState(attachment: HTMLElement, column: Column, filtered: boolean) {
  const toggle = (e: Element) => {
    const n = <HTMLElement>e;
    if (filtered) {
      n.dataset.active = '';
    } else {
      delete n.dataset.active;
    }
  };

  toggle(attachment);
  const root = attachment.closest(`.${cssClass()}`);
  if (!root) {
    return;
  }
  Array.from(root.querySelectorAll(`[data-col-id="${column.id}"] i[title^=Filter]`)).forEach(toggle);
}

/** @internal */
export function sortMethods(node: HTMLElement, column: {setSortMethod(v: string): void, getSortMethod(): string}, methods: string[], idPrefix: string) {
  const id = uniqueId(idPrefix);
  const bak = column.getSortMethod();
  methods.forEach((d) => node.insertAdjacentHTML('beforeend', `<div class="${cssClass('checkbox')}"><input id="${id}${d}" type="radio" name="multivaluesort" value="${d}"  ${(bak === d) ? 'checked' : ''} ><label for="${id}${d}">${d.slice(0, 1).toUpperCase() + d.slice(1)}</label></div>`));

  forEach(node, 'input[name=multivaluesort]', (n: HTMLInputElement) => {
    n.addEventListener('change', () => column.setSortMethod(n.value), {
      passive: true
    });
  });
}

/** @internal */
export function colorOf(col: Column) {
  if (isMapAbleColumn(col)) {
    return col.getColorMapping().apply(0);
  }
  return Column.DEFAULT_COLOR;
}

/** @internal */
export {uniqueId, forEach, forEachChild} from '../../renderer/utils';
