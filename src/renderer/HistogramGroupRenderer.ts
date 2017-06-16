import {IGroupRendererFactory} from './ICellRendererFactory';
import Column from '../model/Column';
import {INumberColumn} from '../model/NumberColumn';
import {IDOMRenderContext} from './RendererContexts';
import {ISVGGroupRenderer} from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import {IGroup} from '../model/Group';
import * as d3 from 'd3';


/**
 * a renderer rendering a bar for numerical columns
 */
export default class HistogramGroupRenderer implements IGroupRendererFactory {

  createSVG(col: INumberColumn & Column, context: IDOMRenderContext): ISVGGroupRenderer {
    const gen = d3.layout.histogram().range([0,1]);
    const scale = d3.scale.linear().domain([0, 1]).range([0, col.getWidth()]);
    return {
      template: `<g class='histogram'></g>`,
      update: (n: SVGGElement, group: IGroup, rows: IDataRow[]) => {
        const values = rows.map((d) => col.getValue(d.v, d.dataIndex));
        const bins = gen(values);
        const height = context.groupHeight(group);
        const yscale = d3.scale.linear().domain([0, d3.max(bins, (d) => d.y)]).range([height, 0]);
        const bars = d3.select(n).selectAll('rect').data(bins);
        bars.enter().append('rect');
        bars.attr({
          x: (d) => scale(d.x),
          y: (d) => yscale(d.y),
          width: (d) => scale(bins[0].dx),
          height: (d) => height - yscale(d.y)
        });
      }
    };
  }
}
