import {
  createAggregateDesc, createGroupDesc, createImpositionBoxPlotDesc, createImpositionDesc, createImpositionsDesc,
  createNestedDesc, createRankDesc, createReduceDesc, createScriptDesc, createSelectionDesc, createStackDesc,
  EAdvancedSortMethod, IColumnDesc, ISortCriteria
} from '../model';
import Column from '../model/Column';
import CompositeColumn from '../model/CompositeColumn';
import Ranking from '../model/Ranking';
import ReduceColumn from '../model/ReduceColumn';
import ScriptColumn from '../model/ScriptColumn';
import StackColumn from '../model/StackColumn';
import ADataProvider from '../provider/ADataProvider';

export interface IImposeColumnBuilder {
  type: 'impose';
  column: string;
  label?: string;
  categoricalColumn: string;
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

export default class RankingBuilder {
  private static readonly ALL_MAGIC_FLAG = '*';

  private readonly columns: (string | { desc: IColumnDesc|((data: ADataProvider) => IColumnDesc), columns: string[], post?: (col: Column) => void })[] = [];
  private readonly sort: { column: string, asc: boolean }[] = [];
  private readonly groups: string[] = [];

  sortBy(column: string, asc: boolean | 'asc' | 'desc' = true) {
    if (column.includes(':')) {
      // encoded sorting order
      const index = column.indexOf(':');
      asc = <'asc' | 'desc'>column.slice(index + 1);
      column = column.slice(0, index);
    }
    this.sort.push({column, asc: asc === true || String(asc)[0] === 'a'});
    return this;
  }

  groupBy(...columns: string[]) {
    this.groups.push(...columns);
    return this;
  }

  column(column: string | IImposeColumnBuilder | INestedBuilder | IWeightedSumBuilder | IReduceBuilder | IScriptedBuilder) {
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
        return this.impose(label, column.column, column.categoricalColumn);
      case 'min':
      case 'max':
      case 'median':
      case 'mean':
        console.assert(column.columns.length >= 2);
        return this.reduce(label, <any>column.type, column.columns[0], column.columns[1], ...column.columns.slice(2));
      case 'nested':
        console.assert(column.columns.length >= 1);
        return this.nested(label, column.columns[0], ... column.columns.slice(1));
      case 'script':
        console.assert(column.columns.length >= 2);
        return this.scripted(label, column.code, column.columns[0], column.columns[1], ...column.columns.slice(2));
      case 'weightedSum':
        console.assert(column.columns.length >= 2);
        console.assert(column.columns.length === column.weights.length);
        const mixed: (string | number)[] = [];
        column.columns.slice(2).forEach((c, i) => {
          mixed.push(c);
          mixed.push(column.weights[i + 2]);
        });
        return this.weightedSum(label, column.columns[0], column.weights[0], column.columns[1], column.weights[1], ...mixed);
    }
    console.error('invalid column type: ', column);
    return this;
  }

  impose(label: string|null, numberColumn: string, categoricalColumn: string) {
    this.columns.push({
      desc: (data) => {
        const base = data.getColumns().find((d) => d.label === numberColumn || (<any>d).column === numberColumn);
        switch(base ? base.type : '') {
          case 'boxplot':
          return createImpositionBoxPlotDesc(label ? label: undefined);
        case 'numbers':
          return createImpositionsDesc(label ? label: undefined);
        default:
          return createImpositionDesc(label ? label: undefined);
        }
      },
      columns: [numberColumn, categoricalColumn]
    });
    return this;
  }

  nested(label: string|null, column: string, ...columns: string[]) {
    this.columns.push({
      desc: createNestedDesc(label ? label: undefined),
      columns: [column].concat(columns)
    });
    return this;
  }

  weightedSum(label: string|null, numberColumn1: string, weight1: number, numberColumn2: string, weight2: number, ...numberColumnAndWeights: (string | number)[]) {
    const weights = [weight1, weight2].concat(<number[]>numberColumnAndWeights.filter((_, i) => i % 2 === 1));
    this.columns.push({
      desc: createStackDesc(label ? label : undefined),
      columns: [numberColumn1, numberColumn2].concat(<string[]>numberColumnAndWeights.filter((_, i) => i % 2 === 0)),
      post: (col) => {
        (<StackColumn>col).setWeights(weights);
      }
    });
    return this;
  }

  reduce(label: string|null, operation: EAdvancedSortMethod, numberColumn1: string, numberColumn2: string, ...numberColumns: string[]) {
    this.columns.push({
      desc: createReduceDesc(label? label: undefined),
      columns: [numberColumn1, numberColumn2].concat(numberColumns),
      post: (col) => {
        (<ReduceColumn>col).setReduce(operation);
      }
    });
    return this;
  }

  scripted(label: string|null, code: string, numberColumn1: string, numberColumn2: string, ...numberColumns: string[]) {
    this.columns.push({
      desc: createScriptDesc(label? label: undefined),
      columns: [numberColumn1, numberColumn2].concat(numberColumns),
      post: (col) => {
        (<ScriptColumn>col).setScript(code);
      }
    });
    return this;
  }

  selection() {
    this.columns.push({
      desc: createSelectionDesc(),
      columns: []
    });
    return this;
  }

  group() {
    this.columns.push({
      desc: createGroupDesc(),
      columns: []
    });
    return this;
  }

  aggregate() {
    this.columns.push({
      desc: createAggregateDesc(),
      columns: []
    });
    return this;
  }

  rank() {
    this.columns.push({
      desc: createRankDesc(),
      columns: []
    });
    return this;
  }

  supportTypes() {
    return this.aggregate().rank().selection();
  }

  allColumns() {
    this.columns.push(RankingBuilder.ALL_MAGIC_FLAG);
    return this;
  }

  build(data: ADataProvider): Ranking {
    const r = data.pushRanking();
    const cols = data.getColumns();

    const findDesc = (c: string) => cols.find((d) => d.label === c || (<any>d).column === c);

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
        (<CompositeColumn>col).push(child);
      });
      if (c.post) {
        c.post(col);
      }
    });

    const children = r.children;
    {
      const groups: Column[] = [];
      this.groups.forEach((column) => {
        const col = children.find((d) => d.desc.label === column || (<any>d).desc.column === column);
        if (col) {
          groups.push(col);
          return;
        }
        const desc = findDesc(column);
        if (desc && data.push(r, desc)) {
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
      this.sort.forEach(({column, asc}) => {
        const col = children.find((d) => d.desc.label === column || (<any>d).desc.column === column);
        if (col) {
          sorts.push({col, asc});
          return;
        }
        const desc = findDesc(column);
        if (desc && data.push(r, desc)) {
          return;
        }
        console.warn('invalid sort criteria column: ', column);
      });
      if (sorts.length > 0) {
        r.setSortCriteria(sorts);
      }
    }
    return r;
  }
}

export function buildRanking() {
  return new RankingBuilder();
}
