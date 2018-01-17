/**
 * Created by sam on 04.11.2016.
 */

import Column from './Column';
import StringColumn, {IStringColumnDesc} from './StringColumn';
import {isMissingValue} from './missing';


export interface ILinkDesc {
  /**
   * link pattern to use, where $1 will be replaced with the actual value
   */
  link?: string;

  /**
   * optional list of templates
   */
  templates?: string[];
}

export declare type ILinkColumnDesc = ILinkDesc & IStringColumnDesc;

/**
 * a string column in which the label is a text but the value a link
 */
export default class LinkColumn extends StringColumn {
  static readonly EVENT_LINK_CHANGED = 'linkChanged';
  /**
   * a pattern used for generating the link, $1 is replaced with the actual value
   * @type {null}
   */
  private link: string | null = null;

  constructor(id: string, desc: ILinkColumnDesc) {
    super(id, desc);
    this.link = desc.link || null;
  }

  get headerCssClass() {
    return this.link == null ? 'link' : 'link link_pattern';
  }

  protected createEventList() {
    return super.createEventList().concat([LinkColumn.EVENT_LINK_CHANGED]);
  }

  setLink(link: string) {
    /* tslint:disable */
    if (link == this.link) { /*== on purpose*/
      return;
    }
    /* tslint:enable */
    this.fire([LinkColumn.EVENT_LINK_CHANGED, Column.EVENT_DIRTY_HEADER, Column.EVENT_DIRTY_VALUES, Column.EVENT_DIRTY], this.link, this.link = link);
  }

  getLink() {
    return this.link || '';
  }

  dump(toDescRef: (desc: any) => any): any {
    const r = super.dump(toDescRef);
    /* tslint:disable */
    if (this.link != (<any>this.desc).link) {
      r.link = this.link;
    }
    /* tslint:enable */
    return r;
  }

  restore(dump: any, factory: (dump: any) => Column | null) {
    super.restore(dump, factory);
    if (dump.link) {
      this.link = dump.link;
    }
  }

  getLabel(row: any, index: number) {
    const v: any = super.getRaw(row, index);
    if (v && v.alt) {
      return v.alt;
    }
    return String(v);
  }

  isLink(row: any, index: number) {
    //get original value
    const v: any = super.getRaw(row, index);
    //convert to link
    return !isMissingValue(v) && (v.href != null || this.link);
  }

  getValue(row: any, index: number) {
    //get original value
    const v: any = super.getRaw(row, index);
    //convert to link
    if (v && v.href) {
      return v.href;
    }
    if (this.link) {
      return this.link
        .replace(/\$1/g, v || '')
        .replace(/\$2/g, encodeURIComponent(v || ''));
    }
    return v;
  }
}
