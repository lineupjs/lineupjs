import LineUp from '../ui/LineUp';
import Taggle from '../ui/taggle/Taggle';
import { builder } from './DataBuilder';

export * from './DataBuilder';
export * from './column';
export * from './RankingBuilder';
export * from './adapter';

/**
 * build a new Taggle instance in the given node for the given data
 * @param {HTMLElement} node DOM node to attach to
 * @param {any[]} data data to visualize
 * @param {string[]} columns optional enforced column order
 * @returns {Taggle}
 */
export function asTaggle(node: HTMLElement, data: any[], ...columns: string[]): Taggle {
  return builder(data)
    .deriveColumns(...columns)
    .deriveColors()
    .defaultRanking()
    .buildTaggle(node);
}

/**
 * build a new LineUp instance in the given node for the given data
 * @param {HTMLElement} node DOM node to attach to
 * @param {any[]} data data to visualize
 * @param {string[]} columns optional enforced column order
 * @returns {LineUp}
 */
export function asLineUp(node: HTMLElement, data: any[], ...columns: string[]): LineUp {
  return builder(data)
    .deriveColumns(...columns)
    .deriveColors()
    .defaultRanking()
    .build(node);
}
