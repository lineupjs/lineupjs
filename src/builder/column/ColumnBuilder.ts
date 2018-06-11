import {IArrayDesc, IColumnDesc} from '../../model';

export default class ColumnBuilder<T extends IColumnDesc = IColumnDesc> {
  protected readonly desc: T;

  constructor(type: string, column: string) {
    this.desc = <any>{column, type, label: column ? column[0].toUpperCase() + column.slice(1): type};
  }

  label(label: string) {
    this.desc.label = label;
    return this;
  }

  description(description: string) {
    this.desc.description = description;
    return this;
  }

  /**
   * sets the frozen state of this column, i.e is sticky to the left side when scrolling horizontally
   */
  frozen() {
    this.desc.frozen = true;
    return this;
  }

  /**
   * specify the renderer to used for this column
   * @param {string} renderer within a cell
   * @param {string} groupRenderer within an aggregated cell
   * @param {string} summaryRenderer within the summary in the header and side panel
   */
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

  /**
   * specify a custom additional attribute for the description
   * @param {string} key the property key
   * @param value its value
   */
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

  /**
   * converts the column type to be an array type, supports only base types: boolean, categorical, date, number, and string
   * @param {string[] | number} labels labels to use for each array item or the expected length of an value
   */
  asArray(labels?: string[] | number) {
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

  /**
   * converts the column type to be a map type, supports only base types: categorical, date, number, and string
   */
  asMap() {
    console.assert(['categorical', 'date', 'number', 'string'].includes(this.desc.type!));
    this.desc.type += 'Map';
    return this;
  }

  /**
   * build the column description
   */
  build(_data: any[]): T {
    return <any>this.desc;
  }
}

/**
 * build a column of a given type
 * @param {string} type column type
 * @param {string} column column which contains the associated data
 * @returns {ColumnBuilder<IColumnDesc>}
 */
export function buildColumn(type: string, column: string) {
  return new ColumnBuilder(type, column);
}
