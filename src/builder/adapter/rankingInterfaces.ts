import {IImposeColumnBuilder, INestedBuilder, IReduceBuilder, IScriptedBuilder, IWeightedSumBuilder} from '..';

export interface IBuilderAdapterRankingProps {
  sortBy?: (string | { column: string, asc: 'asc' | 'desc' | boolean }) | ((string | { column: string, asc: 'asc' | 'desc' | boolean })[]);
  groupBy?: string[] | string;
  columns?: (string | IImposeColumnBuilder | INestedBuilder | IWeightedSumBuilder | IReduceBuilder | IScriptedBuilder)[];
}

export interface IBuilderAdapterImposeColumnProps {
  label?: string;
  column: string;
  categoricalColumn: string;
}

export interface IBuilderAdapterNestedColumnProps {
  label?: string;
}

export interface IBuilderAdapterWeightedSumColumnProps {
  label?: string;
}

export interface IBuilderAdapterReduceColumnProps {
  type: 'min' | 'max' | 'mean' | 'median';
  label?: string;
}

export interface IBuilderAdapterScriptColumnProps {
  code: string;
  label?: string;
}

export interface IBuilderAdapterSupportColumnProps {
  type: 'rank' | 'selection' | 'group' | 'aggregate' | '*';
}
