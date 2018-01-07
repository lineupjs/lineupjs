import LineUp from '../ui/LineUp';
import Taggle from '../ui/taggle/Taggle';
import {derive} from './DataBuilder';
import LineUpBuilder from './LineUpBuilder';

export {data, derive, default as DataBuilder} from './DataBuilder';
export {default as ColumnBuilder} from './ColumnBuilder';
export {default as LineUpBuilder} from './LineUpBuilder';


/**
 * build a new Taggle instance in the given node for the given data
 * @param {HTMLElement} node
 * @param {any[]} data
 * @returns {Taggle}
 */
export function asTaggle(node: HTMLElement, data: any[]): Taggle {
  return new LineUpBuilder().buildTaggle(node, derive(data).defaultRanking().build());
}

/**
 * build a new LineUp instance in the given node for the given data
 * @param {HTMLElement} node
 * @param {any[]} data
 * @returns {LineUp}
 */
export function asLineUp(node: HTMLElement, data: any[]): LineUp {
  return new LineUpBuilder().buildLineUp(node, derive(data).defaultRanking().build());
}
