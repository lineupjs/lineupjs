/**
 * Created by Samuel Gratzl on 14.08.2015.
 */

import model = require('./model');

/**
 * context for rendering, wrapped as an object for easy extensibility
 */
export interface IRenderContext {
  /**
   * the y position of the cell
   * @param index
   */
  cellY(index:number) : number;
  /**
   * the x position of the cell
   * @param index
   */
  cellX(index:number): number;
  /**
   * the height of a row
   * @param index
   */
  rowHeight(index:number) : number;
  /**
   * a key function for uniquely identifying a data row
   * @param d
   * @param i
   */
  rowKey(d:any, i:number): string;

  /**
   * factory function for resolving the renderer for a given column
   * @param col
   */
  renderer(col:model.Column): ICellRenderer;

  /**
   * internal option flags
   * @param col
   */
  showStacked(col:model.StackColumn): boolean;

  /**
   * prefix used for all generated id names
   */
  idPrefix: string;

  animated<T>($sel: d3.Selection<T>) : any;
}

/**
 * a cell renderer for rendering a cell of specific column
 */
export interface ICellRenderer {
  /**
   * render a whole column at once
   * @param $col the column container
   * @param col the column to render
   * @param rows the data rows
   * @param context render context
   */
  render($col:d3.Selection<any>, col:model.Column, rows:any[], context:IRenderContext);
  /**
   * show the values and other information for the selected row
   * @param $col the column
   * @param $row the corresponding row container in which tooltips should be stored
   * @param col the column to render
   * @param row the row to show
   * @param index the index of the row in the column
   * @param context render context
   */
  mouseEnter($col:d3.Selection<any>, $row:d3.Selection<any>, col:model.Column, row:any, index:number, context:IRenderContext);
  /**
   * hide the values and other information for the selected row
   * @param $col the column
   * @param $row the corresponding row container in which tooltips should be stored
   * @param col the column to render
   * @param row the row to show
   * @param index the index of the row in the column
   * @param context render context
   */
  mouseLeave($col:d3.Selection<any>, $row:d3.Selection<any>, col:model.Column, row:any, index:number, context:IRenderContext);
}

/**
 * default renderer instance rendering the value as a text
 */
export class DefaultCellRenderer implements ICellRenderer {
  /**
   * class to append to the text elements
   * @type {string}
   */
  textClass = 'text';
  align: string = 'left';

  render($col:d3.Selection<any>, col:model.Column, rows:any[], context:IRenderContext) {
    var $rows = $col.datum(col).selectAll('text.' + this.textClass).data(rows, context.rowKey);

    $rows.enter().append('text').attr({
      'class': this.textClass,
      'clip-path': 'url(#' + context.idPrefix + 'clipCol' + col.id + ')'
    });

    context.animated($rows).attr({
      x: (d, i) => context.cellX(i) + (this.align === 'right' ? col.getWidth() - 5 : 0),
      y: (d, i) => context.cellY(i),
      'data-index': (d, i) => i
    }).text((d) => col.getLabel(d));

    $rows.exit().remove();
  }

  /**
   * resolves the cell in the column for a given row
   * @param $col
   * @param index
   * @return {Selection<Datum>}
   */
  findRow($col:d3.Selection<any>, index: number) {
    return $col.selectAll('text.' + this.textClass+'[data-index="'+index+'"]');
  }

  mouseEnter($col:d3.Selection<any>, $row:d3.Selection<any>, col:model.Column, row:any, index:number, context:IRenderContext) {
    var rowNode = <Node>$row.node();
    //find the right one and
    var n = <Node>this.findRow($col, index).node();
    if (n) { //idea since it is just a text move the dom element from the column to the row
      rowNode.appendChild(n);
    }
  }

  mouseLeave($col:d3.Selection<any>, $row:d3.Selection<any>, col:model.Column, row:any, index:number, context:IRenderContext) {
    var colNode = <Node>$col.node();
    var rowNode = <Node>$row.node();
    //move back
    if (rowNode.hasChildNodes()) {
      colNode.appendChild(rowNode.firstChild);
    }
    $row.selectAll('*').remove();
  }

}

