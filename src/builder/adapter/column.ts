import {extent} from '../../internal';
import {IActionColumnDesc, IArrayDesc, IBooleanColumnDesc, ICategoricalColumnDesc, IColumnDesc, IDateColumnDesc, IHierarchyColumnDesc, ILinkColumnDesc, INumberColumnDesc} from '../../model';
import {IBuilderAdapterActionsColumnDescProps, IBuilderAdapterBooleanColumnDescProps, IBuilderAdapterCategoricalColumnDescProps, IBuilderAdapterColumnDescProps, IBuilderAdapterDateColumnDescProps, IBuilderAdapterHierarchyColumnDescProps, IBuilderAdapterNumberColumnDescProps, IBuilderAdapterStringColumnDescProps} from '.';

export function build<T extends IBuilderAdapterColumnDescProps>(props: T, _data?: any[]): IColumnDesc {
  const {column} = props;
  const desc = <any>{column, type: props.type, label: column ? column[0].toUpperCase() + column.slice(1) : props.type};

  (<(keyof IBuilderAdapterColumnDescProps)[]>['label', 'description', 'frozen', 'width', 'renderer', 'groupRenderer', 'summaryRenderer', 'visible', 'fixed']).forEach((key) => {
    if (props.hasOwnProperty(key)) {
      desc[key] = props[key];
    }
  });

  if (props.custom) { // merge custom attributes
    Object.assign(desc, props.custom);
  }

  if (props.asMap) {
    console.assert(['categorical', 'date', 'number', 'string', 'link'].includes(desc.type!));
    desc.type += 'Map';
  }

  if (props.asArray != null) {
    console.assert(['boolean', 'categorical', 'date', 'number', 'string', 'link'].includes(desc.type!));
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


export function buildCategorical(props: IBuilderAdapterCategoricalColumnDescProps, data: any[]): ICategoricalColumnDesc {
  const desc: any = build({...props, type: 'categorical'});

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

export function buildDate(props: IBuilderAdapterDateColumnDescProps): IDateColumnDesc {
  const desc: any = build({...props, type: 'date'});

  (<(keyof IBuilderAdapterDateColumnDescProps)[]>['dateFormat', 'dateParse']).forEach((key) => {
    if (props.hasOwnProperty(key)) {
      desc[key] = props[key];
    }
  });
  return desc;
}

export function buildHierarchy(props: Partial<IBuilderAdapterHierarchyColumnDescProps>): IHierarchyColumnDesc {
  const desc: any = build({...(<any>props), type: 'hierarchy'});

  (<(keyof IBuilderAdapterHierarchyColumnDescProps)[]>['hierarchy', 'hierarchySeparator']).forEach((key) => {
    if (props.hasOwnProperty(key)) {
      desc[key] = props[key];
    }
  });
  return desc;
}

export function buildNumber(props: IBuilderAdapterNumberColumnDescProps, data: any[]): INumberColumnDesc {
  const desc: any = build({...props, type: 'number'});

  const domain = props.domain ? props.domain : <[number, number]>extent(data, (d) => <number>d[(<any>desc).column]);

  if (props.hasOwnProperty('color')) {
    desc.colorMapping = props.color;
  }
  (<(keyof IBuilderAdapterNumberColumnDescProps)[]>['sort', 'colorMapping']).forEach((key) => {
    if (props.hasOwnProperty(key)) {
      desc[key] = props[key];
    }
  });
  if (props.scripted) {
    desc.map = {domain, code: props.scripted, type: 'script'};
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

export function buildString(props: IBuilderAdapterStringColumnDescProps): ILinkColumnDesc {
  const desc: any = build({...props, type: 'string'});

  (<(keyof IBuilderAdapterStringColumnDescProps)[]>['pattern', 'patternTemplate', 'alignment']).forEach((key) => {
    if (props.hasOwnProperty(key)) {
      desc[key] = props[key];
    }
  });
  if (props.editable) {
    desc.type = 'annotate';
  }
  if (props.pattern) {
    desc.type = 'link';
  }
  if (props.html) {
    desc.escape = false;
  }
  return desc;
}


export function buildBoolean(props: IBuilderAdapterBooleanColumnDescProps): IBooleanColumnDesc {
  const desc: any = build({...props, type: 'boolean'});

  (<(keyof IBuilderAdapterBooleanColumnDescProps)[]>['trueMarker', 'falseMarker']).forEach((key) => {
    if (props.hasOwnProperty(key)) {
      desc[key] = props[key];
    }
  });
  return desc;
}

export function buildActions(props: IBuilderAdapterActionsColumnDescProps): IActionColumnDesc {
  const desc: any = build({...props, type: 'actions'});

  (<(keyof IBuilderAdapterActionsColumnDescProps)[]>['actions', 'groupActions']).forEach((key) => {
    if (props.hasOwnProperty(key)) {
      desc[key] = props[key];
    }
  });
  return desc;
}

