/**
 * main module of LineUp.js containing the main class and exposes all other modules
 * Created by Samuel Gratzl on 14.08.2015.
 */

import './style.scss';
import * as model_ from './model';
import * as provider_  from './provider';
import * as renderer_  from './renderer';
import * as ui_  from './ui';
import * as utils_  from './utils';
import * as ui_dialogs_ from './ui_dialogs';
import LineUp from './lineup';

export {deriveColors} from './lineup';
/**
 * access to the model module
 * @type {--global-type--}
 */
export const model = model_;
/**
 * access to the provider module
 * @type {--global-type--}
 */
export const provider = provider_;
/**
 * access to the renderer module
 * @type {--global-type--}
 */
export const renderer = renderer_;
/**
 * access to the ui module
 * @type {--global-type--}
 */
export const ui = ui_;
/**
 * access to the utils module
 * @type {--global-type--}
 */
export const utils = utils_;
/**
 * access to the ui_dialogs module
 * @type {--global-type--}
 */
export const ui_dialogs = ui_dialogs_;

/**
 * creates a local storage provider
 * @param data
 * @param columns
 * @param options
 * @returns {LocalDataProvider}
 */
export function createLocalStorage(data: any[], columns: model_.IColumnDesc[], options = {}) {
  return new provider_.LocalDataProvider(data, columns, options);
}

export function create(data: provider_.DataProvider, container: d3.Selection<any> | Element, config: any = {}) {
  return new LineUp(container, data, config);
}

