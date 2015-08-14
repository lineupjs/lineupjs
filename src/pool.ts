/**
 * Created by Samuel Gratzl on 14.08.2015.
 */


///<reference path='../typings/tsd.d.ts' />
import d3 = require('d3');
import utils = require('./utils');
import provider = require('./provider');

export class ColumnPool {
  private options = {
    layout: 'vertical',
    elemWidth: 100,
    elemHeight: 40,
    width: 100,
    height: 500,
    hideUsed: true
  };

  private $node:d3.Selection<any>;

  constructor(private data:provider.DataProvider, private columns:provider.IColumnDesc[], parent:Element, options:any = {}) {
    utils.merge(this.options, options);

    this.$node = d3.select(parent).append('div').classed('lu-pool',true);

    this.update();

    /*if (this.options.hideUsed) {
     data.on('addColumn.pool', (_, col:any) => {
     var desc:provider.IColumnDesc = col.desc;
     });
     } else {

     }*/
  }

  private update() {
    var $headers = this.$node.selectAll('div.header').data(this.columns, (d) => d.label);
    var $headers_enter = $headers.enter().append('div').attr({
      'class': 'header',
      'draggable': true
    }).on('dragstart', (d) => {
      var e = <DragEvent>(<any>d3.event);
      e.dataTransfer.effectAllowed = 'copyMove'; //none, copy, copyLink, copyMove, link, linkMove, move, all
      e.dataTransfer.setData('text/plain', d.label);
      e.dataTransfer.setData('application/caleydo-lineup-column', JSON.stringify(d));
    });
    $headers_enter.append('span').classed('label',true);
    $headers.attr('transform', (d, i) => {
      var pos = this.layout(i);
      return 'translate(' + pos.x + ',' + pos.y + ')';
    });
    $headers.select('span').text((d) => d.label);
    $headers.exit().remove();
  }

  private layout(i:number) {
    switch (this.options.layout) {
      case 'horizontal':
        return {x: i * this.options.elemWidth, y: 0};
      case 'grid':
        var perRow = d3.round(this.options.width / this.options.elemWidth, 0);
        return {x: (i % perRow) * this.options.elemWidth, y: d3.round(i / perRow, 0) * this.options.elemHeight};
      case 'vertical':
      default:
        return {x: 0, y: i * this.options.elemHeight};
    }
  }
}

