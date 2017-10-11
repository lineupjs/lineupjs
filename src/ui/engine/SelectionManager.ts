/**
 * Created by Samuel Gratzl on 11.10.2017.
 */
import {IDataProvider} from '../../provider/ADataProvider';
import {AEventDispatcher} from '../../utils';

interface IPoint {
  x: number;
  y: number;
}

export default class SelectionManager extends AEventDispatcher {
  static readonly EVENT_SELECT_RANGE = 'selectRange';
  private static readonly MIN_DISTANCE = 10;

  private readonly hr: HTMLHRElement;

  private start: IPoint|null = null;
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
      this.start = {x: evt.x, y: evt.y};
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

  private showHint(start: IPoint, end: IPoint) {
    this.start = start;

    const sy = start.y;
    const ey = end.y;

    const visible = Math.abs(sy - ey) > SelectionManager.MIN_DISTANCE;
    this.body.classList.toggle('lu-selection-active', visible);
    this.hr.classList.toggle('lu-selection-active', visible);
    this.hr.style.transform = `translate(${start.x}px,${sy}px)scale(1,${Math.abs(ey - sy)})rotate(${ey>sy ? 90 : -90}deg)`;
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

  updateState(node: HTMLElement, dataIndex: number) {
    if (this.ctx.provider.isSelected(dataIndex)) {
      node.classList.add('lu-selected');
    } else {
      node.classList.remove('lu-selected');
    }
  }
}
