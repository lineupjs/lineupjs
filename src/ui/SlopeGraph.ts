import {IExceptionContext, ITableSection, range} from 'lineupengine';
import {IGroupData, IGroupItem, IOrderedGroup, isGroup, Ranking} from '../model';
import {aria, cssClass, engineCssClass, SLOPEGRAPH_WIDTH} from '../styles';
import {IRankingHeaderContextContainer, EMode} from './interfaces';
import {forEachIndices, filterIndices} from '../model/internal';

interface ISlope {
  isSelected(selection: {has(dataIndex: number): boolean}): boolean;

  update(path: SVGPathElement, width: number): void;

  readonly dataIndices: number[];
}

class ItemSlope implements ISlope {
  constructor(private readonly left: number, private readonly right: number, public readonly dataIndices: number[]) {

  }

  isSelected(selection: {has(dataIndex: number): boolean}) {
    return this.dataIndices.length === 1 ? selection.has(this.dataIndices[0]) : this.dataIndices.some((s) => selection.has(s));
  }

  update(path: SVGPathElement, width: number) {
    path.setAttribute('data-i', String(this.dataIndices[0]));
    path.setAttribute('class', cssClass('slope'));
    path.setAttribute('d', `M0,${this.left}L${width},${this.right}`);
  }
}

class GroupSlope implements ISlope {
  constructor(private readonly left: [number, number], private readonly right: [number, number], public readonly dataIndices: number[]) {

  }

  isSelected(selection: {has(dataIndex: number): boolean}) {
    return this.dataIndices.some((s) => selection.has(s));
  }

  update(path: SVGPathElement, width: number) {
    path.setAttribute('class', cssClass('group-slope'));
    path.setAttribute('d', `M0,${this.left[0]}L${width},${this.right[0]}L${width},${this.right[1]}L0,${this.left[1]}Z`);
  }
}

interface IPos {
  start: number;
  heightPerRow: number;
  rows: number[]; // data indices
  offset: number;
  ref: number[];
  group: IOrderedGroup;
}

export interface ISlopeGraphOptions {
  mode: EMode;
}

export default class SlopeGraph implements ITableSection {
  readonly node: SVGSVGElement;

  private leftSlopes: ISlope[][] = [];
  // rendered row to one ore multiple slopes
  private rightSlopes: ISlope[][] = [];
  private readonly pool: SVGPathElement[] = [];

  private scrollListener: ((act: {top: number, height: number}) => void) | null = null;

  readonly width = SLOPEGRAPH_WIDTH;
  readonly height = 0;

  private current: {
    leftRanking: Ranking;
    left: (IGroupItem | IGroupData)[];
    leftContext: IExceptionContext;
    rightRanking: Ranking;
    right: (IGroupItem | IGroupData)[];
    rightContext: IExceptionContext;
  } | null = null;

  private chosen = new Set<ISlope>();
  private chosenSelectionOnly = new Set<ISlope>();

  private _mode: EMode = EMode.ITEM;

  constructor(public readonly header: HTMLElement, public readonly body: HTMLElement, public readonly id: string, private readonly ctx: IRankingHeaderContextContainer, options: Partial<ISlopeGraphOptions> = {}) {
    this.node = header.ownerDocument!.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.node.innerHTML = `<g transform="translate(0,0)"></g>`;
    header.classList.add(cssClass('slopegraph-header'));
    this._mode = options.mode === EMode.BAND ? EMode.BAND : EMode.ITEM;
    this.initHeader(header);
    body.classList.add(cssClass('slopegraph'));
    this.body.style.height = `1px`;
    body.appendChild(this.node);
  }

  init() {
    this.hide(); // hide by default

    const scroller = <any>this.body.parentElement!;

    //sync scrolling of header and body
    // use internals from lineup engine
    const scroll = (<any>scroller).__le_scroller__;
    let old: {top: number, height: number} = scroll.asInfo();
    scroll.push('animation', this.scrollListener = (act: {top: number, height: number}) => {
      if (Math.abs(old.top - act.top) < 5) {
        return;
      }
      old = act;
      this.onScrolledVertically(act.top, act.height);
    });
  }

