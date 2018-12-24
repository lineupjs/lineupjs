/**
 * main module of LineUp.js containing the main class and exposes all other modules
 */

import {IColumnDesc} from './model';
import {DataProvider, LocalDataProvider, ILocalDataProviderOptions} from './provider';
import {LineUp, ILineUpOptions, Taggle, ITaggleOptions} from './ui';

export * from './builder';
export {defaultOptions} from './config';
export * from './interfaces';
export * from './internal/mathInterfaces';
export * from './model';
export * from './provider';
export * from './renderer';
export * from './ui';
export {default} from './ui';


export function createLocalDataProvider(data: any[], columns: IColumnDesc[], options: Partial<ILocalDataProviderOptions> = {}) {
  return new LocalDataProvider(data, columns, options);
}

/**
 *
 * @param container the html element lineup should be built in
 * @param data {DataProvider} the data providier
 * @param config {Partial<ILineUpOptions>} lineup configuration overrides
 * @returns {LineUp} the created lineup instance
 */
export function createLineUp(container: HTMLElement, data: DataProvider, config: Partial<ILineUpOptions> = {}) {
  return new LineUp(container, data, config);
}

export function createTaggle(container: HTMLElement, data: DataProvider, config: Partial<ITaggleOptions> = {}) {
  return new Taggle(container, data, config);
}
