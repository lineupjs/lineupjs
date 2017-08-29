import ICellRendererFactory from './ICellRendererFactory';
import {ICanvasGroupRenderer} from './ICanvasCellRenderer';
import {IDOMGroupRenderer} from './IDOMCellRenderers';

/**
 * helper class that renders nothing for a group
 */
export abstract class ANoGroupRenderer implements ICellRendererFactory {
  createGroupDOM(): IDOMGroupRenderer {
    return {
      template: ``,
      update: () => undefined
    };
  }

  createGroupCanvas(): ICanvasGroupRenderer {
    return () => undefined;
  }
}

export default ANoGroupRenderer;