  private initHeader(header: HTMLElement) {
    const active = cssClass('active');
    header.innerHTML = `<i title="Item" class="${this._mode === EMode.ITEM ? active : ''}">${aria('Item')}</i>
        <i title="Band" class="${this._mode === EMode.BAND ? active : ''}">${aria('Band')}</i>`;

    const icons = <HTMLElement[]>Array.from(header.children);
    icons.forEach((n: HTMLElement, i) => {
      n.onclick = (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        if (n.classList.contains(active)) {
          return;
        }
        this.mode = i === 0 ? EMode.ITEM : EMode.BAND;
        icons.forEach((d, j) => d.classList.toggle(active, j === i));
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
      this.rebuild(this.current.leftRanking, this.current.left, this.current.leftContext, this.current.rightRanking, this.current.right, this.current.rightContext);
    }
  }

  get hidden() {
    return this.header.classList.contains(engineCssClass('loading'));
  }

  set hidden(value: boolean) {
    this.header.classList.toggle(engineCssClass('loading'), value);
    this.body.classList.toggle(engineCssClass('loading'), value);
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
    this.header.remove();
    if (this.scrollListener) {
      //sync scrolling of header and body
      // use internals from lineup engine
      const scroll = (<any>this.body.parentElement!).__le_scroller__;
      scroll.remove(this.scrollListener);
    }
    this.body.remove();
  }

  rebuild(leftRanking: Ranking, left: (IGroupItem | IGroupData)[], leftContext: IExceptionContext, rightRanking: Ranking, right: (IGroupItem | IGroupData)[], rightContext: IExceptionContext) {
    this.current = {leftRanking, left, leftContext, right, rightRanking, rightContext};

    const lookup: Map<number, IPos> = this.prepareRightSlopes(right, rightContext);
    this.computeSlopes(left, leftContext, lookup);

    this.revalidate();
  }

  private computeSlopes(left: (IGroupItem | IGroupData)[], leftContext: IExceptionContext, lookup: Map<number, IPos>) {
    const mode = this.mode;
    const fakeGroups = new Map<IOrderedGroup, ISlope[]>();

    const createFakeGroup = (first: number, group: IOrderedGroup) => {
      let count = 0;
      let height = 0;
      // find all items in this group, assuming that they are in order
      for (let i = first; i < left.length; ++i) {
        const item = left[i];
        if (isGroup(item) || (<IGroupItem>item).group !== group) {
          break;
        }
        count++;
        height += (leftContext.exceptionsLookup.get(i) || leftContext.defaultRowHeight);
      }

      const padded = height - leftContext.padding(first + count - 1);

      const gr = group;

      return {gr, padded, height};
    };

    let acc = 0;
    this.leftSlopes = left.map((r, i) => {

      let height = (leftContext.exceptionsLookup.get(i) || leftContext.defaultRowHeight);
      let padded = height - 0; //leftContext.padding(i);
      const slopes = <ISlope[]>[];
      const start = acc;

      // shift by item height
      acc += height;

      let offset = 0;

      const push = (s: ISlope, right: IPos, common = 1, heightPerRow = 0) => {
        // store slope in both
        slopes.push(s);
        forEachIndices(right.ref, (r) => this.rightSlopes[r].push(s));

        // update the offset of myself and of the right side
        right.offset += common * right.heightPerRow;
        offset += common * heightPerRow;
      };

      let gr: IGroupData;

      if (isGroup(r)) {
        gr = r;
      } else {
        const item = (<IGroupItem>r);
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
      const free = new Set(gr.order);

      const heightPerRow = padded / gr.order.length;

      forEachIndices(gr.order, (d: number) => {
        if (!free.has(d)) {
          return; // already handled
        }
        free.delete(d);
        const right = lookup.get(d);
        if (!right) {
          return; // no matching
        }
        // find all of this group
        const intersection = filterIndices(right.rows, (r) => free.delete(r));
        intersection.push(d); //self

        const common = intersection.length;
        let s: ISlope;
        if (common === 1) {
          s = new ItemSlope(start + offset + heightPerRow / 2, right.start + right.offset + right.heightPerRow / 2, [d]);
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

    const fakeGroups = new Map<IOrderedGroup, IPos>();
    let acc = 0;

    this.rightSlopes = right.map((r, i) => {
      const height = (rightContext.exceptionsLookup.get(i) || rightContext.defaultRowHeight);
      const padded = height - 0; //rightContext.padding(i);
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
          rows: Array.from(r.order),
          heightPerRow: padded / r.order.length,
          group: r
        });

        forEachIndices(r.order, (ri) => lookup.set(ri, p));
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


  highlight(dataIndex: number) {
    const highlight = engineCssClass('highlighted');
    const old = this.body.querySelector(`[data-i].${highlight}`);
    if (old) {
      old.classList.remove(highlight);
    }
    if (dataIndex < 0) {
      return;
    }
    const item = this.body.querySelector(`[data-i="${dataIndex}"]`);
    if (item) {
      item.classList.add(highlight);
    }
    return item != null;
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

    this.chosen = this.choose(left.first, left.last, right.first, right.last);
    this.render(this.chosen, this.chooseSelection(left.first, left.last, this.chosen));
  }

  private choose(leftVisibleFirst: number, leftVisibleLast: number, rightVisibleFirst: number, rightVisibleLast: number) {
    // assume no separate scrolling

    const slopes = new Set<ISlope>();
    for (let i = leftVisibleFirst; i <= leftVisibleLast; ++i) {
      for (const s of this.leftSlopes[i]) {
        slopes.add(s);
      }
    }
    for (let i = rightVisibleFirst; i <= rightVisibleLast; ++i) {
      for (const s of this.rightSlopes[i]) {
        slopes.add(s);
      }
    }
    return slopes;
  }

  private chooseSelection(leftVisibleFirst: number, leftVisibleLast: number, alreadyVisible: Set<ISlope>) {
    const slopes = new Set<ISlope>();
    // ensure selected slopes are always part of
    const p = this.ctx.provider;

    if (p.getSelection().length === 0) {
      return slopes;
    }

    const selectionLookup = {has: (dataIndex: number) => p.isSelected(dataIndex)};

    // try all not visible ones
    for (let i = 0; i < leftVisibleFirst; ++i) {
      for (const s of this.leftSlopes[i]) {
        if (s.isSelected(selectionLookup) && !alreadyVisible.has(s)) {
          slopes.add(s);
        }
      }
    }
    for (let i = leftVisibleLast + 1; i < this.leftSlopes.length; ++i) {
      for (const s of this.leftSlopes[i]) {
        if (s.isSelected(selectionLookup) && !alreadyVisible.has(s)) {
          slopes.add(s);
        }
      }
    }
    return slopes;
  }

  private updatePath(p: SVGPathElement, g: SVGGElement, s: ISlope, width: number, selection: {has(dataIndex: number): boolean}) {
    s.update(p, width);
    (<any>p).__data__ = s; // data binding
    const selected = s.isSelected(selection);
    p.classList.toggle(cssClass('selected'), selected);
    if (selected) {
      g.appendChild(p); // to put it on top
    }
  }

  private render(visible: Set<ISlope>, selectionSlopes: Set<ISlope>) {
    const g = <SVGGElement>this.node.firstElementChild!;
    const width = g.ownerSVGElement!.getBoundingClientRect()!.width;
    const paths = this.matchLength(visible.size + selectionSlopes.size, g);

    const p = this.ctx.provider;
    const selectionLookup = {has: (dataIndex: number) => p.isSelected(dataIndex)};

    // update paths
    let i = 0;
    const updatePath = (s: ISlope) => {
      this.updatePath(paths[i++], g, s, width, selectionLookup);
    };

    visible.forEach(updatePath);
    selectionSlopes.forEach(updatePath);
  }

  private addPath(g: SVGGElement) {
    const elem = this.pool.pop();
    if (elem) {
      g.appendChild(elem);
      return elem;
    }

    const path = g.ownerDocument!.createElementNS('http://www.w3.org/2000/svg', 'path');
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
    return path;
  }

  private matchLength(slopes: number, g: SVGGElement) {
    const paths = <SVGPathElement[]>Array.from(g.children);
    for (let i = slopes; i < paths.length; ++i) {
      const elem = paths[i];
      this.pool.push(elem);
      elem.remove();
    }

    for (let i = paths.length; i < slopes; ++i) {
      paths.push(this.addPath(g));
    }
    return paths;
  }

  updateSelection(selectedDataIndices: Set<number>) {
    const g = <SVGGElement>this.node.firstElementChild!;
    const paths = <SVGPathElement[]>Array.from(g.children);

    const openDataIndices = new Set(selectedDataIndices);

    if (selectedDataIndices.size === 0) {
      // clear
      for (const p of paths) {
        const s: ISlope = (<any>p).__data__;
        p.classList.toggle(cssClass('selected'), false);
        if (this.chosenSelectionOnly.has(s)) {
          p.remove();
        }
      }
      this.chosenSelectionOnly.clear();
      return;
    }

    for (const p of paths) {
      const s: ISlope = (<any>p).__data__;
      const selected = s.isSelected(selectedDataIndices);
      p.classList.toggle(cssClass('selected'), selected);
      if (!selected) {
        if (this.chosenSelectionOnly.delete(s)) {
          // was only needed because of the selection
          p.remove();
        }
        continue;
      }

      g.appendChild(p); // to put it on top
      // remove already handled
      s.dataIndices.forEach((d) => openDataIndices.delete(d));
    }

    if (openDataIndices.size === 0) {
      return;
    }

    // find and add missing slopes
    const width = g.ownerSVGElement!.getBoundingClientRect()!.width;
    for (const ss of this.leftSlopes) {
      for (const s of ss) {
        if (this.chosen.has(s) || this.chosenSelectionOnly.has(s) || !s.isSelected(openDataIndices)) {
          // not visible or not selected -> skip
          continue;
        }
        // create new path for it
        this.chosenSelectionOnly.add(s);
        const p = this.addPath(g);
        this.updatePath(p, g, s, width, openDataIndices);
      }
    }
  }
}
