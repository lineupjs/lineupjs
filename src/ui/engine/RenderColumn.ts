/**
 * Created by Samuel Gratzl on 25.07.2017.
 */
import {IColumn} from 'lineupengine/src';
import Column from '../../model/Column';

export interface IRankingContext {

}

export default class RenderColumn implements IColumn {
  constructor(public readonly c: Column, public readonly index: number) {

  }

  get id() {
    return this.c.id;
  }

  get width() {
    return this.c.getWidth();
  }

  get frozen() {
    return false;
  }

  createHeader(document: Document, ctx: IRankingContext) {
    const node = document.createElement('div');

    return node;
  }

  updateHeader(node: HTMLElement, ctx: IRankingContext) {
    // TODO
  }

  createCell(index: number, document: Document, ctx: IRankingContext) {
    return document.createElement('div');
  }

  updateCell(node: HTMLElement, index: number, ctx: IRankingContext): HTMLElement|void {
    // TODO
  }
}
