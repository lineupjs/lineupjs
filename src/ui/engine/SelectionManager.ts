/**
 * Created by Samuel Gratzl on 11.10.2017.
 */
import {IDataProvider} from '../../provider/ADataProvider';
import {AEventDispatcher} from '../../utils';
import OrderedSet from '../../provider/OrderedSet';
import {IGroupData, IGroupItem, isGroup} from './interfaces';

interface IPoint {
  x: number;
  y: number;
}

interface IShift {
  xShift: number;
  yShift: number;
  node: HTMLElement;
}

export default class SelectionManager extends AEventDispatcher {
  static readonly EVENT_SELECT_RANGE = 'selectRange';
  private static readonly MIN_DISTANCE = 10;

  private readonly hr: HTMLHRElement;

  private start: (IPoint & IShift) | null = null;

  constructor(private readonly ctx: {provider: IDataProvider}, private readonly body: HTMLElement) {
    super();
    const root = body.parentElement!.parentElement!;
    let hr = <HTMLHRElement>root.querySelector('hr');
    if (!hr) {
      hr = root.ownerDocument.createElement('hr');
      root.appendChild(hr);
    }
    this.hr = hr;

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
      const startNode = findRow(this.start.node);
      // somehow on firefox the mouseUp will be triggered on the original node
      // thus search the node explicitly
      const end = <HTMLElement>this.body.ownerDocument.elementFromPoint(evt.clientX, evt.clientY);
      const endNode = findRow(end);
      this.start = null;
      this.body.classList.remove('lu-selection-active');
      this.hr.classList.remove('lu-selection-active');

      this.select(evt.ctrlKey, startNode, endNode);
    };

    body.addEventListener('mousedown', (evt) => {
      const r = root.getBoundingClientRect();
      this.start = {x: evt.clientX, y: evt.clientY, xShift: r.left, yShift: r.top, node: <HTMLElement>evt.target};
      body.addEventListener('mousemove', mouseMove);
      body.addEventListener('mouseup', mouseUp);
      body.addEventListener('mouseleave', mouseUp);
      this.body.classList.add('lu-selection-active');
    });
  }

  protected createEventList() {
    return super.createEventList().concat([SelectionManager.EVENT_SELECT_RANGE]);
  }

  private select(additional: boolean, startNode?: HTMLElement, endNode?: HTMLElement) {
    if (!startNode || !endNode || startNode === endNode) {
      return; // no single
    }

    const startIndex = parseInt(startNode.dataset.index!, 10);
    const endIndex = parseInt(endNode.dataset.index!, 10);

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
    this.hr.classList.toggle('lu-selection-active', visible);
    this.hr.style.transform = `translate(${start.x - start.xShift}px,${sy - start.yShift}px)scale(1,${Math.abs(ey - sy)})rotate(${ey > sy ? 90 : -90}deg)`;
  }

  remove(node: HTMLElement) {
    node.onclick = <any>undefined;
  }

  add(node: HTMLElement) {
    node.onclick = (evt) => {
      const dataIndex = parseInt(node.dataset.dataIndex!, 10);
      this.ctx.provider.toggleSelection(dataIndex, evt.ctrlKey);
    };
  }

  selectRange(rows: {forEach: (c: (item: (IGroupItem | IGroupData)) => void) => void}, additional: boolean = false) {
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
        d.rows.forEach((r) => toggle(r.dataIndex));
      } else {
        toggle(d.dataIndex);
      }
    });
    this.ctx.provider.setSelection(Array.from(current));
  }

  updateState(node: HTMLElement, dataIndex: number) {
    if (this.ctx.provider.isSelected(dataIndex)) {
      node.classList.add('lu-selected');
    } else {
      node.classList.remove('lu-selected');
    }
  }
  update(node: HTMLElement, selectedDataIndices: {has(dataIndex: number): boolean}) {
    const dataIndex = parseInt(node.dataset.dataIndex!, 10);
    if (selectedDataIndices.has(dataIndex)) {
      node.classList.add('lu-selected');
    } else {
      node.classList.remove('lu-selected');
    }
  }
}

function findRow(node: HTMLElement) {
  // use dataset.agg as discriminator
  while(node && !node.dataset.agg) {
    node = <HTMLElement>node.parentElement;
  }
  return <HTMLElement>node;
}
