import {
  Column,
  CompositeColumn,
  Ranking,
  ReduceColumn,
  StackColumn,
  createAggregateDesc,
  createGroupDesc,
  createImpositionBoxPlotDesc,
  createImpositionDesc,
  createImpositionsDesc,
  createNestedDesc,
  createRankDesc,
  createReduceDesc,
  createScriptDesc,
  createSelectionDesc,
  createStackDesc,
  EAdvancedSortMethod,
  type IColumnDesc,
  type ISortCriteria,
} from '../model';
import type { DataProvider } from '../provider';

export interface IImposeColumnBuilder {
  type: 'impose';
  column: string;
  label?: string;
  colorColumn: string;
}

export interface INestedBuilder {
  type: 'nested';
  label?: string;
  columns: string[];
}

export interface IWeightedSumBuilder {
  type: 'weightedSum';
  columns: string[];
  label?: string;
  weights: number[];
}

export interface IReduceBuilder {
  type: 'min' | 'max' | 'mean' | 'median';
  columns: string[];
  label?: string;
}

export interface IScriptedBuilder {
  type: 'script';
  code: string;
  columns: string[];
  label?: string;
}

/**
 * builder for a ranking
 */
export class RankingBuilder {
  private static readonly ALL_MAGIC_FLAG = '*';

  private readonly columns: (
    | string
    | { desc: IColumnDesc | ((data: DataProvider) => IColumnDesc); columns: string[]; post?: (col: Column) => void }
  )[] = [];
  private readonly sort: { column: string; asc: boolean }[] = [];
  private readonly groupSort: { column: string; asc: boolean }[] = [];
  private readonly groups: string[] = [];

  /**
   * specify another sorting criteria
   * @param {string} column the column name optionally with encoded sorting separated by colon, e.g. a:desc
   * @param {boolean | "asc" | "desc"} asc ascending or descending order
   */
  sortBy(column: string, asc: boolean | 'asc' | 'desc' = true) {
    if (column.includes(':')) {
      // encoded sorting order
      const index = column.indexOf(':');
      asc = column.slice(index + 1) as 'asc' | 'desc';
      column = column.slice(0, index);
    }
    this.sort.push({ column, asc: asc === true || String(asc)[0] === 'a' });
    return this;
  }

  /**
   * specify grouping criteria
   * @returns {this}
   */
  groupBy(...columns: (string | string[])[]) {
    for (const col of columns) {
      if (Array.isArray(col)) {
        this.groups.push(...col);
      } else {
        this.groups.push(col);
      }
    }
    return this;
  }

  /**
   * specify another grouping sorting criteria
   * @param {string} column the column name optionally with encoded sorting separated by colon, e.g. a:desc
   * @param {boolean | "asc" | "desc"} asc ascending or descending order
   */
  groupSortBy(column: string, asc: boolean | 'asc' | 'desc' = true) {
    if (column.includes(':')) {
      // encoded sorting order
      const index = column.indexOf(':');
      asc = column.slice(index + 1) as 'asc' | 'desc';
      column = column.slice(0, index);
    }
    this.groupSort.push({ column, asc: asc === true || String(asc)[0] === 'a' });
    return this;
  }

  /**
   * add another column to this ranking, identified by column name or label. magic names are used for special columns:
   * <ul>
   *     <li>'*' = all columns</li>
   *     <li>'_*' = all support columns</li>
   *     <li>'_aggregate' = aggregate column</li>
   *     <li>'_selection' = selection column</li>
   *     <li>'_group' = group column</li>
   *     <li>'_rank' = rank column</li>
   * </ul>
   * In addition build objects for combined columns are supported.
   * @param {string | IImposeColumnBuilder | INestedBuilder | IWeightedSumBuilder | IReduceBuilder | IScriptedBuilder} column
   */
  column(
    column: string | IImposeColumnBuilder | INestedBuilder | IWeightedSumBuilder | IReduceBuilder | IScriptedBuilder
  ) {
    if (typeof column === 'string') {
      switch (column) {
        case '_aggregate':
          return this.aggregate();
        case '_selection':
          return this.selection();
        case '_group':
          return this.group();
        case '_rank':
          return this.rank();
        case '_*':
          return this.supportTypes();
        case '*':
          return this.allColumns();
      }
      this.columns.push(column);
      return this;
    }
    const label = column.label || null;
    // builder ish
    switch (column.type) {
      case 'impose':
        return this.impose(label, column.column, column.colorColumn);
      case 'min':
      case 'max':
      case 'median':
      case 'mean':
        console.assert(column.columns.length >= 2);
        return this.reduce(label, column.type as any, column.columns[0], column.columns[1], ...column.columns.slice(2));
      case 'nested':
        console.assert(column.columns.length >= 1);
        return this.nested(label, column.columns[0], ...column.columns.slice(1));
      case 'script':
        return this.scripted(label, column.code, ...column.columns);
      case 'weightedSum': {
        console.assert(column.columns.length >= 2);
        console.assert(column.columns.length === column.weights.length);
        const mixed: (string | number)[] = [];
        column.columns.slice(2).forEach((c, i) => {
          mixed.push(c);
          mixed.push(column.weights[i + 2]);
        });
        return this.weightedSum(
          label,
          column.columns[0],
          column.weights[0],
          column.columns[1],
          column.weights[1],
          ...mixed
        );
      }
    }
  }

