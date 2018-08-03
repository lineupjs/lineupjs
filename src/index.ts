/**
 * main module of LineUp.js containing the main class and exposes all other modules
 */

import './style.scss';
import {IColumnDesc} from './model';
import {ILocalDataProviderOptions} from './provider';
import ADataProvider from './provider/ADataProvider';
import LocalDataProvider from './provider/LocalDataProvider';
import LineUp, {ILineUpOptions} from './ui/LineUp';
import Taggle, {ITaggleOptions} from './ui/taggle';

export * from './provider';
export * from './renderer';
export * from './model';
export * from './builder';
export * from './ui';
export * from './interfaces';
export * from './config';
export {default} from './ui/LineUp';
export {IBoxPlotData, IAdvancedBoxPlotData, IStatistics, ICategoricalBin, ICategoricalStatistics, INumberBin} from './internal/math';


declare const __VERSION__: string;
declare const __BUILD_ID__: string;
declare const __LICENSE__: string;
/**
 * LineUp version
 * @type {string}
 */
export const version = __VERSION__;
/**
 * LineUp unique build id
 * @type {string}
 */
export const buildId = __BUILD_ID__;
/**
 * LineUp license type
 * @type {string}
 */
export const license = __LICENSE__;


export function createLocalDataProvider(data: any[], columns: IColumnDesc[], options: Partial<ILocalDataProviderOptions> = {}) {
  return new LocalDataProvider(data, columns, options);
}

/**
 *
 * @param container the html element lineup should be built in
 * @param data {ADataProvider} the data providier
 * @param config {Partial<ILineUpOptions>} lineup configuration overrides
 * @returns {LineUp} the created lineup instance
 */
export function createLineUp(container: HTMLElement, data: ADataProvider, config: Partial<ILineUpOptions> = {}) {
  return new LineUp(container, data, config);
}

export function createTaggle(container: HTMLElement, data: ADataProvider, config: Partial<ITaggleOptions> = {}) {
  return new Taggle(container, data, config);
}
