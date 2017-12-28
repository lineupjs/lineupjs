/**
 * main module of LineUp.js containing the main class and exposes all other modules
 * Created by Samuel Gratzl on 14.08.2015.
 */

import * as model_ from './model';
import * as provider_ from './provider';
import * as renderer_ from './renderer/index';
import LineUp, {ILineUpConfig} from './ui/LineUp';

export {deriveColors} from './provider/utils';
export {deriveColumnDescriptions} from './provider';
/**
 * access to the model module
 */
export const model = model_;
/**
 * access to the provider module
 */
export const provider = provider_;
/**
 * access to the renderer module
 */
export const renderer = renderer_;

/**
 * creates a local storage provider
 * @param data
 * @param columns
 * @param options
 * @returns {LocalDataProvider}
 */
export function createLocalDataProvider(data: any[], columns: model_.IColumnDesc[], options: Partial<provider_.ILocalDataProviderOptions> = {}) {
  return new provider_.LocalDataProvider(data, columns, options);
}

export function createLineUp(data: provider_.DataProvider, container: HTMLElement, config: Partial<ILineUpConfig> = {}) {
  return new LineUp(container, data, config);
}



