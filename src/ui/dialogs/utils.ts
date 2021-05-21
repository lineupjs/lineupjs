import { forEach } from '../../renderer/utils';
import { cssClass } from '../../styles';
import { getSortLabel } from '../../internal';
import type { IToolbarDialogAddonHandler } from '../interfaces';

/** @internal */
export function sortMethods(
  node: HTMLElement,
  column: { setSortMethod(v: string): void; getSortMethod(): string },
  methods: string[]
): IToolbarDialogAddonHandler {
  const bak = column.getSortMethod();
  methods.forEach((d) =>
    node.insertAdjacentHTML(
      'beforeend',
      `<label class="${cssClass('checkbox')}"><input type="radio" name="multivaluesort" value="${d}"  ${
        bak === d ? 'checked' : ''
      } ><span>${getSortLabel(d)}</span></label>`
    )
  );

  forEach(node, 'input[name=multivaluesort]', (n: HTMLInputElement) => {
    n.addEventListener('change', () => column.setSortMethod(n.value), {
      passive: true,
    });
  });

  return {
    elems: 'input[name=multivaluesort]',
    submit() {
      const selected = node.querySelector<HTMLInputElement>('input[name=multivaluesort]:checked')!.value;
      column.setSortMethod(selected);
      return true;
    },
    cancel() {
      column.setSortMethod(bak);
    },
    reset() {
      node.querySelector<HTMLInputElement>(`input[name=multivaluesort][value="${bak}"]`)!.checked = true;
    },
  };
}

/** @internal */
export { uniqueId, forEach, forEachChild, colorOf } from '../../renderer/utils';