/**
 * simple derived one where individual elements can be overridden
 */
class DerivedCellRenderer extends DefaultCellRenderer {
  constructor(extraFuncs:any) {
    super();
    Object.keys(extraFuncs).forEach((key) => {
      this[key] = extraFuncs[key];
    });
  }
}

export class BarCellRenderer extends DefaultCellRenderer {
  render($col:d3.Selection<any>, col:model.NumberColumn, rows:any[], context:IRenderContext) {
    var $rows = $col.datum(col).selectAll('rect.bar').data(rows, context.rowKey);
    $rows.enter().append('rect').attr('class', 'bar').style('fill', col.color);
    context.animated($rows).attr({
      x: (d, i) => context.cellX(i),
      y: (d, i) => context.cellY(i) + 1,
      height: (d, i) => context.rowHeight(i) - 2,
      width: (d) => col.getWidth() * col.getValue(d),
      'data-index': (d, i) => i
    }).style({
      fill: (d,i) => this.colorOf(d, i, col)
    });
    $rows.exit().remove();
  }

  colorOf(d: any, i: number, col: model.Column) {
    return col.color;
  }

  findRow($col:d3.Selection<any>, index:number) {
    return $col.selectAll('rect.bar[data-index="' + index + '"]');
  }

  mouseEnter($col:d3.Selection<any>, $row:d3.Selection<any>, col:model.Column, row:any, index:number, context:IRenderContext) {
    var rowNode = this.findRow($col, index);
    if (!rowNode.empty()) {
      (<Node>$row.node()).appendChild(<Node>(rowNode.node()));
      $row.append('text').datum(rowNode.datum()).attr({
        'class': 'number',
        'clip-path': 'url(#' + context.idPrefix + 'clipCol' + col.id + ')',
        x: context.cellX(index),
        y: context.cellY(index)
      }).text((d) => col.getLabel(d));
    }
  }
}

class DerivedBarCellRenderer extends BarCellRenderer {
  constructor(extraFuncs:any) {
    super();
    Object.keys(extraFuncs).forEach((key) => {
      this[key] = extraFuncs[key];
    });
  }
}

var defaultRendererInstance = new DefaultCellRenderer();
var barRendererInstance = new BarCellRenderer();

/**
 * creates a new instance with optional overridden methods
 * @param extraFuncs
 * @return {DefaultCellRenderer}
 */
export function defaultRenderer(extraFuncs?:any) {
  if (!extraFuncs) {
    return defaultRendererInstance;
  }
  return new DerivedCellRenderer(extraFuncs);
}

export function barRenderer(extraFuncs?: any) {
  if (!extraFuncs) {
    return barRendererInstance;
  }
  return new DerivedBarCellRenderer(extraFuncs);
}

class LinkCellRenderer extends DefaultCellRenderer {
  render($col:d3.Selection<any>, col:model.LinkColumn, rows:any[], context:IRenderContext) {
    //wrap the text elements with an a element
    var $rows = $col.datum(col).selectAll('a.link').data(rows, context.rowKey);
    $rows.enter().append('a').attr({
      'class': 'link',
      'target': '_blank'
    }).append('text').attr({
      'class': 'text',
      'clip-path': 'url(#' + context.idPrefix + 'clipCol' + col.id + ')'
    });
    context.animated($rows).attr({
      'xlink:href': (d) => col.getValue(d),
      'data-index': (d, i) => i
    }).select('text').attr({
      x: (d, i) => context.cellX(i),
      y: (d, i) => context.cellY(i)
    }).text((d) => col.getLabel(d));
    $rows.exit().remove();
  }

  findRow($col:d3.Selection<any>, index:number) {
    return $col.selectAll('a.link[data-index="' + index + '"]');
  }
}

class CategoricalRenderer extends DefaultCellRenderer {
  textClass = 'cat';

