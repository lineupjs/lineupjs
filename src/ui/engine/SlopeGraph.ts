/**
 * Created by Samuel Gratzl on 21.09.2017.
 */
import {IExceptionContext} from 'lineupengine/src/logic';
import {IGroupData, IGroupItem, isGroup} from './interfaces';
import {IDataRow} from '../../provider/ADataProvider';
import {ITableSection} from 'lineupengine/src/table/MultiTableRowRenderer';

interface ISlope {
  update(path: SVGPathElement): void;
}

class ItemSlope implements ISlope {
  constructor(private readonly left: number, private readonly right: number) {

  }

  update(path: SVGPathElement) {
    path.className = 'lu-slope';
    path.setAttribute('d', `M0,${this.left}L100%,${this.right}`);
  }
}

class GroupSlope implements ISlope {
  constructor(private readonly left: [number, number], private readonly right: [number, number]) {

  }

  update(path: SVGPathElement) {
    path.className = 'lu-group-slope';
    path.setAttribute('d', `M0,${this.left[0]}L100%,${this.right[0]}L100%,${this.right[1]}L0,${this.left[1]}Z`);
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

  private readonly index2slope: number[];
  private readonly slopes: ISlope[];
  private readonly pool: SVGPathElement[] = [];

  readonly width = 200;

  constructor(header: HTMLElement, body: HTMLElement) {
    this.node = header.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.node.innerHTML = `<g transform="translate(0,0)"></g>`;
    header.classList.add('lu-slopegraph');
    body.classList.add('lu-slopegraph');
    body.appendChild(this.node);
  }

  init() {
    // dummy
  }


  get hidden() {
    return this.node.classList.contains('loading');
  }

  set hidden(value: boolean) {
    this.node.classList.toggle('loading', value);
  }

  hide() {
    this.hidden = true;
  }

  show() {
    this.hidden = false;
  }

  destroy() {
    this.node.remove();
  }

  rebuild(left: (IGroupItem | IGroupData)[], leftContext: IExceptionContext, right: (IGroupItem | IGroupData)[], rightContext: IExceptionContext) {
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
