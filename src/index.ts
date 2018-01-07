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

declare const __VERSION__: string;
declare const __BUILD_ID__: string;
export const version = __VERSION__;
export const buildId = __BUILD_ID__;

/**
 * creates a local storage provider
 * @param data
 * @param columns
 * @param options
 * @returns {LocalDataProvider}
 */
export function createLocalDataProvider(data: any[], columns: IColumnDesc[], options: Partial<ILocalDataProviderOptions> = {}): LocalDataProvider {
  return new LocalDataProvider(data, columns, options);
}

export function createLineUp(container: HTMLElement, data: ADataProvider, config: Partial<ILineUpOptions> = {}) {
  return new LineUp(container, data, config);
}

export function createTaggle(container: HTMLElement, data: ADataProvider, config: Partial<ITaggleOptions> = {}) {
  return new Taggle(container, data, config);
}
