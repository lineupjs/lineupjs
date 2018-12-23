/**
 * main module of LineUp.js containing the main class and exposes all other modules
 */

import {IColumnDesc} from './model';
import {ILocalDataProviderOptions} from './provider';
import ADataProvider from './provider/ADataProvider';
import LocalDataProvider from './provider/LocalDataProvider';
import LineUp, {ILineUpOptions} from './ui/LineUp';
import Taggle, {ITaggleOptions} from './ui/taggle';

export * from './builder';
export {IDynamicHeight, ILineUpFlags, ILineUpLike, ILineUpOptions, ITaggleOptions, defaultOptions} from './config';
export * from './interfaces';
export {IAdvancedBoxPlotData, IBoxPlotData, ICategoricalBin, ICategoricalStatistics, INumberBin, IStatistics} from './internal/math';
export * from './model';
export * from './provider';
export * from './renderer';
export * from './ui';
export {default} from './ui/LineUp';


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
