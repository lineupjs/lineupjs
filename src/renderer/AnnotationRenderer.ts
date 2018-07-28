import {IDataRow} from '../model';
import AnnotateColumn from '../model/AnnotateColumn';
import Column from '../model/Column';
import StringCellRenderer from './StringCellRenderer';
import {cssClass} from '../styles';

/** @internal */
export default class AnnotationRenderer extends StringCellRenderer {
  readonly title = 'Default';

  canRender(col: Column) {
    return super.canRender(col) && col instanceof AnnotateColumn;
  }

  create(col: AnnotateColumn) {
    return {
      template: `<div>
        <span></span>
        <input class="${cssClass('hover-only')} ${cssClass('annotate-input')}">
       </div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        const label = <HTMLElement>n.firstElementChild!;
        const input = <HTMLInputElement>n.lastElementChild!;
        input.onchange = () => {
          label.textContent = input.value;
          col.setValue(d, input.value);
        };
        input.onclick = (event) => {
          event.stopPropagation();
        };
        label.textContent = input.value = col.getLabel(d);
      }
    };
  }
}
