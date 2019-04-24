import {toolbar} from './annotations';
import ArrayColumn, {IArrayColumnDesc} from './ArrayColumn';
import Column, {widthChanged, labelChanged, metaDataChanged, dirty, dirtyHeader, dirtyValues, rendererTypeChanged, groupRendererChanged, summaryRendererChanged, visibilityChanged, dirtyCaches} from './Column';
import ValueColumn, {dataLoaded} from './ValueColumn';
import {IDataRow} from './interfaces';
import {patternFunction} from './internal';
import {EAlignment} from './StringColumn';
import {IEventListener} from '../internal';
import LinkColumn, {ILink, ILinkDesc} from './LinkColumn';

export declare type ILinksColumnDesc = ILinkDesc & IArrayColumnDesc<string | ILink>;

/**
 * emitted when the pattern property changes
 * @asMemberOf LinksColumn
 * @event
 */
export declare function patternChanged_LCS(previous: string, current: string): void;

@toolbar('search', 'editPattern')
export default class LinksColumn extends ArrayColumn<string | ILink> {
  static readonly EVENT_PATTERN_CHANGED = LinkColumn.EVENT_PATTERN_CHANGED;

  readonly alignment: EAlignment;
  readonly escape: boolean;
  private pattern: string;
  private patternFunction: Function | null = null;
  readonly patternTemplates: string[];

  constructor(id: string, desc: Readonly<ILinksColumnDesc>) {
    super(id, desc);
    this.setDefaultWidth(200); //by default 200
    this.alignment = <any>desc.alignment || EAlignment.left;
    this.escape = desc.escape !== false;
    this.pattern = desc.pattern || '';
    this.patternTemplates = desc.patternTemplates || [];
  }

  setPattern(pattern: string) {
    return LinkColumn.prototype.setPattern.call(this, pattern);
  }

  getPattern() {
    return this.pattern;
  }

  protected createEventList() {
    return super.createEventList().concat([LinksColumn.EVENT_PATTERN_CHANGED]);
  }

  on(type: typeof LinksColumn.EVENT_PATTERN_CHANGED, listener: typeof patternChanged_LCS | null): this;
  on(type: typeof ValueColumn.EVENT_DATA_LOADED, listener: typeof dataLoaded | null): this;
  on(type: typeof Column.EVENT_WIDTH_CHANGED, listener: typeof widthChanged | null): this;
  on(type: typeof Column.EVENT_LABEL_CHANGED, listener: typeof labelChanged | null): this;
  on(type: typeof Column.EVENT_METADATA_CHANGED, listener: typeof metaDataChanged | null): this;
  on(type: typeof Column.EVENT_DIRTY, listener: typeof dirty | null): this;
  on(type: typeof Column.EVENT_DIRTY_HEADER, listener: typeof dirtyHeader | null): this;
  on(type: typeof Column.EVENT_DIRTY_VALUES, listener: typeof dirtyValues | null): this;
  on(type: typeof Column.EVENT_DIRTY_CACHES, listener: typeof dirtyCaches | null): this;
  on(type: typeof Column.EVENT_RENDERER_TYPE_CHANGED, listener: typeof rendererTypeChanged | null): this;
  on(type: typeof Column.EVENT_GROUP_RENDERER_TYPE_CHANGED, listener: typeof groupRendererChanged | null): this;
  on(type: typeof Column.EVENT_SUMMARY_RENDERER_TYPE_CHANGED, listener: typeof summaryRendererChanged | null): this;
  on(type: typeof Column.EVENT_VISIBILITY_CHANGED, listener: typeof visibilityChanged | null): this;
  on(type: string | string[], listener: IEventListener | null): this; // required for correct typings in *.d.ts
  on(type: string | string[], listener: IEventListener | null): this {
    return super.on(<any>type, listener);
  }

  getValues(row: IDataRow) {
    return this.getLinks(row).map((d) => d ? d.href : '');
  }

  getLabels(row: IDataRow) {
    return this.getLinks(row).map((d) => d ? d.alt : '');
  }

  private transformValue(v: any, row: IDataRow, i: number) {
    if (v == null || v === '') {
      return null;
    }
    if (typeof v === 'string') {
      if (!this.pattern) {
        return {
          alt: v,
          href: v
        };
      }
      if (!this.patternFunction) {
        this.patternFunction = patternFunction(this.pattern, 'item', 'index');
      }
      return {
        alt: v,
        href: this.patternFunction.call(this, v, row.v, i)
      };
    }
    return v;
  }

  getLinks(row: IDataRow): ILink[] {
    return super.getValues(row).map((v, i) => {
      return this.transformValue(v, row, i);
    });
  }

  dump(toDescRef: (desc: any) => any): any {
    const r = super.dump(toDescRef);
    if (this.pattern !== (<any>this.desc).pattern) {
      r.pattern = this.pattern;
    }
    return r;
  }

  restore(dump: any, factory: (dump: any) => Column | null) {
    if (dump.pattern) {
      this.pattern = dump.pattern;
    }
    super.restore(dump, factory);
  }
}
