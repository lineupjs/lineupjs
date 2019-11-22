import {Column, IDataRow, LinkColumn} from '../model';
import {ERenderMode, ICellRendererFactory} from './interfaces';
import {renderMissingDOM} from './missing';
import {noRenderer} from './utils';
import {abortAble} from 'lineupengine';

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.src = src;
  });
}

export default class ImageCellRenderer implements ICellRendererFactory {
  readonly title = 'Image';

  canRender(col: Column, mode: ERenderMode) {
    return col instanceof LinkColumn && mode === ERenderMode.CELL;
  }

  create(col: LinkColumn) {
    return {
      template: `<div></div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        const missing = renderMissingDOM(n, col, d);
        n.style.backgroundImage = null;
        if (missing) {
          n.title = '';
          return;
        }
        const v = col.getLink(d);
        n.title = v ? v.alt : '';
        if (!v) {
          return;
        }
        return abortAble(loadImage(v.href)).then((image) => {
          if (typeof image === 'symbol') {
            return;
          }
          n.style.backgroundImage = missing || !v ? null : `url('${image.src}')`;
        });
      }
    };
  }

  createGroup() {
    return noRenderer;
  }

  createSummary() {
    return noRenderer;
  }
}
