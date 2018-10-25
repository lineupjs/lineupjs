import {EAlignment, ILinkColumnDesc} from '../../model';
import ColumnBuilder from './ColumnBuilder';

export default class StringColumnBuilder extends ColumnBuilder<ILinkColumnDesc> {

  constructor(column: string) {
    super('string', column);
  }

  /**
   * makes the text editable within a cell and switches to the annotate type
   */
  editable() {
    this.desc.type = 'annotate';
    return this;
  }

  /**
   * changes the alignment of the column
   */
  alignment(align: EAlignment) {
    this.desc.alignment = align;
    return this;
  }

  /**
   * allow html text as values
   */
  html() {
    this.desc.escape = false;
    return this;
  }

  /**
   * provide a pattern with which the value will be wrapped, use <code>${value}</code> for the current and and <code>${item}</code> for the whole item
   * @param {string} pattern pattern to apply
   * @param {string[]} templates optional templates for patterns to provide in the edit pattern dialog
   */
  pattern(pattern: string, templates?: string[]) {
    this.desc.type = 'link';
    this.desc.pattern = pattern;
    if (templates) {
      this.desc.patternTemplates = templates;
    }
    return this;
  }
}

/**
 * builds a string column builder
 * @param {string} column column which contains the associated data
 * @returns {StringColumnBuilder}
 */
export function buildStringColumn(column: string) {
  return new StringColumnBuilder(column);
}
