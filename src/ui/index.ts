/**
 * Created by Samuel Gratzl on 14.08.2015.
 */

import {ISlicer, IBodyRenderer} from './ABodyRenderer';
import DataProvider from '../provider/ADataProvider';
import SVGBodyRenderer from './SVGBodyRenderer';
import HTMLBodyRenderer from './HTMLBodyRenderer';
import CanvasBodyRenderer from './CanvasBodyRenderer';

export {default as HeaderRenderer, IRankingHook, dummyRankingButtonHook} from './HeaderRenderer';
export {default as PoolRenderer, IPoolRendererOptions} from './PoolRenderer';
export {ISlicer, IBodyRenderer} from './ABodyRenderer';

export function createBodyRenderer(type = 'svg', data: DataProvider, parent: Element, slicer: ISlicer, options = {}): IBodyRenderer {
  switch (type) {
    case 'svg':
      return new SVGBodyRenderer(data, parent, slicer, options);
    case 'html':
      return new HTMLBodyRenderer(data, parent, slicer, options);
    case 'canvas':
      return new CanvasBodyRenderer(data, parent, slicer, options);
    default:
      return new SVGBodyRenderer(data, parent, slicer, options);
  }
}
