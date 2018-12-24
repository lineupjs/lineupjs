import {ILineUpOptions, ITaggleOptions} from '../../interfaces';
import {IColumnDesc} from '../../model';
import {IDataProviderOptions, ILocalDataProviderOptions, LocalDataProvider} from '../../provider';
import {LineUp, Taggle} from '../../ui';
import {IBuilderAdapterRankingProps} from './rankingInterfaces';


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
