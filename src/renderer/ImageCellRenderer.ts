import { Column, IDataRow, LinkColumn } from '../model';
import { ERenderMode, ICellRendererFactory, ICellRenderer, IGroupCellRenderer, ISummaryRenderer } from './interfaces';
import { renderMissingDOM } from './missing';
import { noRenderer } from './utils';
import { abortAble } from 'lineupengine';

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.src = src;
  });
}

export default class ImageCellRenderer implements ICellRendererFactory {
  readonly title: string = 'Image';

  canRender(col: Column, mode: ERenderMode): boolean {
    return col instanceof LinkColumn && mode === ERenderMode.CELL;
  }

  create(col: LinkColumn): ICellRenderer {
    return {
      template: `<div></div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        const missing = renderMissingDOM(n, col, d);
        n.style.backgroundImage = null;
        if (missing) {
          n.title = '';
          return undefined;
        }
        const v = col.getLink(d);
        n.title = v ? v.alt : '';
        if (!v) {
          return undefined;
        }
        return abortAble(loadImage(v.href)).then((image) => {
          if (typeof image === 'symbol') {
            return;
          }
          n.style.backgroundImage = missing || !v ? null : `url('${image.src}')`;
        });
      },
    };
  }

  createGroup(): IGroupCellRenderer {
    return noRenderer;
  }

  createSummary(): ISummaryRenderer {
    return noRenderer;
  }
}
