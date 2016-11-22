/**
 * Created by sam on 04.11.2016.
 */

import Column from './Column';
import CompositeNumberColumn from './CompositeNumberColumn';

/**
 * factory for creating a description creating a mean column
 * @param label
 * @returns {{type: string, label: string}}
 */
export function createDesc(label: string = 'script') {
  return {type: 'script', label: label, script: ScriptColumn.DEFAULT_SCRIPT};
}

export default class ScriptColumn extends CompositeNumberColumn {
  static EVENT_SCRIPT_CHANGED = 'scriptChanged';
  static DEFAULT_SCRIPT = 'return Math.max.apply(Math,values)';

  private script = ScriptColumn.DEFAULT_SCRIPT;
  private f: Function = null;

  constructor(id: string, desc: any) {
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

  protected compute(row: any) {
    if (this.f == null) {
      this.f = new Function('children', 'values', this.script);
    }
    return this.f.call(this, this._children, this._children.map((d) => d.getValue(row)));
  }
}