  render($col:d3.Selection<any>, col:model.CategoricalColumn, rows:any[], context:IRenderContext) {
    var $rows = $col.datum(col).selectAll('g.' + this.textClass).data(rows, context.rowKey);

    var $rows_enter = $rows.enter().append('g').attr({
      'class': this.textClass
    });
    $rows_enter.append('text').attr({
      'clip-path': 'url(#' + context.idPrefix + 'clipCol' + col.id + ')'
    });
    $rows_enter.append('rect').attr({
      y: 1
    });
    var $update = context.animated($rows).attr({
      'data-index': (d, i) => i,
      transform: (d, i) => 'translate(' + context.cellX(i) + ',' + context.cellY(i) + ')'
    });
    $update.select('text').attr({
      x: (d,i) => context.rowHeight(i)
    }).text((d) => col.getLabel(d));
    $update.select('rect').style({
      fill: (d) => col.getColor(d)
    }).attr({
      height: (d,i) => Math.max(context.rowHeight(i)-2,0),
      width: (d,i) => Math.max(context.rowHeight(i)-2,0),
    });

    $rows.exit().remove();
  }

  findRow($col:d3.Selection<any>, index:number) {
    return $col.selectAll('g.' + this.textClass + '[data-index="' + index + '"]');
  }
}

class StackCellRenderer extends DefaultCellRenderer {
  renderImpl($col:d3.Selection<any>, col:model.StackColumn, context:IRenderContext, perChild:($child:d3.Selection<model.Column>, col:model.Column, i: number, context:IRenderContext) => void, rowGetter:(index:number) => any) {
    var $group = $col.datum(col),
      children = col.children,
      offset = 0,
      shifts = children.map((d) => {
        var r = offset;
        offset += d.getWidth();
        return r;
      });

    var bak = context.cellX;
    if (!context.showStacked(col)) {
      context.cellX = () => 0;
    }

    var $children = $group.selectAll('g.component').data(children);
    $children.enter().append('g').attr({
      'class': 'component'
    });
    $children.attr({
      'class': (d) => 'component ' + d.desc.type,
      'data-index': (d,i) => i
    }).each(function (d, i) {
      if (context.showStacked(col)) {
        var preChildren = children.slice(0, i);
        context.cellX = (index) => {
          //shift by all the empty space left from the previous columns
          return -preChildren.reduce((prev, child) => prev + child.getWidth() * (1 - child.getValue(rowGetter(index))), 0);
        };
      }
      perChild(d3.select(this), d, i, context);
    });
    context.animated($children).attr({
      transform: (d, i) => 'translate(' + shifts[i] + ',0)'
    });
    $children.exit().remove();

    context.cellX = bak;
  }
  render($col:d3.Selection<any>, col:model.StackColumn, rows:any[], context:IRenderContext) {
    this.renderImpl($col, col, context, ($child, col, i, ccontext) => {
      ccontext.renderer(col).render($child, col, rows, ccontext);
    }, (index) => rows[index]);
  }
  mouseEnter($col:d3.Selection<any>, $row:d3.Selection<any>, col:model.StackColumn, row:any, index:number, context:IRenderContext) {
    this.renderImpl($row, col, context, ($row_i, col, i, ccontext) => {
      var $col_i = $col.selectAll('g.component[data-index="'+i+'"]');
      ccontext.renderer(col).mouseEnter($col_i, $row_i, col, row, index, ccontext);
    }, (index) => row);
  }
  mouseLeave($col:d3.Selection<any>, $row:d3.Selection<any>, col:model.StackColumn, row:any, index:number, context:IRenderContext) {
    this.renderImpl($row, col, context, ($row_i, d, i, ccontext) => {
      var $col_i = $col.selectAll('g.component[data-index="'+i+'"]');
      ccontext.renderer(d).mouseLeave($col_i, $row_i, d, row, index, ccontext);
    }, (index) => row);
    $row.selectAll('*').remove();
  }
}

/**
 * returns a map of all known renderers by type
 * @return
 */
export function renderers() {
  return {
    string: defaultRenderer(),
    link: new LinkCellRenderer(),
    number: barRenderer(),
    rank: defaultRenderer({
      textClass: 'rank',
      align: 'right'
    }),
    stack: new StackCellRenderer(),
    categorical: new CategoricalRenderer(),
    ordinal: barRenderer({
      colorOf: (d, i, col) => col.getColor(d)
    })
  };
}
