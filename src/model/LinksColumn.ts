import { toolbar } from './annotations';
import ArrayColumn, { type IArrayColumnDesc } from './ArrayColumn';
import type {
  widthChanged,
  labelChanged,
  metaDataChanged,
  dirty,
  dirtyHeader,
  dirtyValues,
  rendererTypeChanged,
  groupRendererChanged,
  summaryRendererChanged,
  visibilityChanged,
  dirtyCaches,
} from './Column';
import Column from './Column';
import type { dataLoaded } from './ValueColumn';
import type ValueColumn from './ValueColumn';
import type { IColumnDump, IDataRow, ITypeFactory } from './interfaces';
import { patternFunction, integrateDefaults } from './internal';
import { EAlignment } from './StringColumn';
import type { IEventListener } from '../internal';
import LinkColumn, { type ILink, type ILinkDesc } from './LinkColumn';
import { restoreValue } from './diff';

export declare type ILinksColumnDesc = ILinkDesc & IArrayColumnDesc<string | ILink>;

/**
 * emitted when the pattern property changes
 * @asMemberOf LinksColumn
 * @event
 */
export declare function patternChanged_LCS(previous: string, current: string): void;

@toolbar('rename', 'search', 'editPattern')
export default class LinksColumn extends ArrayColumn<string | ILink> {
  static readonly EVENT_PATTERN_CHANGED = LinkColumn.EVENT_PATTERN_CHANGED;

  readonly alignment: EAlignment;
  readonly escape: boolean;
  private pattern: string;
  private patternFunction: (value: string, raw: any, index: number) => string | null = null;
  readonly patternTemplates: string[];

  constructor(id: string, desc: Readonly<ILinksColumnDesc>) {
    super(
      id,
      integrateDefaults(desc, {
        width: 200,
      })
    );
    this.alignment = desc.alignment ?? EAlignment.left;
    this.escape = desc.escape !== false;
    this.pattern = desc.pattern ?? '';
    this.patternTemplates = desc.patternTemplates ?? [];
  }

  setPattern(pattern: string) {
    return LinkColumn.prototype.setPattern.call(this, pattern);
  }

  getPattern() {
    return this.pattern;
  }

  protected override createEventList() {
    return super.createEventList().concat([LinksColumn.EVENT_PATTERN_CHANGED]);
  }

  override on(type: typeof LinksColumn.EVENT_PATTERN_CHANGED, listener: typeof patternChanged_LCS | null): this;
  override on(type: typeof ValueColumn.EVENT_DATA_LOADED, listener: typeof dataLoaded | null): this;
  override on(type: typeof Column.EVENT_WIDTH_CHANGED, listener: typeof widthChanged | null): this;
  override on(type: typeof Column.EVENT_LABEL_CHANGED, listener: typeof labelChanged | null): this;
  override on(type: typeof Column.EVENT_METADATA_CHANGED, listener: typeof metaDataChanged | null): this;
  override on(type: typeof Column.EVENT_DIRTY, listener: typeof dirty | null): this;
  override on(type: typeof Column.EVENT_DIRTY_HEADER, listener: typeof dirtyHeader | null): this;
  override on(type: typeof Column.EVENT_DIRTY_VALUES, listener: typeof dirtyValues | null): this;
  override on(type: typeof Column.EVENT_DIRTY_CACHES, listener: typeof dirtyCaches | null): this;
  override on(type: typeof Column.EVENT_RENDERER_TYPE_CHANGED, listener: typeof rendererTypeChanged | null): this;
  override on(
    type: typeof Column.EVENT_GROUP_RENDERER_TYPE_CHANGED,
    listener: typeof groupRendererChanged | null
  ): this;
  override on(
    type: typeof Column.EVENT_SUMMARY_RENDERER_TYPE_CHANGED,
    listener: typeof summaryRendererChanged | null
  ): this;
  override on(type: typeof Column.EVENT_VISIBILITY_CHANGED, listener: typeof visibilityChanged | null): this;
  override on(type: string | string[], listener: IEventListener | null): this; // required for correct typings in *.d.ts
  override on(type: string | string[], listener: IEventListener | null): this {
    return super.on(type as any, listener);
  }

  override getValues(row: IDataRow) {
    return this.getLinks(row).map((d) => (d ? d.href : ''));
  }

  override getLabels(row: IDataRow) {
    return this.getLinks(row).map((d) => (d ? d.alt : ''));
  }

  private transformValue(v: any, row: IDataRow, i: number) {
    if (v == null || v === '') {
      return null;
    }
    if (typeof v === 'string') {
      if (!this.pattern) {
        return {
          alt: v,
          href: v,
        };
      }
      if (!this.patternFunction) {
        this.patternFunction = patternFunction(this.pattern, 'item', 'index');
      }
      return {
        alt: v,
        href: this.patternFunction.call(this, v, row.v, i),
      };
    }
    return v;
  }

  getLinks(row: IDataRow): ILink[] {
    return super.getValues(row).map((v, i) => {
      return this.transformValue(v, row, i);
    });
  }

  override toJSON() {
    const r = super.toJSON();
    r.pattern = this.pattern;
    return r;
  }

  override restore(dump: IColumnDump, factory: ITypeFactory): Set<string> {
    const changed = super.restore(dump, factory);
    this.pattern = restoreValue(dump.pattern, this.pattern, changed, [
      LinksColumn.EVENT_PATTERN_CHANGED,
      Column.EVENT_DIRTY_HEADER,
      Column.EVENT_DIRTY_VALUES,
      Column.EVENT_DIRTY_CACHES,
      Column.EVENT_DIRTY,
    ]);
    return changed;
  }
}
