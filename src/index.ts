/**
 * main module of LineUp.js containing the main class and exposes all other modules
 * Created by Samuel Gratzl on 14.08.2015.
 */

import './style.scss';
import {ILineUpOptions} from './ui/LineUp';
import * as provider_ from './provider';
import LineUp from './ui/LineUp';
export * from './common';
export {default} from './ui/LineUp';


export function create(container: HTMLElement, data: provider_.DataProvider, config: Partial<ILineUpOptions> = {}) {
  return new LineUp(container, data, config);
}
