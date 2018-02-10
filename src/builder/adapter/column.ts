import { IArrayDesc, IStringColumnDesc, IColumnDesc, EAdvancedSortMethod, INumberColumnDesc, ICategory, ICategoricalColumnDesc, IDateColumnDesc, IHierarchyColumnDesc, IPartialCategoryNode } from '../../model';
import { extent } from 'd3-array';

export interface ILineUpColumnDescProps extends Partial<IColumnDesc> {
  column: string;
  asMap?: boolean;
  asArray?: string[] | number | boolean;
  custom?: { [key: string]: any };
}

export function build<T extends ILineUpColumnDescProps>(props: T, _data?: any[]): IColumnDesc {
  const { column } = props;
  const desc = <any>{ column, type: props.type, label: column[0].toUpperCase() + column.slice(1) };

  (<(keyof ILineUpColumnDescProps)[]>['label', 'description', 'frozen', 'color', 'width', 'renderer', 'groupRenderer', 'summaryRenderer', 'visible', 'fixed']).forEach((key) => {
    if (props.hasOwnProperty(key)) {
      desc[key] = props[key];
    }
  });

  if (props.asMap) {
    console.assert(['categorical', 'date', 'number', 'string'].includes(desc.type!));
    desc.type += 'Map';
  }

  if (props.asArray != null) {
    console.assert(['boolean', 'categorical', 'date', 'number', 'string'].includes(desc.type!));
    desc.type += 's';
    const a = <IArrayDesc>desc;
    const labels = props.asArray;
    if (Array.isArray(labels)) {
      a.labels = labels;
      a.dataLength = labels.length;
    } else if (typeof labels === 'number') {
      a.dataLength = labels;
    }
  }

  return <any>desc;
}


export interface ILineUpCategoricalColumnDescProps extends ILineUpColumnDescProps {
  asOrdinal?: boolean;
  categories?: (string | Partial<ICategory>)[];
  missingCategory?: (string | Partial<ICategory>);
  asSet?: boolean | string;
}

export function buildCategorical(props: ILineUpCategoricalColumnDescProps, data: any[]): ICategoricalColumnDesc {
  const desc: any = build({ ...props, type: 'categorical' });

  if (props.asOrdinal) {
    desc.type = 'ordinal';
  }
  if (props.missingCategory) {
    desc.missingCategory = props.missingCategory;
  }
  if (props.asSet) {
    if (typeof props.asSet === 'string') {
      (<any>desc).separator = props.asSet;
    }
    desc.type = 'set';
  }


  if (!props.categories) {
    // derive categories
    const categories = new Set(data.map((d) => <string>d[(<any>desc).column]));
    desc.categories = Array.from(categories).sort();
  } else {
    desc.categories = props.categories;
  }
  return desc;
}

export interface ILineUpDateColumnDescProps extends ILineUpColumnDescProps {
  dateFormat?: string;
  dateParse?: string;
}

export function buildDate(props: ILineUpDateColumnDescProps): IDateColumnDesc {
  const desc: any = build({ ...props, type: 'date' });

  (<(keyof ILineUpDateColumnDescProps)[]>['dateFormat', 'dateParse']).forEach((key) => {
    if (props.hasOwnProperty(key)) {
      desc[key] = props[key];
    }
  });
  return desc;
}

export interface ILineUpHierarchyColumnDescProps extends ILineUpColumnDescProps {
  hierarchy: IPartialCategoryNode;
  hierarchySeparator?: string;
}

export function buildHierarchy(props: Partial<ILineUpHierarchyColumnDescProps>): IHierarchyColumnDesc {
  const desc: any = build({ ...(<any>props), type: 'hierarchy' });

  (<(keyof ILineUpHierarchyColumnDescProps)[]>['hierarchy', 'hierarchySeparator']).forEach((key) => {
    if (props.hasOwnProperty(key)) {
      desc[key] = props[key];
    }
  });
  return desc;
}

export interface ILineUpNumberColumnDescProps extends ILineUpColumnDescProps {
  domain?: [number, number];
  range?: [number, number];
  mapping?: 'linear' | 'sqrt' | 'pow1.1' | 'pow2' | 'pow3';
  scripted?: string;
  sort?: EAdvancedSortMethod;
}

export function buildNumber(props: ILineUpNumberColumnDescProps, data: any[]): INumberColumnDesc {
  const desc: any = build({ ...props, type: 'number' });

  const domain = props.domain ? props.domain : <[number, number]>extent(data, (d) => <number>d[(<any>desc).column]);

  (<(keyof ILineUpNumberColumnDescProps)[]>['sort']).forEach((key) => {
    if (props.hasOwnProperty(key)) {
      desc[key] = props[key];
    }
  });
  if (props.scripted) {
    desc.map = { domain, code: props.scripted, type: 'script' };
  } else if (!props.mapping || props.mapping === 'linear') {
    desc.domain = domain;
    if (props.range) {
      desc.range = props.range;
    }
  } else {
    desc.map = {
      type: props.mapping,
      domain,
      range: props.range || [0, 1]
    };
  }
  return desc;
}

export interface ILineUpStringColumnDescProps extends ILineUpColumnDescProps {
  editable?: boolean;
  html?: boolean;
  pattern?: string;
  patternTemplates?: string[];
}

export function buildString(props: ILineUpStringColumnDescProps): IStringColumnDesc {
  const desc: any = build({ ...props, type: 'string' });

  (<(keyof ILineUpStringColumnDescProps)[]>['pattern', 'patternTemplate']).forEach((key) => {
    if (props.hasOwnProperty(key)) {
      desc[key] = props[key];
    }
  });
  if (props.editable) {
    desc.type = 'annotate';
  }
  if (props.html) {
    desc.escape = false;
  }
  return desc;
}

