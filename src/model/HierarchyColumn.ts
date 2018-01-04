/**
 * Created by Samuel Gratzl on 28.06.2017.
 */
import {schemeCategory10} from 'd3-scale';
import {toolbar} from './annotations';
import CategoricalColumn from './CategoricalColumn';
import Column from './Column';
import {colorPool, ICategoricalColumn, ICategory} from './ICategoricalColumn';
import {IDataRow} from './interfaces';
import {FIRST_IS_NAN, missingGroup} from './missing';
import ValueColumn, {IValueColumnDesc} from './ValueColumn';

export interface ICategoryNode extends ICategory {
  children: Readonly<ICategoryNode>[];
}

interface IPartialCategoryNode extends Partial<ICategory> {
  children: IPartialCategoryNode[];
}

export interface IHierarchyDesc {
  hierarchy: IPartialCategoryNode;
  hierarchySeparator?: string;
}

export declare type IHierarchyColumnDesc = IHierarchyDesc & IValueColumnDesc<string>;

export interface ICategoryInternalNode {
  path: string;
  name: string;
  label: string;
  color: string;
  children: Readonly<ICategoryInternalNode>[];
}

export interface ICutOffNode {
  node: Readonly<ICategoryInternalNode>;
  maxDepth: number;
}

/**
 * column for hierarchical categorical values
 */
@toolbar('cutoff', 'stratify')
export default class HierarchyColumn extends ValueColumn<string> implements ICategoricalColumn {
  static readonly EVENT_CUTOFF_CHANGED = 'cutOffChanged';

  private readonly hierarchySeparator: string;
  readonly hierarchy: Readonly<ICategoryInternalNode>;

  private currentNode: Readonly<ICategoryInternalNode>;
  private currentMaxDepth: number = Infinity;
  private currentLeaves: Readonly<ICategoryInternalNode>[] = [];
  private readonly currentLeavesNameCache = new Map<string, Readonly<ICategoryInternalNode>>();
  private readonly currentLeavesPathCache = new Map<string, Readonly<ICategoryInternalNode>>();

  constructor(id: string, desc: Readonly<IHierarchyColumnDesc>) {
    super(id, desc);
    this.hierarchySeparator = desc.hierarchySeparator || '.';
    this.hierarchy = this.initHierarchy(desc.hierarchy);
    this.currentNode = this.hierarchy;
    this.currentLeaves = computeLeaves(this.currentNode, this.currentMaxDepth);
    this.updateCaches();

    this.setDefaultRenderer('categorical');
  }

  private initHierarchy(root: IPartialCategoryNode) {
    const colors = colorPool();
    const s = this.hierarchySeparator;
    const add = (prefix: string, node: IPartialCategoryNode): ICategoryInternalNode => {
      const name = node.name == null ? String(node.value) : node.name;
      const children = (node.children || []).map((child: IPartialCategoryNode | string): ICategoryInternalNode => {
        if (typeof child === 'string') {
          const path = prefix + child;
          return {
            path,
            name: child,
            label: path,
            color: colors(),
            children: []
          };
        }
        const r = add(`${prefix}${name}${s}`, child);
        if (!r.color) {
          //hack to inject the next color
          (<any>r).color = colors();
        }
        return r;
      });
      const path = prefix + name;
      const label = node.label ? `${node.label}` : path;
      return {path, name, children, label, color: node.color!};
    };
    return add('', root);
  }

  protected createEventList() {
    return super.createEventList().concat([HierarchyColumn.EVENT_CUTOFF_CHANGED]);
  }

  get categories() {
    return this.currentLeaves.map((c) => c.name);
  }

  get categoryLabels() {
    return this.currentLeaves.map((c) => c.label);
  }

  get categoryColors() {
    return this.currentLeaves.map((c) => c.color);
  }

  getCutOff(): ICutOffNode {
    return {
      node: this.currentNode,
      maxDepth: this.currentMaxDepth
    };
  }

  setCutOff(value: ICutOffNode) {
    const maxDepth = value.maxDepth == null ? Infinity: value.maxDepth;
    if (this.currentNode === value.node && this.currentMaxDepth === maxDepth) {
      return;
    }
    const bak = this.getCutOff();
    this.currentNode = value.node;
    this.currentMaxDepth = maxDepth;
    this.currentLeaves = computeLeaves(value.node, maxDepth);
    this.updateCaches();
    this.fire([HierarchyColumn.EVENT_CUTOFF_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], bak, this.getCutOff());
  }

