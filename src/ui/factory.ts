
import DataProvider from '../provider/ADataProvider';
import EngineRenderer from './engine/EngineRenderer';
import SeparatedRenderer from './SeparatedRenderer';
import {ILineUpRenderer} from './interfaces';

export function createRenderer(type = 'svg', data: DataProvider, parent: Element, options: any = {}): ILineUpRenderer {
  if (type === 'engine') {
    return new EngineRenderer(data, parent, options);
  }
  return new SeparatedRenderer(data, parent, options, type);
}
