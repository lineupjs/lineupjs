import {IDataRow} from '../model';
import AnnotateColumn from '../model/AnnotateColumn';
import Column from '../model/Column';
import StringCellRenderer from './StringCellRenderer';
import {noop} from './utils';

/** @internal */
export default class AnnotationRenderer extends StringCellRenderer {
  readonly title = 'Default';

  canRender(col: Column) {
    return super.canRender(col) && col instanceof AnnotateColumn;
  }

  create(col: AnnotateColumn) {
    return {
      template: `<div class='annotations text'>
        <input class='lu-hover-only'>
        <span class='text lu-not-hover'></span>
       </div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        const input: HTMLInputElement = <HTMLInputElement>n.firstElementChild!;
        input.onchange = () => {
          col.setValue(d, input.value);
        };
        input.onclick = (event) => {
          event.stopPropagation();
        };
        n.lastElementChild!.textContent = input.value = col.getLabel(d);
      },
      render: noop
    };
  }
}
