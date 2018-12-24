import {EAdvancedSortMethod, IAction, ICategory, IColumnDesc, IGroupAction, IPartialCategoryNode} from '../../model';

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
