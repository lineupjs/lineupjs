/**
 * main module of LineUp.js containing the main class and exposes all other modules
 * Created by Samuel Gratzl on 14.08.2015.
 */

import './style.scss';
import ADataProvider from './provider/ADataProvider';
import {ITaggleOptions} from './ui/taggle';
import Taggle from './ui/taggle';
import * as model_ from './model';
import * as provider_ from './provider';
import * as renderer_ from './renderer';
import * as ui_ from './ui';
import LineUp, {ILineUpOptions} from './ui/LineUp';

export {deriveColors} from './provider/utils';
export {deriveColumnDescriptions} from './provider';
export {default as LocalDataProvider} from './provider/LocalDataProvider';
export {default as LineUp, ILineUpOptions} from './ui/LineUp';
export {default as Taggle, ITaggleOptions} from './ui/taggle';
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
 * access to the ui module
 */
export const ui = ui_;

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

export function createLineUp(container: HTMLElement, data: provider_.DataProvider, config: Partial<ILineUpOptions> = {}) {
  return new LineUp(container, data, config);
}

export function createTaggle(container: HTMLElement, data: ADataProvider, config: Partial<ITaggleOptions> = {}) {
  return new Taggle(container, data, config);
}
