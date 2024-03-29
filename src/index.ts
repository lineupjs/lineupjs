/**
 * main module of LineUp.js containing the main class and exposes all other modules
 */

import type { IColumnDesc } from './model';
import { DataProvider, LocalDataProvider, type ILocalDataProviderOptions } from './provider';
import { LineUp, Taggle } from './ui';
import type { ILineUpOptions, ITaggleOptions } from './config';

export * from './builder';
export * from './config';
export { default as AEventDispatcher } from './internal/AEventDispatcher';
export type { IEventContext, IEventHandler, IEventListener } from './internal/AEventDispatcher';
export type { ISequence, IForEachAble } from './internal/interable';
export type { ILookUpArray } from './internal/math';
export * from './internal/mathInterfaces';
export * from './model';
export * from './provider';
export * from './renderer';
export * from './ui';
export { LineUp as default } from './ui';

export function createLocalDataProvider(
  data: any[],
  columns: IColumnDesc[],
  options: Partial<ILocalDataProviderOptions> = {}
) {
  return new LocalDataProvider(data, columns, options);
}

/**
 *
 * @param container the html element lineup should be built in
 * @param data the data provider
 * @param config lineup configuration overrides
 * @returns the created lineup instance
 */
export function createLineUp(container: HTMLElement, data: DataProvider, config: Partial<ILineUpOptions> = {}) {
  return new LineUp(container, data, config);
}

export function createTaggle(container: HTMLElement, data: DataProvider, config: Partial<ITaggleOptions> = {}) {
  return new Taggle(container, data, config);
}
