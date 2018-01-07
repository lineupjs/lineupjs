import {
  createAggregateDesc,
  createGroupDesc,
  createImpositionBoxPlotDesc, createImpositionDesc, createImpositionsDesc, createNestedDesc, createRankDesc,
  createReduceDesc,
  createScriptDesc, createSelectionDesc,
  createStackDesc,
  EAdvancedSortMethod,
  IColumnDesc,
  ISortCriteria
} from '../model';
import Column from '../model/Column';
import CompositeColumn from '../model/CompositeColumn';
import Ranking from '../model/Ranking';
import ReduceColumn from '../model/ReduceColumn';
import ScriptColumn from '../model/ScriptColumn';
import StackColumn from '../model/StackColumn';
import ADataProvider from '../provider/ADataProvider';

export default class RankingBuilder {
  private readonly columns: (string|{desc: IColumnDesc, columns: string[], post?: (col: Column)=>void})[] = [];
  private readonly sort: { column: string, asc: boolean }[] = [];
  private readonly groups: string[] = [];
  private all = false;

  sortBy(column: string, asc: boolean = true) {
    this.sort.push({column, asc});
    return this;
  }

  groupBy(...columns: string[]) {
    this.groups.push(...columns);
    return this;
  }

  column(column: string) {
    this.columns.push(column);
    return this;
  }

  impose(type: 'number'|'boxplot'|'numbers', numberColumn: string, categoricalColumn: string) {
    let desc: IColumnDesc;
    switch(type) {
      case 'boxplot':
        desc = createImpositionBoxPlotDesc();
        break;
      case 'numbers':
        desc = createImpositionsDesc();
        break;
      default:
        desc = createImpositionDesc();
        break;
    }
    this.columns.push({
      desc,
      columns: [numberColumn, categoricalColumn]
    });
    return this;
  }

  nested(column: string, ...columns: string[]) {
    this.columns.push({
      desc: createNestedDesc(),
      columns: [column].concat(columns)
    });
    return this;
  }

  weightedSum(numberColumn1: string, weight1: number, numberColumn2: string, weight2: number, ...numberColumnAndWeights: (string|number)[]) {
    const weights = [weight1, weight2].concat(<number[]>numberColumnAndWeights.filter((_, i) => i % 2 === 1));
    this.columns.push({
      desc: createStackDesc(),
      columns: [numberColumn1, numberColumn2].concat(<string[]>numberColumnAndWeights.filter((_, i) => i % 2 === 0)),
      post: (col) => {
        (<StackColumn>col).setWeights(weights);
      }
    });
    return this;
  }

  reduce(operation: EAdvancedSortMethod, numberColumn1: string, numberColumn2: string, ...numberColumns: string[]) {
    this.columns.push({
      desc: createReduceDesc(),
      columns: [numberColumn1, numberColumn2].concat(numberColumns),
      post: (col) => {
        (<ReduceColumn>col).setReduce(operation);
      }
    });
    return this;
  }

  scripted(code: string, numberColumn1: string, numberColumn2: string, ...numberColumns: string[]) {
    this.columns.push({
      desc: createScriptDesc(),
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


  allColumns() {
    this.all = true;
    return this;
  }

  build(): (data: ADataProvider) => Ranking {
    return (data: ADataProvider) => {
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

      if (this.all) {
        cols.forEach((col) => data.push(r, col));
      }
      this.columns.forEach((c) => {
        if (typeof c === 'string') {
          addColumn(c);
          return;
        }
        const col = data.create(c.desc)!;
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
    };
  }
}

export function buildRanking() {
  return new RankingBuilder();
}
