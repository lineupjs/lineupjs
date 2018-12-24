export * from './builderAdapter';

import {IImposeColumnBuilder, INestedBuilder, IReduceBuilder, IScriptedBuilder, IWeightedSumBuilder} from '..';
import {ILineUpOptions, ITaggleOptions} from '../../config';
import {EAdvancedSortMethod, IAction, ICategory, IColumnDesc, IGroupAction, IPartialCategoryNode} from '../../model';
import {IDataProviderOptions, ILocalDataProviderOptions, LocalDataProvider} from '../../provider';
import {LineUp, Taggle} from '../../ui';

export interface IBuilderAdapterRankingProps {
  sortBy?: (string | {column: string, asc: 'asc' | 'desc' | boolean}) | ((string | {column: string, asc: 'asc' | 'desc' | boolean})[]);
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



export interface IBuilderAdapterDataProps extends Partial<IDataProviderOptions>, Partial<ILocalDataProviderOptions> {
  data: any[];
  selection?: number[] | null;
  highlight?: number | null;

  onSelectionChanged?(selection: number[]): void;
  onHighlightChanged?(highlight: number): void;

  deriveColumns?: boolean | string[];
  deriveColors?: boolean;

  restore?: any;
  defaultRanking?: boolean | 'noSupportTypes';
}

export declare type IBuilderAdapterProps = Partial<ITaggleOptions> & IBuilderAdapterDataProps;

export interface IChangeDetecter {
  (prop: (keyof IBuilderAdapterProps)): boolean;
}

export interface IBuilderAdapter {
  props(): Readonly<IBuilderAdapterProps>;
  createInstance(data: LocalDataProvider, options: Partial<ILineUpOptions>): LineUp | Taggle;
  rankingBuilders(): IBuilderAdapterRankingProps[];
  columnDescs(data: any[]): IColumnDesc[];
}


export interface IBuilderAdapterColumnDescProps extends Partial<IColumnDesc> {
  column: string;
  asMap?: boolean;
  asArray?: string[] | number | boolean;
  custom?: {[key: string]: any};
}

export interface IBuilderAdapterCategoricalColumnDescProps extends IBuilderAdapterColumnDescProps {
  asOrdinal?: boolean;
  categories?: (string | Partial<ICategory>)[];
  missingCategory?: (string | Partial<ICategory>);
  asSet?: boolean | string;
}

export interface IBuilderAdapterDateColumnDescProps extends IBuilderAdapterColumnDescProps {
  dateFormat?: string;
  dateParse?: string;
}

export interface IBuilderAdapterHierarchyColumnDescProps extends IBuilderAdapterColumnDescProps {
  hierarchy: IPartialCategoryNode;
  hierarchySeparator?: string;
}

export interface IBuilderAdapterNumberColumnDescProps extends IBuilderAdapterColumnDescProps {
  domain?: [number, number];
  range?: [number, number];
  mapping?: 'linear' | 'sqrt' | 'pow1.1' | 'pow2' | 'pow3';
  scripted?: string;
  sort?: EAdvancedSortMethod;
  colorMapping?: string;
}

export interface IBuilderAdapterStringColumnDescProps extends IBuilderAdapterColumnDescProps {
  editable?: boolean;
  html?: boolean;
  pattern?: string;
  patternTemplates?: string[];
}

export interface IBuilderAdapterBooleanColumnDescProps extends IBuilderAdapterColumnDescProps {
  trueMarker?: string;
  falseMarker?: string;
}

export interface IBuilderAdapterActionsColumnDescProps extends IBuilderAdapterColumnDescProps {
  actions?: IAction[];
  groupActions?: IGroupAction[];
}
