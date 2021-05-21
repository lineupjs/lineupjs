import { IDataRow, AnnotateColumn, Column } from '../model';
import StringCellRenderer from './StringCellRenderer';
import { cssClass } from '../styles';
import type { ICellRenderer } from './interfaces';

export default class AnnotationRenderer extends StringCellRenderer {
  readonly title: string = 'Default';

  canRender(col: Column) {
    return super.canRender(col) && col instanceof AnnotateColumn;
  }

  create(col: AnnotateColumn): ICellRenderer {
    return {
      template: `<div>
        <span></span>
        <input class="${cssClass('hover-only')} ${cssClass('annotate-input')}">
       </div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        const label = n.firstElementChild! as HTMLElement;
        const input = n.lastElementChild! as HTMLInputElement;
        input.onchange = () => {
          label.textContent = input.value;
          col.setValue(d, input.value);
        };
        input.onclick = (event) => {
          event.stopPropagation();
        };
        label.textContent = input.value = col.getLabel(d);
      },
    };
  }
}
