import {IDataRow} from '../model';
import AnnotateColumn from '../model/AnnotateColumn';
import Column from '../model/Column';
import {ICellRendererFactory} from './interfaces';
import {noop, noRenderer} from './utils';

export default class AnnotationRenderer implements ICellRendererFactory {
  readonly title = 'Default';

  canRender(col: Column) {
    return col instanceof AnnotateColumn;
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

  createGroup() {
    return noRenderer;
  }
}
