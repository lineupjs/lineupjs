/**
 * main module of LineUp.js containing the main class and exposes all other modules
 * Created by Samuel Gratzl on 14.08.2015.
 */

import './taggle.scss';
export * from './common';
import Taggle, {ITaggleOptions} from './ui/taggle';
import ADataProvider from './provider/ADataProvider';
export {default, ITaggleOptions} from './ui/taggle';

export function createTaggle(container: HTMLElement, data: ADataProvider, config: Partial<ITaggleOptions> = {}) {
  return new Taggle(container, data, config);
}

export function create(container: HTMLElement, data: ADataProvider, config: Partial<ITaggleOptions> = {}) {
  return new Taggle(container, data, config);
}