  /**
   * add an imposed column (numerical column colored by categorical column) to this ranking
   * @param {string | null} label optional label
   * @param {string} numberColumn numerical column reference
   * @param {string} colorColumn categorical column reference
   */
  impose(label: string | null, numberColumn: string, colorColumn: string) {
    this.columns.push({
      desc: (data) => {
        const base = data.getColumns().find((d) => d.label === numberColumn || (d as any).column === numberColumn);
        switch (base ? base.type : '') {
          case 'boxplot':
            return createImpositionBoxPlotDesc(label ? label : undefined);
          case 'numbers':
            return createImpositionsDesc(label ? label : undefined);
          default:
            return createImpositionDesc(label ? label : undefined);
        }
      },
      columns: [numberColumn, colorColumn],
    });
    return this;
  }

  /**
   * add a nested / group composite column
   * @param {string | null} label optional label
   * @param {string} column first element of the group enforcing not empty ones
   * @param {string} columns additional columns
   */
  nested(label: string | null, column: string, ...columns: string[]) {
    this.columns.push({
      desc: createNestedDesc(label ? label : undefined),
      columns: [column].concat(columns),
    });
    return this;
  }

  /**
   * @param {IColumnDesc} desc the composite column description
   * @param {string} columns additional columns to add as children
   */
  composite(desc: IColumnDesc, ...columns: string[]) {
    this.columns.push({
      desc,
      columns,
    });
    return this;
  }

  /**
   * add a weighted sum / stack column
   * @param {string | null} label optional label
   * @param {string} numberColumn1 the first numerical column
   * @param {number} weight1 its weight (0..1)
   * @param {string} numberColumn2 the second numerical column
   * @param {number} weight2 its weight (0..1)
   * @param {string | number} numberColumnAndWeights alternating column weight references
   */
  weightedSum(
    label: string | null,
    numberColumn1: string,
    weight1: number,
    numberColumn2: string,
    weight2: number,
    ...numberColumnAndWeights: (string | number)[]
  ) {
    const weights = [weight1, weight2].concat(numberColumnAndWeights.filter((_, i) => i % 2 === 1) as number[]);
    this.columns.push({
      desc: createStackDesc(label ? label : undefined),
      columns: [numberColumn1, numberColumn2].concat(numberColumnAndWeights.filter((_, i) => i % 2 === 0) as string[]),
      post: (col) => {
        (col as StackColumn).setWeights(weights);
      },
    });
    return this;
  }

  /**
   * add reducing column (min, max, median, mean, ...)
   * @param {string | null} label optional label
   * @param {EAdvancedSortMethod} operation operation to apply (min, max, median, mean, ...)
   * @param {string} numberColumn1 first numerical column
   * @param {string} numberColumn2 second numerical column
   * @param {string} numberColumns additional numerical columns
   */
  reduce(
    label: string | null,
    operation: EAdvancedSortMethod,
    numberColumn1: string,
    numberColumn2: string,
    ...numberColumns: string[]
  ) {
    this.columns.push({
      desc: createReduceDesc(label ? label : undefined),
      columns: [numberColumn1, numberColumn2].concat(numberColumns),
      post: (col) => {
        (col as ReduceColumn).setReduce(operation);
      },
    });
    return this;
  }

  /**
   * add a scripted / formula column
   * @param {string | null} label optional label
   * @param {string} code the JS code see ScriptColumn for details
   * @param {string} numberColumns additional script columns
   */
  scripted(label: string | null, code: string, ...numberColumns: string[]) {
    this.columns.push({
      desc: Object.assign(createScriptDesc(label ? label : undefined), { script: code }),
      columns: numberColumns,
    });
    return this;
  }