  private resolveCategories(row: IDataRow): ICategoryInternalNode[] {
    const base: string = CategoricalColumn.prototype.getSaveValue.call(this, row);
    if (base == null || base === '') {
      return [];
    }
    return <ICategoryInternalNode[]>base.split(this.separator).map((v) => {
      v = v.trim();
      if (this.currentLeavesNameCache.has(v)) {
        return this.currentLeavesNameCache.get(v);
      }
      if (this.currentLeavesPathCache.has(v)) {
        return this.currentLeavesPathCache.get(v);
      }
      return this.currentLeaves.find((n) => {
        //direct hit or is a child of it
        return n.path === v || n.name === v || v.startsWith(n.path + this.hierarchySeparator);
      });
    }).filter((v) => Boolean(v));
  }

  private resolveCategory(row: IDataRow) {
    const base = this.resolveCategories(row);
    return base.length > 0 ? base[0] : null;
  }

  getValue(row: IDataRow) {
    const base = this.getValues(row);
    return base.length > 0 ? base[0] : null;
  }

  getValues(row: IDataRow) {
    const base = this.resolveCategories(row);
    return base.map((d) => d.name);
  }

  getLabel(row: IDataRow) {
    return this.getLabels(row).join(this.separator);
  }

  getLabels(row: IDataRow) {
    const base = this.resolveCategories(row);
    return base.map((d) => d.label);
  }

  getFirstLabel(row: IDataRow) {
    const l = this.getLabels(row);
    return l.length > 0 ? l[0] : null;
  }

  getCategories(row: IDataRow) {
    return this.getValues(row);
  }

  getColor(row: IDataRow) {
    const base = this.resolveCategory(row);
    return base ? base.color : null;
  }

  compare(a: IDataRow, b: IDataRow) {
    const va = this.resolveCategories(a);
    const vb = this.resolveCategories(b);
    if (va.length === 0) {
      // missing
      return vb.length === 0 ? 0 : FIRST_IS_NAN;
    }
    if (vb.length === 0) {
      return FIRST_IS_NAN * -1;
    }
    //check all categories
    for (let i = 0; i < Math.min(va.length, vb.length); ++i) {
      const ci = va[i].path.localeCompare(vb[i].path);
      if (ci !== 0) {
        return ci;
      }
    }
    //smaller length wins
    return va.length - vb.length;
  }

  group(row: IDataRow) {
    if (this.isMissing(row)) {
      return missingGroup;
    }
    const base = this.resolveCategory(row);
    if (!base) {
      return super.group(row);
    }
    return {name: base.name, color: base.color};
  }

  private updateCaches() {
    this.currentLeavesPathCache.clear();
    this.currentLeavesNameCache.clear();

    this.currentLeaves.forEach((n) => {
      this.currentLeavesPathCache.set(n.path, n);
      this.currentLeavesNameCache.set(n.name, n);
    });
  }
}

function computeLeaves(node: ICategoryInternalNode, maxDepth: number = Infinity) {
  const leaves: ICategoryInternalNode[] = [];
  //depth first
  const visit = (node: ICategoryInternalNode, depth: number) => {
    //hit or end
    if (depth >= maxDepth || node.children.length === 0) {
      leaves.push(node);
    } else {
      // go down
      node.children.forEach((c) => visit(c, depth + 1));
    }
  };
  visit(node, 0);
  return leaves;
}

export function resolveInnerNodes(node: ICategoryInternalNode) {
  //breath first
  const queue: ICategoryInternalNode[] = [node];
  let index = 0;
  while (index < queue.length) {
    const next = queue[index++];
    queue.push(...next.children);
  }
  return queue;
}

export function isHierarchical(categories: (string | ICategory)[]) {
  if (categories.length === 0 || typeof categories[0] === 'string') {
    return false;
  }
  // check if any has a given parent name
  return categories.some((c) => (<any>c).parent != null);
}

export function deriveHierarchy(categories: (ICategory & { parent: string | null })[]) {
  const lookup = new Map<string, ICategoryNode>();
  categories.forEach((c) => {
    const p = c.parent || '';
    // set and fill up proxy
    const item = Object.assign({children: []}, lookup.get(c.name) || {}, c);
    lookup.set(c.name, item);

    if (!lookup.has(p)) {
      // create proxy
      lookup.set(p, {name: p, children: []});
    }
    lookup.get(p)!.children.push(item);
  });
  const root = lookup.get('')!;
  console.assert(root !== undefined, 'hierarchy with no root');
  if (root.children.length === 1) {
    return root.children[0];
  }
  return root;
}
