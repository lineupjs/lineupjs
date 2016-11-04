/**
 * Created by Samuel Gratzl on 14.08.2015.
 */

import {Selection} from 'd3';
import DataProvider from '../provider/ADataProvider';
import {createHTML} from '../renderer';
import {ISlicer} from './ABodyRenderer';
import ADOMBodyRenderer, {} from './ADOMBodyRenderer';

const domHTMLMappings = {
  root: 'div',
  g: 'div',

  setSize: (n: HTMLElement, width: number, height: number) => {
    n.style.width = width + 'px';
    n.style.height = height + 'px';
  },

  bg: 'div',
  updateBG: (sel: Selection<any>, callback: (d: any, i: number, j: number) => [number, number]) => {
    sel.style({
      height: (d, i, j?) => callback(d, i, j)[1] + 'px',
      width: (d, i, j?) => callback(d, i, j)[0] + 'px'
    });
  },
  meanLine: 'div',
  updateMeanLine: ($mean: Selection<any>, x: number, height: number) => {
    $mean.style('left', x + 'px').style('height', height + 'px');
  },
  slopes: 'svg',
  updateSlopes: ($slopes: Selection<any>, width: number, height: number, callback: (d, i) => number) => {
    $slopes.attr('width', width).attr('height', height).style('left', (d, i)=>callback(d, i) + 'px');
  },

  creator: createHTML,
  translate: (n: HTMLElement, x: number, y: number) => n.style.transform = `translate(${x}px,${y}px)`,
  transform: (sel: Selection<any>, callback: (d: any, i: number)=> [number,number]) => {
    sel.style('transform', (d, i) => {
      const r = callback(d, i);
      return `translate(${r[0]}px,${r[1]}px)`;
    });
  }
};

export default class HTMLBodyRenderer extends ADOMBodyRenderer {
  constructor(data: DataProvider, parent: Element, slicer: ISlicer, options = {}) {
    super(data, parent, slicer, domHTMLMappings, options);
  }
}
