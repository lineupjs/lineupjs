/**
 * Created by Samuel Gratzl on 21.09.2017.
 */
import {IExceptionContext, range} from 'lineupengine/src/logic';
import {IGroupData, IGroupItem, IRankingHeaderContextContainer, isGroup} from './interfaces';
import {ITableSection} from 'lineupengine/src/table/MultiTableRowRenderer';
import {IGroup} from '../../model/Group';
import {IDataRow} from '../../provider/ADataProvider';

interface ISlope {
  isSelected(selection: {has(dataIndex: number):boolean}): boolean;

  update(path: SVGPathElement, width: number): void;

  readonly dataIndices: number[];
}

class ItemSlope implements ISlope {
  constructor(private readonly left: number, private readonly right: number, public readonly dataIndices: number[]) {

  }

  isSelected(selection: {has(dataIndex: number):boolean}) {
    return this.dataIndices.length === 1 ? selection.has(this.dataIndices[0]) : this.dataIndices.some((s) => selection.has(s));
  }

  update(path: SVGPathElement, width: number) {
    path.setAttribute('class', 'lu-slope');
    path.setAttribute('d', `M0,${this.left}L${width},${this.right}`);
  }
}

class GroupSlope implements ISlope {
  constructor(private readonly left: [number, number], private readonly right: [number, number], public readonly dataIndices: number[]) {

  }

  isSelected(selection: {has(dataIndex: number):boolean}) {
    return this.dataIndices.some((s) => selection.has(s));
  }

  update(path: SVGPathElement, width: number) {
    path.setAttribute('class', 'lu-group-slope');
    path.setAttribute('d', `M0,${this.left[0]}L${width},${this.right[0]}L${width},${this.right[1]}L0,${this.left[1]}Z`);
  }
}

interface IPos {
  start: number;
  heightPerRow: number;
  rows: number[]; // data indices
  offset: number;
  ref: number[];
  group: IGroup;
}

export enum EMode {
  ITEM,
  BAND
}

export default class SlopeGraph implements ITableSection {
  readonly node: SVGSVGElement;

  private leftSlopes: ISlope[][] = [];
  // rendered row to one ore multiple slopes
  private rightSlopes: ISlope[][] = [];
  private readonly pool: SVGPathElement[] = [];

  private scrollListener: () => void;

  readonly width = 200;

