/**
 * Created by Samuel Gratzl on 14.08.2015.
 */

import DataProvider from '../provider/ADataProvider';
import {IRenderingOptions} from '../lineup';
import {AEventDispatcher} from '../utils';
import EngineRenderer from './engine/EngineRenderer';
import SeparatedRenderer from './SeparatedRenderer';

export {default as HeaderRenderer, IRankingHook} from './HeaderRenderer';
export {default as PoolRenderer, IPoolRendererOptions} from './PoolRenderer';
export {ISlicer, IBodyRenderer} from './ABodyRenderer';

export interface ILineUpRenderer extends AEventDispatcher {
  destroy(): void;

  update(): void;

  changeDataStorage(data: DataProvider): void;

  scrollIntoView(length: number, index: number): void;

  fakeHover(index: number): void;

  setBodyOption(option: keyof IRenderingOptions, value: boolean): void;
}

export function createRenderer(type = 'svg', data: DataProvider, parent: Element, options: any = {}): ILineUpRenderer {
  if (type === 'engine') {
    return new EngineRenderer(data, parent, options);
  }
  return new SeparatedRenderer(data, parent, options, type);
}
