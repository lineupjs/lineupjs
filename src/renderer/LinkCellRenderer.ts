import { LinkColumn, Column, IDataRow, IOrderedGroup, ILink } from '../model';
import {
  IRenderContext,
  ERenderMode,
  ICellRendererFactory,
  ISummaryRenderer,
  IGroupCellRenderer,
  ICellRenderer,
} from './interfaces';
import { renderMissingDOM } from './missing';
import { noRenderer, setText } from './utils';
import { cssClass } from '../styles';
import { clear, ISequence } from '../internal';

export default class LinkCellRenderer implements ICellRendererFactory {
  readonly title: string = 'Link';

  canRender(col: Column, mode: ERenderMode): boolean {
    return col instanceof LinkColumn && mode !== ERenderMode.SUMMARY;
  }

  create(col: LinkColumn, context: IRenderContext): ICellRenderer {
    const align = context.sanitize(col.alignment || 'left');
    return {
      template: `<a${
        align !== 'left' ? ` class="${cssClass(align)}"` : ''
      } target="_blank" rel="noopener" href=""></a>`,
      update: (n: HTMLAnchorElement, d: IDataRow) => {
        renderMissingDOM(n, col, d);
        const v = col.getLink(d);
        n.href = v ? v.href : '';
        if (col.escape) {
          setText(n, v ? v.alt : '');
        } else {
          n.innerHTML = v ? v.alt : '';
        }
      },
    };
  }

  private static exampleText(col: LinkColumn, rows: ISequence<IDataRow>): [ILink[], boolean] {
    const numExampleRows = 5;
    const examples: ILink[] = [];
    rows.every((row) => {
      const v = col.getLink(row);
      if (!v) {
        return true;
      }
      examples.push(v);
      return examples.length < numExampleRows;
    });
    if (examples.length === 0) {
      return [[], false];
    }
    return [examples, examples.length < rows.length];
  }

  createGroup(col: LinkColumn, context: IRenderContext): IGroupCellRenderer {
    return {
      template: `<div> </div>`,
      update: (n: HTMLDivElement, group: IOrderedGroup) => {
        return context.tasks
          .groupExampleRows(col, group, 'link', (rows) => LinkCellRenderer.exampleText(col, rows))
          .then((out) => {
            if (typeof out === 'symbol') {
              return;
            }
            const [links, more] = out;
            updateLinkList(n, links, more);
          });
      },
    };
  }

  createSummary(): ISummaryRenderer {
    return noRenderer;
  }
}

export function updateLinkList(n: HTMLElement, links: ILink[], more: boolean) {
  n.classList.toggle(cssClass('missing'), links.length === 0);
  clear(n);
  links.forEach((l, i) => {
    if (i > 0) {
      n.appendChild(n.ownerDocument.createTextNode(', '));
    }
    const a = n.ownerDocument.createElement('a');
    a.href = l.href;
    a.textContent = l.alt;
    a.target = '_blank';
    a.rel = 'noopener';
    n.appendChild(a);
  });
  if (more) {
    n.insertAdjacentText('beforeend', ', …');
  }
}
