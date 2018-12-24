import {Column} from '../../model';
import {forEach} from '../../renderer/utils';
import {cssClass} from '../../styles';

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
export function sortMethods(node: HTMLElement, column: {setSortMethod(v: string): void, getSortMethod(): string}, methods: string[]) {
  const bak = column.getSortMethod();
  methods.forEach((d) => node.insertAdjacentHTML('beforeend', `<label class="${cssClass('checkbox')}"><input type="radio" name="multivaluesort" value="${d}"  ${(bak === d) ? 'checked' : ''} ><span>${d.slice(0, 1).toUpperCase() + d.slice(1)}</span></label>`));

  forEach(node, 'input[name=multivaluesort]', (n: HTMLInputElement) => {
    n.addEventListener('change', () => column.setSortMethod(n.value), {
      passive: true
    });
  });
}


/** @internal */
export {uniqueId, forEach, forEachChild, colorOf} from '../../renderer/utils';
