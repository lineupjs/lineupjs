import Column from '../../model';

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
  const root = attachment.closest('.lu');
  if (!root) {
    return;
  }
  Array.from(root.querySelectorAll(`[data-col-id="${column.id}"] i[title^=Filter]`)).forEach(toggle);
}

export {randomId, forEach, forEachChild} from '../../renderer/utils';
