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
}

export default class SelectionManager extends AEventDispatcher {
  static readonly EVENT_SELECT_RANGE = 'selectRange';
  private static readonly MIN_DISTANCE = 10;

  private readonly hr: HTMLHRElement;

  private start: (IPoint & IShift)|null = null;
  private startNode: HTMLElement|null = null;
  private endNode: HTMLElement|null = null;

  constructor(private readonly ctx: {provider: IDataProvider}, private readonly body: HTMLElement) {
    super();
    const root = body.parentElement!.parentElement!;
    let hr = <HTMLHRElement>root.querySelector('hr');
    if (!hr) {
      hr = root.ownerDocument.createElement('hr');
      root.appendChild(hr);
    }
    this.hr = hr;

    body.addEventListener('mousemove', (evt) => {
      if (!this.start) {
        return;
      }
      this.showHint(this.start, evt);
    });
    body.addEventListener('mousedown', (evt) => {
      const r = root.getBoundingClientRect();
      this.start = {x: evt.x, y: evt.y, xShift: r.left, yShift: r.top};
    });
    const end = (evt: MouseEvent) => {
      this.select(evt.ctrlKey);
      this.start = this.startNode = this.endNode = null;
      this.body.classList.remove('lu-selection-active');
      this.hr.classList.remove('lu-selection-active');
    };
    body.addEventListener('mouseup', end);
    body.addEventListener('mouseleave', end);
  }

  protected createEventList() {
    return super.createEventList().concat([SelectionManager.EVENT_SELECT_RANGE]);
  }

  private select(additional: boolean) {
    if (!this.start || !this.startNode || !this.endNode) {
      return;
    }
    if (this.startNode === this.endNode) {
      return; // no single
    }

    const startIndex = parseInt(this.startNode.dataset.index!, 10);
    const endIndex = parseInt(this.endNode.dataset.index!, 10);

    const from = Math.min(startIndex, endIndex);
    const end = Math.max(startIndex, endIndex);
    if (from === end) {
      return; // no single
    }
    this.fire(SelectionManager.EVENT_SELECT_RANGE, from, end, additional);
  }

  private showHint(start: IPoint & IShift, end: IPoint) {
    this.start = start;
    const sy = start.y;
    const ey = end.y;

    const visible = Math.abs(sy - ey) > SelectionManager.MIN_DISTANCE;
    this.body.classList.toggle('lu-selection-active', visible);
    this.hr.classList.toggle('lu-selection-active', visible);
    this.hr.style.transform = `translate(${start.x - start.xShift}px,${sy - start.yShift}px)scale(1,${Math.abs(ey - sy)})rotate(${ey>sy ? 90 : -90}deg)`;
  }

  remove(node: HTMLElement) {
    node.onclick = node.onmousedown = node.onmouseup = <any>undefined;
  }

  add(node: HTMLElement) {
    node.onclick = (evt) => {
      const dataIndex = parseInt(node.dataset.dataIndex!, 10);
      this.ctx.provider.toggleSelection(dataIndex, evt.ctrlKey);
    };
    node.onmousedown = () => {
      this.startNode = node;
    };
    node.onmouseup = () => {
      if (this.start) {
        this.endNode = node;
      }
    };
  }

  selectRange(rows: {forEach: (c: (item: (IGroupItem|IGroupData))=>void)=>void}, additional: boolean = false) {
    const current = new OrderedSet<number>(additional ? this.ctx.provider.getSelection(): []);
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
