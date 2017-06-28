/**
 * Created by Samuel Gratzl on 28.06.2017.
 */
import {scale} from 'd3';
import Column from './Column';
import ValueColumn, {IValueColumnDesc} from './ValueColumn';
import StringColumn from './StringColumn';
import {ICategoricalColumn, ICategory} from './CategoricalColumn';

export interface ICategoryNode extends ICategory {
  readonly children: ICategoryNode[];
}

export interface IHierarchyDesc extends IValueColumnDesc<string> {
  readonly hierarchy: ICategoryNode;
  readonly hiearchySeparator?: string;
}

export interface ICategoryInternalNode {
  readonly path: string;
  readonly name: string;
  readonly label: string;
  readonly color: string;
  readonly children: ICategoryInternalNode[];
}

/**
 * column for hierarchical categorical values
 */
export default class HierarchyColumn extends ValueColumn<string> implements ICategoricalColumn {
  static readonly EVENT_CUTOFF_CHANGED = 'cutOffChanged';

  private readonly hierarchySeparator: string;
  readonly hierarchy: ICategoryInternalNode;

  private currentNode: ICategoryInternalNode;
  private currentMaxDepth: number = Infinity;
  private currentLeaves: ICategoryInternalNode[] = [];

  constructor(id: string, desc: IHierarchyDesc) {
    super(id, desc);
    this.hierarchySeparator = desc.hiearchySeparator || '.';
    this.hierarchy = this.initHierarchy(desc.hierarchy);
    this.currentNode = this.hierarchy;
    this.currentLeaves = computeLeaves(this.currentNode, this.currentMaxDepth);

    this.setRendererType('categorical');
    this.setRendererList([
      {type: 'categorical', label: 'Default'}
    ]);
  }

  initHierarchy(root: ICategoryNode) {
    const colors = scale.category10().range().slice();
    const s = this.hierarchySeparator;
    const add = (prefix: string, node: ICategoryNode): ICategoryInternalNode => {
      const name = node.name || node.value;
      let lastColorUsed = -1;
      const children = (node.children || []).map((child: ICategoryNode|string): ICategoryInternalNode => {
        if (typeof child === 'string') {
          const path = prefix + child;
          return {
            path,
            name: child,
            label: path,
            color: colors[(lastColorUsed++) % colors.length],
            children: []
          };
        }
        const r = add(`${prefix}${name}${s}`, child);
        if (!r.color) {
          //hack to inject the next color
          (<any>r).color = colors[(lastColorUsed++) % colors.length];
        }
        return r;
      });
      const path = prefix + name;
      const label = node.label ? `${path}: ${node.label}` : path;
      return {path, name, children, label, color: node.color};
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

  getCutOff() {
    return {
      node: this.currentNode,
      maxDepth: this.currentMaxDepth
    }
  }

  setCutOff(node: ICategoryInternalNode, maxDepth: number = Infinity) {
    if (this.currentNode === node && this.currentMaxDepth === maxDepth) {
      return;
    }
    const bak = this.getCutOff();
    this.currentNode = node;
    this.currentMaxDepth = maxDepth;
    this.currentLeaves = computeLeaves(node, maxDepth);
    this.fire([HierarchyColumn.EVENT_CUTOFF_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], bak, this.getCutOff());
  }

  private resolveCategory(row: any, index: number) {
    const base = StringColumn.prototype.getValue.call(this, row, index);
    if (base === null) {
      return null;
    }
    const node = this.currentLeaves.find((n) => {
      //direct hit or is a child of it
      return n.path === base || base.startsWith(n.path + this.hierarchySeparator);
    });
    //unify to null
    return node || null;
  }

  getValue(row: any, index: number) {
    const base = this.resolveCategory(row, index);
    return base ? base.name : null;
  }

  getLabel(row: any, index: number) {
    const base = this.resolveCategory(row, index);
    return base ? base.label : null;
  }

  getCategories(row: any, index: number) {
    const v = this.getValue(row, index);
    return v === null ? [] : [v];
  }

  getColor(row: any, index: number) {
    const base = this.resolveCategory(row, index);
    return base ? base.color : null;
  }

  compare(a: any, b: any, aIndex: number, bIndex: number) {
    const va = this.resolveCategory(a, aIndex);
    const vb = this.resolveCategory(b, bIndex);
    if (va === vb) {
      return 0;
    }
    if (va === null) {
      return +1;
    }
    if (vb === null) {
      return -1;
    }
    return va.path.localeCompare(vb.path);
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
  for(let index = 0; index < queue.length; ++index) {
    const next = queue[index];
    queue.push(...next.children);
  }
  return queue;
}
