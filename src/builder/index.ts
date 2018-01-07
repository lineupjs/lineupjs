import LineUp from '../ui/LineUp';
import Taggle from '../ui/taggle/Taggle';
import {builder} from './DataBuilder';

export * from './DataBuilder';
export * from './column';
export * from './RankingBuilder';


/**
 * build a new Taggle instance in the given node for the given data
 * @param {HTMLElement} node
 * @param {any[]} data
 * @returns {Taggle}
 */
export function asTaggle(node: HTMLElement, data: any[]): Taggle {
  return builder(data)
    .deriveColumns()
    .deriveColors()
    .defaultRanking()
    .buildTaggle(node);
}

/**
 * build a new LineUp instance in the given node for the given data
 * @param {HTMLElement} node
 * @param {any[]} data
 * @returns {LineUp}
 */
export function asLineUp(node: HTMLElement, data: any[]): LineUp {
  return builder(data)
    .deriveColumns()
    .deriveColors()
    .defaultRanking()
    .build(node);
}
