/**
 * Created by Samuel Gratzl on 21.09.2017.
 */
import {IExceptionContext, range} from 'lineupengine/src/logic';
import {IGroupData, IGroupItem, isGroup} from './interfaces';
import {ITableSection} from 'lineupengine/src/table/MultiTableRowRenderer';

const SLOPEGRAPH_WIDTH = 200;

interface ISlope {
  update(path: SVGPathElement): void;
}

class ItemSlope implements ISlope {
  constructor(private readonly left: number, private readonly right: number) {

  }

  update(path: SVGPathElement) {
    path.setAttribute('class', 'lu-slope');
    path.setAttribute('d', `M0,${this.left}L${SLOPEGRAPH_WIDTH},${this.right}`);
  }
}

class GroupSlope implements ISlope {
  constructor(private readonly left: [number, number], private readonly right: [number, number]) {

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

export default class SlopeGraph implements ITableSection {
  readonly node: SVGSVGElement;

  private leftSlopes: ISlope[][] = [];
  private rightSlopes: ISlope[][] = [];
  private readonly pool: SVGPathElement[] = [];

  private scrollListener: () => void;

  readonly width = SLOPEGRAPH_WIDTH;

  private leftContext: IExceptionContext;
  private rightContext: IExceptionContext;

  constructor(private readonly header: HTMLElement, private readonly body: HTMLElement, public readonly id: string) {
    this.node = header.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.node.innerHTML = `<g transform="translate(0,0)"></g>`;
    header.classList.add('lu-slopegraph');
    body.classList.add('lu-slopegraph');
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
      const height = rightContext.exceptionsLookup.get(i) || rightContext.defaultRowHeight;

      if (isGroup(r)) {
        const p = {
          rows: r.rows.map((d) => d.dataIndex),
          start: acc,
          heightPerRow: height / r.rows.length,
          offset: 0,
          ref: i
        };
        r.rows.forEach((ri) => lookup.set(ri.dataIndex, p));
      } else {
        const dataIndex = (<IGroupItem>r).dataIndex;
        lookup.set(dataIndex, {rows: [dataIndex], start: acc, heightPerRow: height, offset: 0, ref: i});
      }
      acc += height;
      return <ISlope[]>[];
    });

    acc = 0;
    this.leftSlopes = left.map((r, i) => {
      const height = leftContext.exceptionsLookup.get(i) || rightContext.defaultRowHeight;
      const slopes = <ISlope[]>[];
      if (isGroup(r)) {
        const free = new Set(r.rows.map((d) => d.dataIndex));
        const heightPerItem = height / r.rows.length;
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
          const intersection = 1 + p.rows.reduce((acc, r) => acc + (free.delete(r) ? 1 : 0), 0);
          const s = intersection === 1 ? new ItemSlope(acc + offset + heightPerItem / 2, p.start + p.offset + p.heightPerRow / 2) : new GroupSlope([acc + offset, acc + offset + heightPerItem * intersection], [p.start + p.offset, p.start + p.offset + p.heightPerRow * intersection]);
          slopes.push(s);
          this.rightSlopes[p.ref].push(s);
          p.offset += intersection * p.heightPerRow;
          offset += intersection * heightPerItem;
        });
      } else {
        const dataIndex = (<IGroupItem>r).dataIndex;
        const p = lookup.get(dataIndex);
        if (p) {
          const s = new ItemSlope(acc + height / 2, p.start + p.offset + p.heightPerRow / 2);
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
    const {first, firstRowPos, last, endPos} = range(scrollTop, clientHeight, this.leftContext.defaultRowHeight, this.leftContext.exceptions, this.leftContext.numberOfRows);

    this.body.style.transform = `translate(0, ${firstRowPos.toFixed(0)}px)`;
    this.body.style.height = `${(endPos - firstRowPos).toFixed(0)}px`;
    (this.node.firstElementChild!).setAttribute('transform', `translate(0,-${firstRowPos.toFixed(0)})`);

    const {first: firstRight, last: lastRight} = range(scrollTop, clientHeight, this.rightContext.defaultRowHeight, this.rightContext.exceptions, this.rightContext.numberOfRows);

    this.choose(first, last, firstRight, lastRight);

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
        g.appendChild(path);
        paths.push(path);
      }
    }

    // update paths
    let i = 0;
    slopes.forEach((s) => s.update(paths[i++]));
  }
}
