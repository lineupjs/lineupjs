/**
 * Created by Samuel Gratzl on 21.09.2017.
 */
import {IExceptionContext, range} from 'lineupengine/src/logic';
import {IGroupData, IGroupItem, isGroup} from './interfaces';
import {IDataRow} from '../../provider/ADataProvider';
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
  rows: IDataRow[];
  offset: number;
}

export default class SlopeGraph implements ITableSection {
  readonly node: SVGSVGElement;

  private readonly index2slope: number[] = [];
  private readonly slopes: ISlope[] = [];
  private readonly pool: SVGPathElement[] = [];

  private scrollListener: () => void;

  readonly width = SLOPEGRAPH_WIDTH;

  private leftContext: IExceptionContext;

  constructor(private readonly header: HTMLElement, private readonly body: HTMLElement, public readonly id: string) {
    this.node = header.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.node.setAttribute('width', String(this.width));
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
    this.index2slope.splice(0, this.index2slope.length);
    this.slopes.splice(0, this.slopes.length);

    const lookup = new Map<number, IPos>();
    let acc = 0;
    right.forEach((r, i) => {
      const height = rightContext.exceptionsLookup.get(i) || rightContext.defaultRowHeight;

      if (isGroup(r)) {
        const p = {rows: r.rows.slice(), start: acc, heightPerRow: height / r.rows.length, offset: 0};
        r.rows.forEach((ri) => lookup.set(ri.dataIndex, p));
      } else {
        const dataIndex = (<IGroupItem>r).dataIndex;
        lookup.set(dataIndex, {rows: [<IGroupItem>r], start: acc, heightPerRow: height, offset: 0});
      }
      acc += height;
    });

    acc = 0;
    left.forEach((r, i) => {
      const height = leftContext.exceptionsLookup.get(i) || rightContext.defaultRowHeight;
      this.index2slope.push(this.slopes.length);
      if (isGroup(r)) {
        const free = new Set(r.rows);
        const heightPerItem = height / r.rows.length;
        let offset = 0;
        r.rows.forEach((d) => {
          if (!free.has(d)) {
            return; // already handled
          }
          free.delete(d);
          const p = lookup.get(d.dataIndex);
          if (!p) {
            return; // no matching
          }
          //
          const intersection = 1 + p.rows.reduce((acc, r) => acc + (free.delete(r) ? 1 : 0), 0);
          if (intersection === 1) {
            this.slopes.push(new ItemSlope(acc + offset + heightPerItem / 2, p.start + p.offset + p.heightPerRow / 2));
          } else {
            this.slopes.push(new GroupSlope([acc + offset, acc + offset + heightPerItem * intersection], [p.start + p.offset, p.start + p.offset + p.heightPerRow * intersection]));
          }
          p.offset += intersection * p.heightPerRow;
          offset += intersection * heightPerItem;
        });
      } else {
        const dataIndex = (<IGroupItem>r).dataIndex;
        const p = lookup.get(dataIndex);
        if (p) {
          this.slopes.push(new ItemSlope(acc + height / 2, p.start + p.offset + p.heightPerRow / 2));
          p.offset += p.heightPerRow; // shift by one item
        }
      }
      acc += height;
    });

    this.revalidate();
  }

  private onScrolledVertically(scrollTop: number, clientHeight: number) {
    const {first, last} = range(scrollTop, clientHeight, this.leftContext.defaultRowHeight, this.leftContext.exceptions, this.leftContext.numberOfRows);

    this.node.setAttribute('height', clientHeight.toString());
    (this.node.firstElementChild!).setAttribute('transform', `translate(0,-${scrollTop})`);
    this.render(first, last);
  }

  render(leftVisibleFirst: number, leftVisibleLast: number) {
    // assume no separate scrolling
    const start = this.index2slope[leftVisibleFirst];
    const end = this.index2slope[leftVisibleLast];

    const slopes = this.slopes.slice(start, end + 1);
    const g = this.node.firstElementChild!;
    const paths = <SVGPathElement[]>Array.from(g.children);
    //match lengths
    for (let i = slopes.length; i < paths.length; ++i) {
      const elem = paths[i];
      this.pool.push(elem);
      elem.remove();
    }
    for (let i = paths.length; i < slopes.length; ++i) {
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
    slopes.forEach((s, i) => s.update(paths[i]));
  }
}