  /**
   * add a selection column for easier multi selections
   */
  selection() {
    this.columns.push({
      desc: createSelectionDesc(),
      columns: [],
    });
    return this;
  }

  /**
   * add a group column to show the current group name
   */
  group() {
    this.columns.push({
      desc: createGroupDesc(),
      columns: [],
    });
    return this;
  }

  /**
   * add an aggregate column to this ranking to collapse/expand groups
   */
  aggregate() {
    this.columns.push({
      desc: createAggregateDesc(),
      columns: [],
    });
    return this;
  }

  /**
   * add a ranking column
   */
  rank() {
    this.columns.push({
      desc: createRankDesc(),
      columns: [],
    });
    return this;
  }

  /**
   * add suporttypes (aggregate, rank, selection) to the ranking
   */
  supportTypes() {
    return this.aggregate().rank().selection();
  }

  /**
   * add all columns to this ranking
   */
  allColumns() {
    this.columns.push(RankingBuilder.ALL_MAGIC_FLAG);
    return this;
  }

  build(data: DataProvider): Ranking {
    const r = data.pushRanking();
    const cols = data.getColumns();

    const findDesc = (c: string) => cols.find((d) => d.label === c || (d as any).column === c);

    const addColumn = (c: string) => {
      const desc = findDesc(c);
      if (desc) {
        return data.push(r, desc) != null;
      }
      console.warn('invalid column: ', c);
      return false;
    };

    this.columns.forEach((c) => {
      if (c === RankingBuilder.ALL_MAGIC_FLAG) {
        cols.forEach((col) => data.push(r, col));
        return;
      }
      if (typeof c === 'string') {
        addColumn(c);
        return;
      }
      const col = data.create(typeof c.desc === 'function' ? c.desc(data) : c.desc)!;
      r.push(col);
      c.columns.forEach((ci) => {
        const d = findDesc(ci);
        const child = d ? data.create(d) : null;
        if (!child) {
          console.warn('invalid column: ', ci);
          return;
        }
        (col as CompositeColumn).push(child);
      });
      if (c.post) {
        c.post(col);
      }
    });

    const children = r.children;
    {
      const groups: Column[] = [];
      this.groups.forEach((column) => {
        const col = children.find((d) => d.desc.label === column || (d as any).desc.column === column);
        if (col) {
          groups.push(col);
          return;
        }
        const desc = findDesc(column);
        if (!desc) {
          console.warn('invalid group criteria column: ', column);
          return;
        }
        const col2 = data.push(r, desc);
        if (col2) {
          groups.push(col2);
          return;
        }
        console.warn('invalid group criteria column: ', column);
      });
      if (groups.length > 0) {
        r.setGroupCriteria(groups);
      }
    }
    {
      const sorts: ISortCriteria[] = [];
      this.sort.forEach(({ column, asc }) => {
        const col = children.find((d) => d.desc.label === column || (d as any).desc.column === column);
        if (col) {
          sorts.push({ col, asc });
          return;
        }
        const desc = findDesc(column);
        if (!desc) {
          console.warn('invalid sort criteria column: ', column);
          return;
        }
        const col2 = data.push(r, desc);
        if (col2) {
          sorts.push({ col: col2, asc });
          return;
        }
        console.warn('invalid sort criteria column: ', column);
      });
      if (sorts.length > 0) {
        r.setSortCriteria(sorts);
      }
    }
    {
      const sorts: ISortCriteria[] = [];
      this.groupSort.forEach(({ column, asc }) => {
        const col = children.find((d) => d.desc.label === column || (d as any).desc.column === column);
        if (col) {
          sorts.push({ col, asc });
          return;
        }
        const desc = findDesc(column);
        if (!desc) {
          console.warn('invalid group sort criteria column: ', column);
          return;
        }
        const col2 = data.push(r, desc);
        if (col2) {
          sorts.push({ col: col2, asc });
          return;
        }
        console.warn('invalid group sort criteria column: ', column);
      });
      if (sorts.length > 0) {
        r.setGroupSortCriteria(sorts);
      }
    }
    return r;
  }
}

/**
 * creates a new instance of a ranking builder
 * @returns {RankingBuilder}
 */
export function buildRanking() {
  return new RankingBuilder();
}
