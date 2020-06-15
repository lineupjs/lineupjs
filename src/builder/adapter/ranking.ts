import {buildRanking as buildRankingImpl, INestedBuilder, IReduceBuilder, IScriptedBuilder, IWeightedSumBuilder} from '..';
import {Ranking} from '../../model';
import {LocalDataProvider} from '../../provider';
import {IBuilderAdapterImposeColumnProps, IBuilderAdapterNestedColumnProps, IBuilderAdapterRankingProps, IBuilderAdapterReduceColumnProps, IBuilderAdapterScriptColumnProps, IBuilderAdapterSupportColumnProps, IBuilderAdapterWeightedSumColumnProps} from '.';


/*
 * build the column description
 */
export function buildRanking(props: IBuilderAdapterRankingProps, data: LocalDataProvider): Ranking {
  const r = buildRankingImpl();

  if (props.sortBy) {
    const s = Array.isArray(props.sortBy) ? props.sortBy : [props.sortBy];
    s.forEach((si) => {
      if (typeof si === 'string') {
        r.sortBy(si);
      } else {
        r.sortBy(si.column, si.asc);
      }
    });
  }
  if (props.groupBy) {
    const s = Array.isArray(props.groupBy) ? props.groupBy : [props.groupBy];
    r.groupBy(...s);
  }
  if (props.columns) {
    props.columns.forEach((c) => r.column(c));
  }
  return r.build(data);
}

export function buildGeneric(props: { column: '*' | string }) {
  return props.column;
}

export function buildImposeRanking(props: IBuilderAdapterImposeColumnProps) {
  return <any>Object.assign({
    type: 'impose'
  }, props);
}


export function buildNestedRanking(props: IBuilderAdapterNestedColumnProps, children: string[]) {
  const r: INestedBuilder = {
    type: 'nested',
    columns: children
  };
  if (props.label) {
    r.label = props.label;
  }
  return r;
}


export function buildWeightedSumRanking(props: IBuilderAdapterWeightedSumColumnProps, children: { column: string, weight: number }[]) {
  const r: IWeightedSumBuilder = {
    type: 'weightedSum',
    columns: children.map((d) => d.column),
    weights: children.map((d) => d.weight)
  };
  if (props.label) {
    r.label = props.label;
  }
  return r;
}

export function buildReduceRanking(props: IBuilderAdapterReduceColumnProps, children: string[]) {
  const r: IReduceBuilder = {
    type: props.type,
    columns: children
  };
  if (props.label) {
    r.label = props.label;
  }
  return r;
}

export function buildScriptRanking(props: IBuilderAdapterScriptColumnProps, children: string[]) {
  const r: IScriptedBuilder = {
    type: 'script',
    code: props.code,
    columns: children
  };
  if (props.label) {
    r.label = props.label;
  }
  return r;
}

export function buildSupportRanking(props: IBuilderAdapterSupportColumnProps) {
  return `_${props.type}`;
}

export function buildAllColumnsRanking() {
  return '*';
}
