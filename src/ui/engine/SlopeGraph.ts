/**
 * Created by Samuel Gratzl on 21.09.2017.
 */
import {IExceptionContext, range} from 'lineupengine/src/logic';
import {IGroupData, IGroupItem, IRankingHeaderContextContainer, isGroup} from './interfaces';
import {ITableSection} from 'lineupengine/src/table/MultiTableRowRenderer';

const SLOPEGRAPH_WIDTH = 200;

interface ISlope {
  isSelected(selection: {has(dataIndex: number):boolean}): boolean;

  update(path: SVGPathElement): void;

  readonly dataIndices: number[];
}

class ItemSlope implements ISlope {
  constructor(private readonly left: number, private readonly right: number, public readonly dataIndex: number) {

  }

  get dataIndices() {
    return [this.dataIndex];
  }

  isSelected(selection: {has(dataIndex: number):boolean}) {
    return selection.has(this.dataIndex);
  }

  update(path: SVGPathElement) {
    path.setAttribute('class', 'lu-slope');
    path.setAttribute('d', `M0,${this.left}L${SLOPEGRAPH_WIDTH},${this.right}`);
  }
}

class GroupSlope implements ISlope {
  constructor(private readonly left: [number, number], private readonly right: [number, number], public readonly dataIndices: number[]) {

  }

  isSelected(selection: {has(dataIndex: number):boolean}) {
    return this.dataIndices.some((s) => selection.has(s));
  }

  update(path: SVGPathElement) {
    path.setAttribute('class', 'lu-group-slope');
    path.setAttribute('d', `M0,${this.left[0]}L${SLOPEGRAPH_WIDTH},${this.right[0]}L${SLOPEGRAPH_WIDTH},${this.right[1]}L0,${this.left[1]}Z`);
  }
}

interface IPos {
  start: number;
  heightPerRow: number;
  rows: number[]; // data indices
  offset: number;
  ref: number;
}

export enum EMode {
  ITEM,
  HYBRID,
  BAND
}

export default class SlopeGraph implements ITableSection {
  readonly node: SVGSVGElement;

  private leftSlopes: ISlope[][] = [];
  private rightSlopes: ISlope[][] = [];
  private readonly pool: SVGPathElement[] = [];

  private scrollListener: () => void;

  readonly width = SLOPEGRAPH_WIDTH;

  private leftContext: IExceptionContext;
  private rightContext: IExceptionContext;
  private _mode: EMode = EMode.ITEM;

  constructor(private readonly header: HTMLElement, private readonly body: HTMLElement, public readonly id: string, private readonly ctx: IRankingHeaderContextContainer) {
    this.node = header.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.node.innerHTML = `<g transform="translate(0,0)"></g>`;
    header.classList.add('lu-slopegraph-header');
    this.initHeader(header);
    body.classList.add('lu-slopegraph');
    this.body.style.height = `1px`;
    body.appendChild(this.node);
  }

  init() {
    this.hide(); // hide by default

    const scroller = this.body.parentElement!;

    //sync scrolling of header and body
    let oldTop = scroller.scrollTop;
    this.scrollListener = () => {
      const top = scroller.scrollTop;
      if (oldTop === top) {
        return;
      }
      oldTop = top;
      this.onScrolledVertically(top, scroller.clientHeight);
    };
    scroller.addEventListener('scroll', this.scrollListener);
  }

  private initHeader(header: HTMLElement) {
    header.innerHTML = `<i title="Item" class="active"><span aria-hidden="true">Item</span></i>
        <i title="Hybrid"><span aria-hidden="true">Hybrid</span></i>
        <i title="Band"><span aria-hidden="true">Band</span></i>`;

    const icons = <HTMLElement[]>Array.from(header.children);
    icons.forEach((n: HTMLElement, i) => {
      n.onclick = (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        if (n.classList.contains('active')) {
          return;
        }
        this.mode = i;
        icons.forEach((d, j) => d.classList.toggle('active', j === i));
      }
    });
  }

  get mode() {
    return this._mode;
  }

  set mode(value: EMode) {
    if (value === this._mode) {
      return;
    }
    this._mode = value;
    // TODO change mode
  }


  get hidden() {
    return this.header.classList.contains('loading');
  }

  set hidden(value: boolean) {
    this.header.classList.toggle('loading', value);
    this.body.classList.toggle('loading', value);
  }

  hide() {
    this.hidden = true;
  }

  show() {
    const was = this.hidden;
    this.hidden = false;
    if (was) {
      this.revalidate();
    }
  }

  destroy() {
    this.node.remove();
    this.body.parentElement!.removeEventListener('scroll', this.scrollListener);
  }

  private revalidate() {
    if (!this.leftContext || this.hidden) {
      return;
    }
    const p = this.body.parentElement!;
    this.onScrolledVertically(p.scrollTop, p.clientHeight);
  }

