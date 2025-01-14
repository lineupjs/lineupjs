import { OrderedSet, AEventDispatcher, type IEventListener } from '../internal';
import { type IGroupData, type IGroupItem, isGroup } from '../model';
import type { IDataProvider } from '../provider';
import { cssClass, engineCssClass } from '../styles';
import { forEachIndices } from '../model/internal';
import { rangeSelection } from '../provider/utils';
import { detect } from 'detect-browser';

interface IPoint {
  x: number;
  y: number;
}

interface IShift {
  xShift: number;
  yShift: number;
  node: HTMLElement;
}

/**
 * @asMemberOf SelectionManager
 * @internal
 * @event
 */
export declare function selectRange(from: number, to: number, additional: boolean): void;

/** @internal */
export default class SelectionManager extends AEventDispatcher {
  static readonly EVENT_SELECT_RANGE = 'selectRange';
  private static readonly MIN_DISTANCE = 10;

  private readonly hr: HTMLHRElement;
  private readonly selectionActivateFilter: boolean | string = true;

  private start: (IPoint & IShift) | null = null;

  private readonly isFirefox = detect()?.name === 'firefox';

  constructor(
    private readonly ctx: { provider: IDataProvider },
    private readonly body: HTMLElement,
    { selectionActivateFilter = true }: { selectionActivateFilter?: boolean | string } = {}
  ) {
    super();
    this.selectionActivateFilter = selectionActivateFilter;
    const root = body.parentElement!.parentElement!;
    let hr = root.querySelector('hr');
    if (!hr) {
      hr = root.ownerDocument!.createElement('hr');
      root.appendChild(hr);
    }
    this.hr = hr;
    this.hr.classList.add(cssClass('hr'));

    const mouseMove = (evt: MouseEvent) => {
      this.showHint(evt);
    };
    const mouseUp = (evt: MouseEvent) => {
      this.body.removeEventListener('mousemove', mouseMove);
      this.body.removeEventListener('mouseup', mouseUp);
      this.body.removeEventListener('mouseleave', mouseUp);

      if (!this.start) {
        return;
      }
      const row = engineCssClass('tr');
      const startNode = this.start.node.classList.contains(row)
        ? this.start.node
        : this.start.node.closest<HTMLElement>(`.${row}`);
      // somehow on firefox the mouseUp will be triggered on the original node
      // thus search the node explicitly
      const end = this.body.ownerDocument!.elementFromPoint(evt.clientX, evt.clientY) as HTMLElement;
      const endNode = end.classList.contains(row) ? end : end.closest<HTMLElement>(`.${row}`);
      this.start = null;

      this.body.classList.remove(cssClass('selection-active'));
      this.hr.classList.remove(cssClass('selection-active'));

      this.select(evt.ctrlKey, startNode, endNode);
    };

    if (this.selectionActivateFilter !== false) {
      body.addEventListener(
        'mousedown',
        (evt) => {
          // activate only when filter is satisfied
          if (
            !(
              this.selectionActivateFilter !== false &&
              (this.selectionActivateFilter === true ||
                (evt.target as HTMLElement)?.matches(this.selectionActivateFilter) ||
                (evt.target as HTMLElement)?.closest(this.selectionActivateFilter) != null)
            )
          ) {
            return;
          }

          const r = root.getBoundingClientRect();
          this.start = {
            x: evt.clientX,
            y: evt.clientY,
            xShift: r.left,
            yShift: r.top,
            node: evt.target as HTMLElement,
          };

          this.body.classList.add(cssClass('selection-active'));
          body.addEventListener('mousemove', mouseMove, {
            passive: true,
          });
          body.addEventListener('mouseup', mouseUp, {
            passive: true,
          });
          body.addEventListener('mouseleave', mouseUp, {
            passive: true,
          });
        },
        {
          passive: true,
        }
      );
    }
  }

  protected createEventList() {
    return super.createEventList().concat([SelectionManager.EVENT_SELECT_RANGE]);
  }

  on(type: typeof SelectionManager.EVENT_SELECT_RANGE, listener: typeof selectRange | null): this;
  on(type: string | string[], listener: IEventListener | null): this; // required for correct typings in *.d.ts
  on(type: string | string[], listener: IEventListener | null): this {
    return super.on(type, listener);
  }

  private select(additional: boolean, startNode?: HTMLElement, endNode?: HTMLElement) {
    if (!startNode || !endNode || startNode === endNode) {
      return; // no single
    }

    const startIndex = Number.parseInt(startNode.dataset.index!, 10);
    const endIndex = Number.parseInt(endNode.dataset.index!, 10);

    const from = Math.min(startIndex, endIndex);
    const end = Math.max(startIndex, endIndex);
    if (from === end) {
      return; // no single
    }
    // bounce event end
    requestAnimationFrame(() => this.fire(SelectionManager.EVENT_SELECT_RANGE, from, end, additional));
  }

  private showHint(end: MouseEvent) {
    const start = this.start!;
    const sy = start.y;
    const ey = end.clientY;

    const visible = Math.abs(sy - ey) > SelectionManager.MIN_DISTANCE;
    this.hr.classList.toggle(cssClass('selection-active'), visible);
    this.hr.style.transform = `translate(${start.x - start.xShift}px,${sy - start.yShift}px)scale(1,${Math.abs(
      ey - sy
    )})rotate(${ey > sy ? 90 : -90}deg)`;
  }

  remove(node: HTMLElement) {
    node.onclick = undefined;
  }

  add(node: HTMLElement) {
    node.onclick = (evt) => {
      if (this.isFirefox) {
        const bb = node.getBoundingClientRect();
        // mouse up outside the element
        if (evt.offsetY < 0 || evt.offsetY > bb.height || evt.offsetX < 0 || evt.offsetY > bb.width) {
          return;
        }
      }
      const dataIndex = Number.parseInt(node.dataset.i!, 10);
      if (evt.shiftKey) {
        const relIndex = Number.parseInt(node.dataset.index!, 10);
        const ranking = node.parentElement!.dataset.ranking!;
        if (rangeSelection(this.ctx.provider, ranking, dataIndex, relIndex, evt.ctrlKey)) {
          return;
        }
      }
      this.ctx.provider.toggleSelection(dataIndex, evt.ctrlKey);
    };
  }

  selectRange(rows: { forEach: (c: (item: IGroupItem | IGroupData) => void) => void }, additional = false) {
    const current = new OrderedSet<number>(additional ? this.ctx.provider.getSelection() : []);
    const toggle = (dataIndex: number) => {
      if (current.has(dataIndex)) {
        current.delete(dataIndex);
      } else {
        current.add(dataIndex);
      }
    };
    rows.forEach((d) => {
      if (isGroup(d)) {
        forEachIndices(d.order, toggle);
      } else {
        toggle(d.dataIndex);
      }
    });
    this.ctx.provider.setSelection(Array.from(current));
  }

  updateState(node: HTMLElement, dataIndex: number) {
    if (this.ctx.provider.isSelected(dataIndex)) {
      node.classList.add(cssClass('selected'));
    } else {
      node.classList.remove(cssClass('selected'));
    }
  }

  update(node: HTMLElement, selectedDataIndices: { has(dataIndex: number): boolean }) {
    const dataIndex = Number.parseInt(node.dataset.i!, 10);
    if (selectedDataIndices.has(dataIndex)) {
      node.classList.add(cssClass('selected'));
    } else {
      node.classList.remove(cssClass('selected'));
    }
  }
}
