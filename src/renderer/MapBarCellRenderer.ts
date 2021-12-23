import { clear, round } from '../internal';
import {
  Column,
  IMapColumn,
  IMapAbleColumn,
  isMapAbleColumn,
  isMapColumn,
  IDataRow,
  isNumberColumn,
  INumberColumn,
} from '../model';
import { colorOf } from './impose';
import {
  ICellRendererFactory,
  IImposer,
  IRenderContext,
  ERenderMode,
  ISummaryRenderer,
  IGroupCellRenderer,
  ICellRenderer,
} from './interfaces';
import { renderMissingDOM } from './missing';
import { noRenderer, adaptColor, BIG_MARK_LIGHTNESS_FACTOR } from './utils';
import { cssClass } from '../styles';

export default class MapBarCellRenderer implements ICellRendererFactory {
  readonly title: string = 'Bar Table';

  canRender(col: Column, mode: ERenderMode): boolean {
    return (
      isMapColumn(col) &&
      isNumberColumn(col) &&
      (mode === ERenderMode.CELL || (mode === ERenderMode.SUMMARY && isMapAbleColumn(col)))
    );
  }

  create(col: IMapColumn<number> & INumberColumn, _context: IRenderContext, imposer?: IImposer): ICellRenderer {
    const formatter = col.getNumberFormat();

    return {
      template: `<div class="${cssClass('rtable')}"></div>`,
      update: (node: HTMLElement, d: IDataRow) => {
        if (renderMissingDOM(node, col, d)) {
          return;
        }
        renderTable(node, col.getMap(d), (n, { value }) => {
          if (Number.isNaN(value)) {
            n.classList.add(cssClass('missing'));
          } else {
            const w = round(value * 100, 2);
            n.title = formatter(value);
            const inner = n.ownerDocument.createElement('div');
            inner.style.width = `${w}%`;
            inner.style.backgroundColor = adaptColor(colorOf(col, d, imposer), BIG_MARK_LIGHTNESS_FACTOR);
            n.appendChild(inner);
            const span = n.ownerDocument.createElement('span');
            span.classList.add(cssClass('hover-only'));
            span.textContent = formatter(value);
            inner.appendChild(span);
          }
        });
      },
    };
  }

  createGroup(): IGroupCellRenderer {
    return noRenderer;
  }

  createSummary(col: IMapColumn<number> & IMapAbleColumn): ISummaryRenderer {
    return {
      template: `<div class="${cssClass('rtable')}"><div>Key</div><div><span></span><span></span>Value</div></div>`,
      update: (node: HTMLElement) => {
        const range = col.getRange();
        const value = node.lastElementChild! as HTMLElement;
        value.firstElementChild!.textContent = range[0];
        value.children[1]!.textContent = range[1];
      },
    };
  }
}

export function renderTable<E extends { key: string }>(
  node: HTMLElement,
  arr: readonly E[],
  renderValue: (v: HTMLElement, entry: E) => void
) {
  clear(node);
  const doc = node.ownerDocument;
  for (const entry of arr) {
    const keyNode = doc.createElement('div');
    keyNode.textContent = entry.key;
    node.appendChild(keyNode);
    const valueNode = doc.createElement('div');
    renderValue(valueNode, entry);
    node.appendChild(valueNode);
  }
}
