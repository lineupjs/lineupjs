import {IStringColumnDesc} from '../../model';
import ColumnBuilder from './ColumnBuilder';

export default class StringColumnBuilder extends ColumnBuilder<IStringColumnDesc> {

  constructor(column: string) {
    super('string', column);
  }

  editable() {
    this.desc.type = 'annotate';
    return this;
  }

  html() {
    this.desc.escape = false;
    return this;
  }

  pattern(pattern: string, templates?: string[]) {
    this.desc.pattern = pattern;
    if (templates) {
      this.desc.patternTemplates = templates;
    }
    return this;
  }
}

export function buildStringColumn(column: string) {
  return new StringColumnBuilder(column);
}
