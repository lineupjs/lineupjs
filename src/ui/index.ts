/**
 * Created by Samuel Gratzl on 14.08.2015.
 */

import {ISlicer, IBodyRenderer} from './ABodyRenderer';
import DataProvider from '../provider/ADataProvider';
import DOMBodyRenderer from './ADOMBodyRenderer';
import CanvasBodyRenderer from './CanvasBodyRenderer';

export {default as HeaderRenderer, IRankingHook, dummyRankingButtonHook} from './HeaderRenderer';
export {default as PoolRenderer, IPoolRendererOptions} from './PoolRenderer';
export {ISlicer, IBodyRenderer} from './ABodyRenderer';

export function createBodyRenderer(type = 'svg', data: DataProvider, parent: Element, slicer: ISlicer, options = {}): IBodyRenderer {
  switch (type) {
    case 'canvas':
      return new CanvasBodyRenderer(data, parent, slicer, options);
    default:
      return new DOMBodyRenderer(data, parent, slicer, options);
  }
}
