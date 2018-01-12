import ICellRendererFactory from './ICellRendererFactory';
import {ICanvasGroupRenderer} from './ICanvasCellRenderer';
import {IDOMGroupRenderer} from './IDOMCellRenderers';
import Column from '../model/Column';

/**
 * helper class that renders nothing for a group
 */
export abstract class ANoGroupRenderer implements ICellRendererFactory {
  abstract readonly title: string;
  abstract canRender(col: Column, asGroup: boolean): boolean;

  createGroupDOM(): IDOMGroupRenderer {
    return {
      template: `<div></div>`,
      update: () => undefined
    };
  }

  createGroupCanvas(): ICanvasGroupRenderer {
    return () => undefined;
  }
}

export default ANoGroupRenderer;
