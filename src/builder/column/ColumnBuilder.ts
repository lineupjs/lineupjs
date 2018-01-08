import {IArrayDesc, IColumnDesc} from '../../model';

export default class ColumnBuilder<T extends IColumnDesc = IColumnDesc> {
  protected readonly desc: T;

  constructor(type: string, column: string) {
    this.desc = <any>{column, type, label: column[0].toUpperCase() + column.slice(1)};
  }

  label(label: string) {
    this.desc.label = label;
    return this;
  }

  description(description: string) {
    this.desc.description = description;
    return this;
  }

  frozen() {
    this.desc.frozen = true;
    return this;
  }

  renderer(renderer?: string, groupRenderer?: string, summaryRenderer?: string) {
    if (renderer) {
      this.desc.renderer = renderer;
    }
    if (groupRenderer) {
      this.desc.groupRenderer = groupRenderer;
    }
    if (summaryRenderer) {
      this.desc.summaryRenderer = summaryRenderer;
    }
    return this;
  }

  custom(key: string, value: any) {
    (<any>this.desc)[key] = value;
    return this;
  }

  width(width: number) {
    this.desc.width = width;
    return this;
  }

  color(color: string) {
    this.desc.color = color;
    return this;
  }

  asArray(labels?: string[]|number) {
    console.assert(['boolean', 'categorical', 'date', 'number', 'string'].includes(this.desc.type!));
    this.desc.type += 's';
    const a = <IArrayDesc>this.desc;
    if (Array.isArray(labels)) {
      a.labels = labels;
      a.dataLength = labels.length;
    } else if (typeof labels === 'number') {
      a.dataLength = labels;
    }
    return this;
  }

  asMap() {
    console.assert(['categorical', 'date', 'number', 'string'].includes(this.desc.type!));
    this.desc.type += 'Map';
    return this;
  }

  build(): T {
    return <any>this.desc;
  }
}

export function buildColumn(type: string, column: string) {
  return new ColumnBuilder(type, column);
}
