/**
 * Created by sam on 04.11.2016.
 */

import Column from './Column';
import CompositeNumberColumn, {ICompositeNumberDesc} from './CompositeNumberColumn';

const DEFAULT_SCRIPT = 'return Math.max.apply(Math,values)';

/**
 * factory for creating a description creating a mean column
 * @param label
 * @returns {{type: string, label: string}}
 */
export function createDesc(label: string = 'script') {
  return {type: 'script', label, script: DEFAULT_SCRIPT};
}

export interface IScriptColumnDesc extends ICompositeNumberDesc {
  /**
   * the function to use, it has two parameters: children (current children) and values (their row values)
   * @default 'return Math.max.apply(Math,values)'
   */
  script?: string;
}

export default class ScriptColumn extends CompositeNumberColumn {
  static readonly EVENT_SCRIPT_CHANGED = 'scriptChanged';
  static readonly DEFAULT_SCRIPT = DEFAULT_SCRIPT;

  private script = ScriptColumn.DEFAULT_SCRIPT;
  private f: Function = null;

  constructor(id: string, desc: IScriptColumnDesc) {
    super(id, desc);
    this.script = desc.script || this.script;
  }

  protected createEventList() {
    return super.createEventList().concat([ScriptColumn.EVENT_SCRIPT_CHANGED]);
  }

  setScript(script: string) {
    if (this.script === script) {
      return;
    }
    this.f = null;
    this.fire([ScriptColumn.EVENT_SCRIPT_CHANGED, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], this.script, this.script = script);
  }

  getScript() {
    return this.script;
  }

  dump(toDescRef: (desc: any) => any) {
    const r = super.dump(toDescRef);
    r.script = this.script;
    return r;
  }

  restore(dump: any, factory: (dump: any) => Column) {
    this.script = dump.script || this.script;
    super.restore(dump, factory);
  }

  protected compute(row: any, index: number) {
    if (this.f == null) {
      this.f = new Function('children', 'values', this.script);
    }
    return this.f.call(this, this._children, this._children.map((d) => d.getValue(row, index)));
  }

  /**
   * describe the column if it is a sorting criteria
   * @param toId helper to convert a description to an id
   * @return {string} json compatible
   */
  toSortingDesc(toId: (desc: any) => string): any {
    return {
      code: this.script,
      operands: this._children.map((c) => c.toSortingDesc(toId))
    };
  }
}