  private current: {
    left: (IGroupItem | IGroupData)[];
    leftContext: IExceptionContext;
    right: (IGroupItem | IGroupData)[];
    rightContext: IExceptionContext;
  };
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
      };
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
    if (this.current) {
      this.rebuild(this.current.left, this.current.leftContext, this.current.right, this.current.rightContext);
    }
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

  rebuild(left: (IGroupItem | IGroupData)[], leftContext: IExceptionContext, right: (IGroupItem | IGroupData)[], rightContext: IExceptionContext) {
    this.current = {left, leftContext, right, rightContext};

    const lookup: Map<number, IPos> = this.prepareRightSlopes(right, rightContext);
    this.computeSlopes(left, leftContext, lookup);

    this.revalidate();
  }

  private computeSlopes(left: (IGroupItem | IGroupData)[], leftContext: IExceptionContext, lookup: Map<number, IPos>) {
    const mode = this.mode;
    const fakeGroups = new Map<IGroup, ISlope[]>();

    const createFakeGroup = (first: number, group: IGroup) => {
      let count = 0;
      let height = 0;
      const rows: IDataRow[] = [];
      // find all items in this group, assuming that they are in order
      for(let i = first; i < left.length; ++i) {
        const item = left[i];
        if (isGroup(item) || (<IGroupItem>item).group !== group) {
          break;
        }
        count++;
        height += (leftContext.exceptionsLookup.get(i) || leftContext.defaultRowHeight);
        rows.push(item);
      }

      const padded = height - leftContext.padding(first + count - 1);

      const gr = <IGroupData>Object.assign({
        rows
      }, group);

      return {gr, padded, height};
    };

    let acc = 0;
    this.leftSlopes = left.map((r, i) => {

      let height = (leftContext.exceptionsLookup.get(i) || leftContext.defaultRowHeight);
      let padded = height - leftContext.padding(i);
      const slopes = <ISlope[]>[];
      const start = acc;

      // shift by item height
      acc += height;

      let offset = 0;

      const push = (s: ISlope, right: IPos, common = 1, heightPerRow = 0) => {
        // store slope in both
        slopes.push(s);
        right.ref.forEach((r) => this.rightSlopes[r].push(s));

        // update the offset of myself and of the right side
        right.offset += common * right.heightPerRow;
        offset += common * heightPerRow;
      };

      let gr: IGroupData;

      if (isGroup(r)) {
        gr = r;
      } else {
        const item =  (<IGroupItem>r);
        const dataIndex = item.dataIndex;
        const right = lookup.get(dataIndex);

        if (!right) { // no match
          return slopes;
        }
        if (mode === EMode.ITEM) {
          const s = new ItemSlope(start + padded / 2, right.start + right.offset + right.heightPerRow / 2, [dataIndex]);
          push(s, right);
          return slopes;
        }

        if (fakeGroups.has(item.group)) {
          // already handled by the first one, take the fake slopes
          return fakeGroups.get(item.group)!;
        }

        const fakeGroup = createFakeGroup(i, item.group);
        gr = fakeGroup.gr;
        height = fakeGroup.height;
        padded = fakeGroup.padded;
        fakeGroups.set(item.group, slopes);
      }

      // free group items to share
      const free = new Set(gr.rows.map((d) => d.dataIndex));

      const heightPerRow = padded / gr.rows.length;

      gr.rows.forEach((d) => {
        if (!free.has(d.dataIndex)) {
          return; // already handled
        }
        free.delete(d.dataIndex);
        const right = lookup.get(d.dataIndex);
        if (!right) {
          return; // no matching
        }
        // find all of this group
        const intersection = right.rows.filter((r) => free.delete(r));
        intersection.push(d.dataIndex); //self

        const common = intersection.length;
        let s: ISlope;
        if (common === 1) {
          s = new ItemSlope(start + offset + heightPerRow / 2, right.start + right.offset + right.heightPerRow / 2, [d.dataIndex]);
        } else if (mode === EMode.ITEM) {
          // fake item
          s = new ItemSlope(start + offset + heightPerRow * common / 2, right.start + right.offset + right.heightPerRow * common / 2, intersection);
        } else {
          s = new GroupSlope([start + offset, start + offset + heightPerRow * common], [right.start + right.offset, right.start + right.offset + right.heightPerRow * common], intersection);
        }
        push(s, right, common, heightPerRow);
      });
      return slopes;
    });
  }

  private prepareRightSlopes(right: (IGroupItem | IGroupData)[], rightContext: IExceptionContext) {
    const lookup = new Map<number, IPos>();
    const mode = this.mode;

    const fakeGroups = new Map<IGroup, IPos>();
    let acc = 0;

    this.rightSlopes = right.map((r, i) => {
      const height = (rightContext.exceptionsLookup.get(i) || rightContext.defaultRowHeight);
      const padded = height - rightContext.padding(i);
      const start = acc;
      acc += height;
      const slopes = <ISlope[]>[];

      const base = {
        start,
        offset: 0,
        ref: [i]
      };
      if (isGroup(r)) {
        const p = Object.assign(base, {
          rows: r.rows.map((d) => d.dataIndex),
          heightPerRow: padded / r.rows.length,
          group: r
        });

        r.rows.forEach((ri) => lookup.set(ri.dataIndex, p));
        return slopes;
      }
      // item
      const item = (<IGroupItem>r);
      const dataIndex = r.dataIndex;

      let p = Object.assign(base, {
        rows: [dataIndex],
        heightPerRow: padded,
        group: item.group
      });

      if (mode === EMode.ITEM) {
        lookup.set(dataIndex, p);
        return slopes;
      }
      // forced band mode
      // merge with the 'ueber' band
      if (!fakeGroups.has(item.group)) {
        p.heightPerRow = height; // include padding
        // TODO just support uniform item height
        fakeGroups.set(item.group, p);
      } else { // reuse old
        p = fakeGroups.get(item.group)!;
        p.rows.push(dataIndex);
        p.ref.push(i);
      }
      lookup.set(dataIndex, p);
      return slopes;
    });

    return lookup;
  }

  private revalidate() {
    if (!this.current || this.hidden) {
      return;
    }
    const p = this.body.parentElement!;
    this.onScrolledVertically(p.scrollTop, p.clientHeight);
  }

  private onScrolledVertically(scrollTop: number, clientHeight: number) {
    if (!this.current) {
      return;
    }

    // which lines are currently shown
    const {leftContext, rightContext} = this.current;
    const left = range(scrollTop, clientHeight, leftContext.defaultRowHeight, leftContext.exceptions, leftContext.numberOfRows);
    const right = range(scrollTop, clientHeight, rightContext.defaultRowHeight, rightContext.exceptions, rightContext.numberOfRows);

    const start = Math.min(left.firstRowPos, right.firstRowPos);
    const end = Math.max(left.endPos, right.endPos);

    // move to right position
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
    const g = <SVGGElement>this.node.firstElementChild!;
    const width = g.ownerSVGElement!.clientWidth;
    const paths = this.matchLength(slopes, g);

    const p = this.ctx.provider;
    const selectionLookup = {has: (dataIndex: number) => p.isSelected(dataIndex)};

    // update paths
    let i = 0;
    slopes.forEach((s) => {
      const p = paths[i++]; // since a set
      s.update(p, width);
      (<any>p).__data__ = s; // data binding
      const selected = s.isSelected(selectionLookup);
      p.classList.toggle('lu-selected', selected);
      if (selected) {
        g.appendChild(p); // to put it on top
      }
    });
  }

  private matchLength(slopes: Set<ISlope>, g: SVGGElement) {
    const paths = <SVGPathElement[]>Array.from(g.children);
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
          // d3 style
          const s: ISlope = (<any>path).__data__;
          const p = this.ctx.provider;
          const ids = s.dataIndices;
          if (evt.ctrlKey) {
            ids.forEach((id) => p.toggleSelection(id, true));
          } else {
            // either unset or set depending on the first state
            const isSelected = p.isSelected(ids[0]!);
            p.setSelection(isSelected ? [] : ids);
          }
        };
        g.appendChild(path);
        paths.push(path);
      }
    }
    return paths;
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