  rebuild(left: (IGroupItem | IGroupData)[], leftContext: IExceptionContext, right: (IGroupItem | IGroupData)[], rightContext: IExceptionContext) {
    this.leftContext = leftContext;
    this.rightContext = rightContext;

    const lookup = new Map<number, IPos>();
    let acc = 0;
    this.rightSlopes = right.map((r, i) => {
      const height = (rightContext.exceptionsLookup.get(i) || rightContext.defaultRowHeight);
      const padded = height - rightContext.padding(i);

      if (isGroup(r)) {
        const p = {
          rows: r.rows.map((d) => d.dataIndex),
          start: acc,
          heightPerRow: padded / r.rows.length,
          offset: 0,
          ref: i
        };
        r.rows.forEach((ri) => lookup.set(ri.dataIndex, p));
      } else {
        const dataIndex = (<IGroupItem>r).dataIndex;
        lookup.set(dataIndex, {rows: [dataIndex], start: acc, heightPerRow: padded, offset: 0, ref: i});
      }
      acc += height;
      return <ISlope[]>[];
    });

    acc = 0;
    this.leftSlopes = left.map((r, i) => {
      const height = (leftContext.exceptionsLookup.get(i) || rightContext.defaultRowHeight);
      const padded = height - rightContext.padding(i);
      const slopes = <ISlope[]>[];
      if (isGroup(r)) {
        const free = new Set(r.rows.map((d) => d.dataIndex));
        const heightPerItem = padded / r.rows.length;
        let offset = 0;
        r.rows.forEach((d) => {
          if (!free.has(d.dataIndex)) {
            return; // already handled
          }
          free.delete(d.dataIndex);
          const p = lookup.get(d.dataIndex);
          if (!p) {
            return; // no matching
          }
          //
          const intersection = p.rows.filter((r) => free.delete(r));
          intersection.push(d.dataIndex); //self
          const common = intersection.length;
          const s =common === 1 ? new ItemSlope(acc + offset + heightPerItem / 2, p.start + p.offset + p.heightPerRow / 2, d.dataIndex) :
            new GroupSlope([acc + offset, acc + offset + heightPerItem * intersection.length], [p.start + p.offset, p.start + p.offset + p.heightPerRow * common], intersection);
          slopes.push(s);
          this.rightSlopes[p.ref].push(s);
          p.offset += common * p.heightPerRow;
          offset += common * heightPerItem;
        });
      } else {
        const dataIndex = (<IGroupItem>r).dataIndex;
        const p = lookup.get(dataIndex);
        if (p) {
          const s = new ItemSlope(acc + padded / 2, p.start + p.offset + p.heightPerRow / 2, dataIndex);
          slopes.push(s);
          this.rightSlopes[p.ref].push(s);
          p.offset += p.heightPerRow; // shift by one item
        }
      }
      acc += height;
      return slopes;
    });

    this.revalidate();
  }

  private onScrolledVertically(scrollTop: number, clientHeight: number) {
    if (!this.leftContext || !this.rightContext) {
      return;
    }
    const left = range(scrollTop, clientHeight, this.leftContext.defaultRowHeight, this.leftContext.exceptions, this.leftContext.numberOfRows);
    const right = range(scrollTop, clientHeight, this.rightContext.defaultRowHeight, this.rightContext.exceptions, this.rightContext.numberOfRows);

    const start = Math.min(left.firstRowPos, right.firstRowPos);
    const end = Math.max(left.endPos, right.endPos);
    this.body.style.transform = `translate(0, ${start.toFixed(0)}px)`;
    this.body.style.height = `${(end - start).toFixed(0)}px`;
    (this.node.firstElementChild!).setAttribute('transform', `translate(0,-${start.toFixed(0)})`);

    this.choose(left.first, left.last, right.first, right.last);
  }

  private choose(leftVisibleFirst: number, leftVisibleLast: number, rightVisibleFirst: number, rightVisibleLast: number) {
    // assume no separate scrolling

    const slopes = new Set<ISlope>();
    for (let i = leftVisibleFirst; i <= leftVisibleLast; ++i) {
      this.leftSlopes[i].forEach((s) => slopes.add(s));
    }
    for (let i = rightVisibleFirst; i <= rightVisibleLast; ++i) {
      this.rightSlopes[i].forEach((s) => slopes.add(s));
    }
    this.render(slopes);
  }

  private render(slopes: Set<ISlope>) {
    const g = this.node.firstElementChild!;
    const paths = <SVGPathElement[]>Array.from(g.children);
    //match lengths
    for (let i = slopes.size; i < paths.length; ++i) {
      const elem = paths[i];
      this.pool.push(elem);
      elem.remove();
    }
    for (let i = paths.length; i < slopes.size; ++i) {
      const elem = this.pool.pop();
      if (elem) {
        g.appendChild(elem);
        paths.push(elem);
      } else {
        const path = g.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.onclick = (evt) => {
          const s: ISlope = (<any>path).__data__;
          const p = this.ctx.provider;
          const ids = s.dataIndices;
          if (evt.ctrlKey) {
            ids.forEach((id) => p.toggleSelection(id, true));
          } else {
            // either unset or set depending on the first state
            const isSelected = p.isSelected(ids[0]!);
            p.setSelection(isSelected ? []: ids);
          }
        };
        g.appendChild(path);
        paths.push(path);
      }
    }

    const p = this.ctx.provider;
    const selectionLookup = {has: (dataIndex: number) => p.isSelected(dataIndex)};
    // update paths
    let i = 0;
    slopes.forEach((s) => {
      const p = paths[i++];
      s.update(p);
      (<any>p).__data__ = s; // data binding
      const selected = s.isSelected(selectionLookup);
      p.classList.toggle('lu-selected', selected);
      if (selected) {
        g.appendChild(p); // to put it on top
      }
    });
  }

  updateSelection(selectedDataIndices: Set<number>) {
    const g = this.node.firstElementChild!;
    const paths = <SVGPathElement[]>Array.from(g.children);

    paths.forEach((p) => {
      const s: ISlope = (<any>p).__data__;
      const selected = s.isSelected(selectedDataIndices);
      p.classList.toggle('lu-selected', selected);
      if (selected) {
        g.appendChild(p); // to put it on top
      }
    });
  }
}
