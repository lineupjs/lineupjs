/**
 * main module of LineUp.js containing the main class and exposes all other modules
 */

import type { IColumnDesc } from './model';
import { DataProvider, DataProviderOptions } from './provider';
import { LineUp, Taggle } from './ui';
import type { ILineUpOptions, ITaggleOptions } from './config';

export * from './builder';
export * from './config';
export * from './internal/mathInterfaces';
export * from './model';
export * from './provider';
export * from './renderer';
export * from './ui';
export { LineUp as default } from './ui';

export function createDataProvider(data: any[], columns: IColumnDesc[], options: Partial<DataProviderOptions> = {}) {
  return new DataProvider(data, columns, options);
}

/**
 *
 * @param container the html element lineup should be built in
 * @param data {DataProvider} the data provider
 * @param config {Partial<ILineUpOptions>} lineup configuration overrides
 * @returns {LineUp} the created lineup instance
 */
export function createLineUp(container: HTMLElement, data: DataProvider, config: Partial<ILineUpOptions> = {}) {
  return new LineUp(container, data, config);
}

export function createTaggle(container: HTMLElement, data: DataProvider, config: Partial<ITaggleOptions> = {}) {
  return new Taggle(container, data, config);
}
