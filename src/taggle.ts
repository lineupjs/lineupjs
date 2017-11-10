/**
 * main module of LineUp.js containing the main class and exposes all other modules
 * Created by Samuel Gratzl on 14.08.2015.
 */

import './taggle.scss';
import * as model_ from './model';
import * as provider_ from './provider';
import LineUp, {ILineUpConfig} from './lineup';
import Taggle, {ITaggleOptions} from './ui/taggle/index';

export {deriveColors} from './utils';
export {deriveColumnDescriptions} from './provider';
/**
 * access to the model module
 */
export const model = model_;

/**
 * creates a local storage provider
 * @param data
 * @param columns
 * @param options
 * @returns {LocalDataProvider}
 */
export function createLocalStorage(data: any[], columns: model_.IColumnDesc[], options: Partial<provider_.ILocalDataProviderOptions> = {}) {
  return new provider_.LocalDataProvider(data, columns, options);
}

export function createLineUp(data: provider_.DataProvider, container: HTMLElement, config: Partial<ILineUpConfig> = {}) {
  return new LineUp(container, data, config);
}

export function createTaggle(data: provider_.DataProvider, container: HTMLElement, config: Partial<ITaggleOptions> = {}) {
  return new Taggle(container, data, config);
}

