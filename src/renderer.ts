/**
 * Created by Samuel Gratzl on 14.08.2015.
 */

import * as model from './model';
import * as d3 from 'd3';
/**
 * context for rendering, wrapped as an object for easy extensibility
 */
export interface IRenderContext {
  /**
   * the y position of the cell
   * @param index
   */
  cellY(index:number):number;

  /**
   * the previous y position of the cell
   * @param index
   */
  cellPrevY(index:number):number;
  /**
   * the x position of the cell
   * @param index
   */
  cellX(index:number):number;
  /**
   * the height of a row
   * @param index
   */
  rowHeight(index:number):number;
  /**
   * a key function for uniquely identifying a data row
   * @param d
   * @param i
   */
  rowKey(d:any, i:number):string;

  /**
   * factory function for resolving the renderer for a given column
   * @param col
   */
  renderer(col:model.Column):ICellRenderer;

  /**
   * render a column
   * @param col
   */
  render(col:model.Column, $this:d3.Selection<model.Column>, data:any[], context?:IRenderContext);
  renderCanvas(col:model.Column, ctx: CanvasRenderingContext2D, data:any[], context?:IRenderContext);

  /**
   * internal option flags
   * @param col
   */
  showStacked(col:model.Column):boolean;

  /**
   * prefix used for all generated id names
   */
  idPrefix:string;

  /**
   * wrapper for a d3 selection making it (optinally) to an animated transition
   * @param $sel
   */
  animated<T>($sel:d3.Selection<T>):any;

  /**
   * lookup custom options by key
   * @param key key to lookup
   * @param default_ default value
   */
  option<T>(key:string, default_:T):T;

  /**
   * whether to show the mean line for a given column
   * @param col
   */
  showMeanLine(col:model.Column):boolean;
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
  /**
   * the text alignment: left, center, right
   * @type {string}
   */
  align:string = 'left';

  render($col:d3.Selection<any>, col:model.Column, rows:any[], context:IRenderContext) {
    var $rows = $col.datum(col).selectAll('text.' + this.textClass).data(rows, context.rowKey);

    $rows.enter().append('text').attr({
      'class': this.textClass,
      'clip-path': 'url(#' + context.idPrefix + 'clipCol' + col.id + ')',
      y: (d, i) => context.cellPrevY(i)
    });

    var alignmentShift = 2;
    if (this.align === 'right') {
      alignmentShift = col.getWidth() - 5;
    } else if (this.align === 'center') {
      alignmentShift = col.getWidth() * 0.5;
    }

    $rows.attr({
      x: (d, i) => context.cellX(i) + alignmentShift,
      'data-index': (d, i) => i
    }).text((d) => col.getLabel(d));

    context.animated($rows).attr({
      y: (d, i) => context.cellY(i)
    });

    $rows.exit().remove();
  }

  /**
   * resolves the cell in the column for a given row
   * @param $col
   * @param index
   * @return {Selection<Datum>}
   */
  findRow($col:d3.Selection<any>, index:number) {
    return $col.selectAll('text.' + this.textClass + '[data-index="' + index + '"]');
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
    if (rowNode.hasChildNodes()&& colNode) {
      colNode.appendChild(rowNode.firstChild);
    }
    $row.selectAll('*').remove();
  }

  renderCanvas(ctx:CanvasRenderingContext2D, col:model.Column, rows:any[], context:IRenderContext) {
    ctx.save();
    ctx.textAlign = this.align;
    rows.forEach((row, i) => {
      const y = context.cellY(i);
      var alignmentShift = 2;
      if (this.align === 'right') {
        alignmentShift = col.getWidth() - 5;
      } else if (this.align === 'center') {
        alignmentShift = col.getWidth() * 0.5;
      }
      const x = context.cellX(i) + alignmentShift;
      ctx.fillText(col.getLabel(row), x, y, col.getWidth());
    });
    ctx.restore();
  }

  mouseEnterCanvas(ctx:CanvasRenderingContext2D, col:model.Column, row:any, index:number, context:IRenderContext) {
    //TODO
  }
}

/**
 * simple derived one where individual elements can be overridden
 */
class DerivedCellRenderer extends DefaultCellRenderer {
  constructor(extraFuncs:any) {
    super();
    //integrate all the extra functions
    Object.keys(extraFuncs).forEach((key) => {
      this[key] = extraFuncs[key];
    });
  }
}

/**
 * a renderer rendering a bar for numerical columns
 */
export class BarCellRenderer extends DefaultCellRenderer {
  /**
   * flag to always render the value
   * @type {boolean}
   */
  protected renderValue = false;

  render($col:d3.Selection<any>, col:model.NumberColumn, rows:any[], context:IRenderContext) {
    const renderValue = this.renderValue || context.option('renderBarValue', false);
    //map to bars
    var $rows = $col.datum(col).selectAll('.bar').data(rows, context.rowKey);

    const padding = context.option('rowPadding', 1);
    const renderBars = ($enter: d3.selection.Enter<any>, clazz: string, $update: d3.selection.Update<any>) => {
       $enter.append('rect').attr({
        'class': clazz,
        x: (d, i) => context.cellX(i),
        y: (d, i) => context.cellPrevY(i) + padding,
        width: (d) => {
          var n = col.getWidth() * col.getValue(d);
          return isNaN(n) ? 0 : n;
        }
      }).style('fill', col.color);

      $update.attr({
        height: (d, i) => context.rowHeight(i) - context.option('rowPadding', 1) * 2
      });

      context.animated($update).attr({
        x: (d, i) => context.cellX(i),
        y: (d, i) => context.cellY(i) + context.option('rowPadding', 1),
        width: (d) => {
          var n = col.getWidth() * col.getValue(d);
          return isNaN(n) ? 0 : n;
        }
      }).style({
        fill: (d, i) => this.colorOf(d, i, col)
      });
    };

    if (renderValue) {
      let $rows_enter = $rows.enter().append('g').attr('class', 'bar '+this.textClass);
      renderBars($rows_enter, col.cssClass, $rows.select('rect'));
      $rows_enter.append('text').attr({
        'class': 'number',
        'clip-path': 'url(#' + context.idPrefix + 'clipCol' + col.id + ')'
      });

      context.animated($rows.select('text').text((d) => col.getLabel(d)))
          .attr('transform', (d,i) => 'translate(' + context.cellX(i) + ',' + context.cellY(i) + ')');
    } else {
      renderBars($rows.enter(), 'bar ' + col.cssClass, $rows);
    }

    $rows.attr({
      'data-index': (d, i) => i,
    });

    $rows.exit().remove();
  }

  /**
   * computes the color for a given row
   * @param d the current row
   * @param i the row index
   * @param col the model column
   * @returns {string}
   */
  colorOf(d:any, i:number, col:model.Column) {
    return col.color;
  }

  findRow($col:d3.Selection<any>, index:number) {
    return $col.selectAll('.bar[data-index="' + index + '"]');
  }

  mouseEnter($col:d3.Selection<any>, $row:d3.Selection<any>, col:model.Column, row:any, index:number, context:IRenderContext) {
    const renderValue = this.renderValue || context.option('renderBarValue', false);
    if (renderValue) { //default behavior move everything
      return super.mouseEnter($col, $row, col, row, index, context);
    }
    var rowNode = this.findRow($col, index);
    if (!rowNode.empty()) {
      //create a text element on top
      (<Node>$row.node()).appendChild(<Node>(rowNode.node()));
      $row.append('text').datum(rowNode.datum()).attr({
        'class': 'number',
        'clip-path': 'url(#' + context.idPrefix + 'clipCol' + col.id + ')',
        transform: 'translate(' + context.cellX(index) + ',' + context.cellY(index) + ')'
      }).text((d) => col.getLabel(d));
    }
  }

  renderCanvas(ctx:CanvasRenderingContext2D, col:model.NumberColumn, rows:any[], context:IRenderContext) {
    const renderValue = this.renderValue || context.option('renderBarValue', false);
    const padding =context.option('rowPadding', 1);
    ctx.save();
    rows.forEach((d, i) => {
      const x = context.cellX(i);
      const y = context.cellY(i) + padding;
      const n = col.getWidth() * col.getValue(d);
      const w = isNaN(n) ? 0 : n;
      const h = context.rowHeight(i) - padding * 2;
      ctx.fillStyle = this.colorOf(d, i, col) || col.color || model.Column.DEFAULT_COLOR;
      ctx.fillRect(x, y, w, h);

      if (renderValue) {
        ctx.fillText(col.getLabel(d), x, y - padding, col.getWidth());
      }
    });
    ctx.restore();
  }

  mouseEnterCanvas(ctx:CanvasRenderingContext2D, col:model.Column, row:any, index:number, context:IRenderContext) {
    const renderValue = this.renderValue || context.option('renderBarValue', false);
    if (renderValue) { //everything already rendered
      return;
    }
    ctx.save();
    ctx.fillText(col.getLabel(row), context.cellX(index), context.cellY(index), col.getWidth());
    ctx.restore();
  }
}

/**
 * render as a heatmap cell, e.g., encode the value in color
 */
export class HeatMapCellRenderer extends DefaultCellRenderer {

  render($col:d3.Selection<any>, col:model.NumberColumn, rows:any[], context:IRenderContext) {
    var $rows = $col.datum(col).selectAll('rect.heatmap').data(rows, context.rowKey);

    $rows.enter().append('rect').attr({
      'class': 'bar ' + col.cssClass,
      x: (d, i) => context.cellX(i),
      y: (d, i) => context.cellPrevY(i) + context.option('rowPadding', 1),
      width: (d, i) => context.rowHeight(i) - context.option('rowPadding', 1) * 2
    }).style('fill', col.color);

    $rows.attr({
      'data-index': (d, i) => i,
      width: (d, i) => context.rowHeight(i) - context.option('rowPadding', 1) * 2,
      height: (d, i) => context.rowHeight(i) - context.option('rowPadding', 1) * 2
    });

    context.animated($rows).attr({
      x: (d, i) => context.cellX(i),
      y: (d, i) => context.cellY(i) + context.option('rowPadding', 1)
    }).style({
      fill: (d, i) => this.colorOf(d, i, col)
    });
    $rows.exit().remove();
  }

  /**
   * computes the color of the cell
   * @param d the row
   * @param i the data index
   * @param col the column
   * @returns {string} the computed color
   */
  colorOf(d:any, i:number, col:model.Column) {
    var v = col.getValue(d);
    if (isNaN(v)) {
      v = 0;
    }
    //hsl space encoding, encode in lightness
    var color = d3.hsl(col.color || model.Column.DEFAULT_COLOR);
    color.l = v;
    return color.toString();
  }

  findRow($col:d3.Selection<any>, index:number) {
    return $col.selectAll('rect.heatmap[data-index="' + index + '"]');
  }

  mouseEnter($col:d3.Selection<any>, $row:d3.Selection<any>, col:model.Column, row:any, index:number, context:IRenderContext) {
    var rowNode = this.findRow($col, index);
    if (!rowNode.empty()) {
      //append a text element on top
      (<Node>$row.node()).appendChild(<Node>(rowNode.node()));
      $row.append('text').datum(rowNode.datum()).attr({
        'class': 'number',
        'clip-path': 'url(#' + context.idPrefix + 'clipCol' + col.id + ')',
        transform: 'translate(' + context.cellX(index) + ',' + context.cellY(index) + ')'
      }).text((d) => col.getLabel(d));
    }
  }

  renderCanvas(ctx:CanvasRenderingContext2D, col:model.NumberColumn, rows:any[], context:IRenderContext) {
    ctx.save();
    rows.forEach((d, i) => {
      const x = context.cellX(i);
      const y = context.cellY(i) + context.option('rowPadding', 1);
      const h = context.rowHeight(i) - context.option('rowPadding', 1) * 2;
      ctx.fillStyle = this.colorOf(d, i, col);
      ctx.fillRect(x, y, h, h);
    });
    ctx.restore();
  }

  mouseEnterCanvas(ctx:CanvasRenderingContext2D, col:model.Column, row:any, index:number, context:IRenderContext) {
    ctx.save();
    ctx.fillText(col.getLabel(row), context.cellX(index), context.cellY(index), col.getWidth());
    ctx.restore();
  }
}

/**
 * a bar cell renderer where individual function can be overwritten
 */
class DerivedBarCellRenderer extends BarCellRenderer {
  constructor(extraFuncs:any) {
    super();
    Object.keys(extraFuncs).forEach((key) => {
      this[key] = extraFuncs[key];
    });
  }
}

/**
 * an rendering for action columns, i.e., clickable column actions
 */
export class ActionCellRenderer implements ICellRenderer {
  render($col:d3.Selection<any>, col:model.Column, rows:any[], context:IRenderContext) {
    //nothing to render in normal mode
  }

  mouseEnter($col:d3.Selection<any>, $row:d3.Selection<any>, col:model.Column, row:any, index:number, context:IRenderContext) {
    //render all actions at tspans
    var actions = context.option('actions', []);
    var $actions = $row.append('text').attr({
      'class': 'actions fa',
      x: context.cellX(index),
      y: context.cellPrevY(index),
      'data-index': index
    }).selectAll('tspan').data(actions);
    $actions.enter().append('tspan')
      .text((d) => d.icon)
      .attr('title', (d) => d.name)
      .on('click', (d) => {
        (<MouseEvent>d3.event).preventDefault();
        (<MouseEvent>d3.event).stopPropagation();
        d.action(row);
      });
  }

  mouseLeave($col:d3.Selection<any>, $row:d3.Selection<any>, col:model.Column, row:any, index:number, context:IRenderContext) {
    $row.selectAll('*').remove();
  }

}

export class SelectionCellRenderer extends DefaultCellRenderer {

  constructor() {
    super();
    this.textClass = 'selection';
  }

  render($col:d3.Selection<any>, col:model.SelectionColumn, rows:any[], context:IRenderContext) {
    var $rows = $col.datum(col).selectAll('text.' + this.textClass).data(rows, context.rowKey);

    $rows.enter().append('text').attr({
      'class': this.textClass + ' fa',
      y: (d, i) => context.cellPrevY(i)
    }).on('click', function (d) {
      (<MouseEvent>d3.event).preventDefault();
      (<MouseEvent>d3.event).stopPropagation();
      const new_ = col.toggleValue(d);
      d3.select(this).text(new_ === true ? '\uf046' : '\uf096');
    });

    $rows.attr({
      x: (d, i) => context.cellX(i),
      'data-index': (d, i) => i
    }).text((d) => col.getValue(d) === true ? '\uf046' : '\uf096');

    context.animated($rows).attr({
      y: (d, i) => context.cellY(i)
    });

    $rows.exit().remove();
  }

  renderCanvas(ctx:CanvasRenderingContext2D, col:model.SelectionColumn, rows:any[], context:IRenderContext) {
    ctx.save();
    ctx.font = 'FontAwesome';
    rows.forEach((d, i) => {
      const x = context.cellX(i);
      const y = context.cellY(i);
      ctx.fillText(col.getValue(d) === true ? '\uf046' : '\uf096', x, y);
    });
    ctx.restore();
  }
}

/**
 * a renderer for annotate columns
 */
class AnnotateCellRenderer extends DefaultCellRenderer {
  mouseEnter($col:d3.Selection<any>, $row:d3.Selection<any>, col:model.AnnotateColumn, row:any, index:number, context:IRenderContext) {
    //render an input field for editing
    this.findRow($col, index).attr('display', 'none');
    $row.append('foreignObject').attr({
      x: context.cellX(index) - 2,
      y: context.cellPrevY(index) - 2,
      'data-index': index,
      width: col.getWidth(),
      height: context.rowHeight(index)
    }).append('xhtml:input').attr({
      type: 'text',
      value: col.getValue(row)
    }).style({
      width: col.getWidth() + 'px'
    }).on('change', function () {
      //update the value
      var text = this.value;
      col.setValue(row, text);
    }).on('click', () => (<MouseEvent>d3.event).stopPropagation());
  }

  mouseLeave($col:d3.Selection<any>, $row:d3.Selection<any>, col:model.AnnotateColumn, row:any, index:number, context:IRenderContext) {
    this.findRow($col, index).attr('display', null);
    var node = <HTMLInputElement>$row.select('input').node();
    if (node) {
      //update the value before removal, the change event may not have been fired
      col.setValue(row, node.value);
    }
    $row.selectAll('*').remove();
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

/**
 * creates a new instance with optional overridden methods
 * @param extraFuncs
 * @return {BarCellRenderer}
 */
export function barRenderer(extraFuncs?:any) {
  if (!extraFuncs) {
    return barRendererInstance;
  }
  return new DerivedBarCellRenderer(extraFuncs);
}

/**
 * renderer of a link column, i.e. render an intermediate *a* element
 */
class LinkCellRenderer extends DefaultCellRenderer {
  render($col:d3.Selection<any>, col:model.LinkColumn, rows:any[], context:IRenderContext) {
    //wrap the text elements with an a element
    var $rows = $col.datum(col).selectAll('text.link').data(rows, context.rowKey);
    $rows.enter().append('text').attr({
      'class': 'text link',
      'clip-path': 'url(#' + context.idPrefix + 'clipCol' + col.id + ')',
      y: (d, i) => context.cellPrevY(i)
    });

    $rows.attr({
      x: (d, i) => context.cellX(i),
      'data-index': (d, i) => i
    }).html((d) => col.isLink(d) ? `<a class="link" xlink:href="${col.getValue(d)}" target="_blank">${col.getLabel(d)}</a>` : col.getLabel(d));

    context.animated($rows).attr({
      y: (d, i) => context.cellY(i)
    });

    $rows.exit().remove();
  }

  findRow($col:d3.Selection<any>, index:number) {
    return $col.selectAll('text.link[data-index="' + index + '"]');
  }
}


/**
 * renders a string with additional alignment behavior
 */
class StringCellRenderer extends DefaultCellRenderer {
  render($col:d3.Selection<any>, col:model.StringColumn, rows:any[], context:IRenderContext) {
    this.align = col.alignment;
    this.textClass = 'text' + (col.alignment === 'left' ? '' : '_' + col.alignment);
    return super.render($col, col, rows, context);
  }
}

/**
 * renders categorical columns as a colored rect with label
 */
class CategoricalRenderer extends DefaultCellRenderer {
  textClass = 'cat';

  render($col:d3.Selection<any>, col:model.CategoricalColumn, rows:any[], context:IRenderContext) {
    var $rows = $col.datum(col).selectAll('g.' + this.textClass).data(rows, context.rowKey);

    var $rows_enter = $rows.enter().append('g').attr({
      'class': this.textClass,
      'data-index': (d, i) => i,
      transform: (d, i) => 'translate(' + context.cellX(i) + ',' + context.cellPrevY(i) + ')'
    });
    $rows_enter.append('text').attr({
      'clip-path': 'url(#' + context.idPrefix + 'clipCol' + col.id + ')',
      x: (d, i) => context.rowHeight(i)
    });
    $rows_enter.append('rect').attr({
      y: context.option('rowPadding', 1)
    });
    $rows.attr({
      'data-index': (d, i) => i,
      transform: (d, i) => 'translate(' + context.cellX(i) + ',' + context.cellY(i) + ')'
    });
    $rows.select('text').attr({
      x: (d, i) => context.rowHeight(i)
    }).text((d) => col.getLabel(d));
    $rows.select('rect').style({
      fill: (d) => col.getColor(d)
    }).attr({
      height: (d, i) => Math.max(context.rowHeight(i) - context.option('rowPadding', 1) * 2, 0),
      width: (d, i) => Math.max(context.rowHeight(i) - context.option('rowPadding', 1) * 2, 0)
    });

    context.animated($rows).attr({
      transform: (d, i) => 'translate(' + context.cellX(i) + ',' + context.cellY(i) + ')'
    });


    $rows.exit().remove();
  }

  findRow($col:d3.Selection<any>, index:number) {
    return $col.selectAll('g.' + this.textClass + '[data-index="' + index + '"]');
  }

  renderCanvas(ctx:CanvasRenderingContext2D, col:model.CategoricalColumn, rows:any[], context:IRenderContext) {
    ctx.save();
    rows.forEach((d, i) => {
      const x = context.cellX(i);
      const y = context.cellY(i);
      ctx.fillStyle = 'black';
      ctx.fillText(col.getLabel(d), x + context.rowHeight(i), y);
      ctx.fillStyle = col.getColor(d);
      ctx.fillRect(x, y+context.option('rowPadding', 1), Math.max(context.rowHeight(i) - context.option('rowPadding', 1) * 2, 0), Math.max(context.rowHeight(i) - context.option('rowPadding', 1) * 2, 0));
    });
  }
}

/**
 * renders a stacked column using composite pattern
 */
class StackCellRenderer extends DefaultCellRenderer {
  constructor(private nestingPossible = true) {
    super();
  }

  renderImpl($base:d3.Selection<any>, col:model.StackColumn, context:IRenderContext, perChild:($child:d3.Selection<model.Column>, col:model.Column, i:number, context:IRenderContext) => void, rowGetter:(index:number) => any, animated = true) {
    const $group = $base.datum(col),
      children = col.children,
      stacked = this.nestingPossible && context.showStacked(col);
    var offset = 0,
      shifts = children.map((d) => {
        var r = offset;
        offset += d.getWidth();
        offset += (!stacked ? context.option('columnPadding', 0) : 0);
        return r;
      });
    const baseclass = 'component' + context.option('stackLevel', '');

    const ueber = context.cellX;
    const ueberOption = context.option;
    context.option = (option, default_) => {
      var r = ueberOption(option, default_);
      return option === 'stackLevel' ? r + 'N' : r;
    };

    //map all children to g elements
    const $children = $group.selectAll('g.' + baseclass).data(children, (d) => d.id);
    //shift children horizontally
    $children.enter().append('g').attr({
      'class': baseclass,
      transform: (d, i) => 'translate(' + shifts[i] + ',0)'
    });
    //for each children render the column
    $children.attr({
      'class': (d) => baseclass + ' ' + d.desc.type,
      'data-stack': (d, i) => i
    }).each(function (d, i) {
      if (stacked) {
        const preChildren = children.slice(0, i);
        //if shown as stacked bar shift individual cells of a column to the left where they belong to
        context.cellX = (index) => {
          //shift by all the empty space left from the previous columns
          return ueber(index) - preChildren.reduce((prev, child) => prev + child.getWidth() * (1 - child.getValue(rowGetter(index))), 0);
        };
      }
      perChild(d3.select(this), d, i, context);
    });
    (animated ? context.animated($children) : $children).attr({
      transform: (d, i) => 'translate(' + shifts[i] + ',0)'
    });
    $children.exit().remove();

    context.cellX = ueber;
    context.option = ueberOption;
  }

  render($col:d3.Selection<any>, stack:model.StackColumn, rows:any[], context:IRenderContext) {
    this.renderImpl($col, stack, context, ($child, col, i, ccontext) => {
      ccontext.render(col, $child, rows, ccontext);
    }, (index) => rows[index]);
  }

  mouseEnter($col:d3.Selection<any>, $row:d3.Selection<any>, stack:model.StackColumn, row:any, index:number, context:IRenderContext) {
    var baseclass = 'component' + context.option('stackLevel', '');
    this.renderImpl($row, stack, context, ($row_i, col, i, ccontext) => {
      var $col_i = $col.select('g.' + baseclass + '[data-stack="' + i + '"]');
      if (!$col_i.empty()) {
        ccontext.renderer(col).mouseEnter($col_i, $row_i, col, row, index, ccontext);
      }
    }, (index) => row, false);
  }

  mouseLeave($col:d3.Selection<any>, $row:d3.Selection<any>, satck:model.StackColumn, row:any, index:number, context:IRenderContext) {
    var baseclass = 'component' + context.option('stackLevel', '');
    this.renderImpl($row, satck, context, ($row_i, col, i, ccontext) => {
      var $col_i = $col.select('g.' + baseclass + '[data-stack="' + i + '"]');
      if (!$col_i.empty()) {
        ccontext.renderer(col).mouseLeave($col_i, $row_i, col, row, index, ccontext);
      }
    }, (index) => row, false);
    $row.selectAll('*').remove();
  }

  renderCanvas(ctx: CanvasRenderingContext2D, stack:model.StackColumn, rows:any[], context:IRenderContext) {
    const children = stack.children,
      stacked = this.nestingPossible && context.showStacked(stack);
    var offset = 0,
      shifts = children.map((d) => {
        var r = offset;
        offset += d.getWidth();
        offset += (!stacked ? context.option('columnPadding', 0) : 0);
        return r;
      });
    const ueber = context.cellX;
    const ueberOption = context.option;
    context.option = (option, default_) => {
      var r = ueberOption(option, default_);
      return option === 'stackLevel' ? r + 'N' : r;
    };
    ctx.save();
    children.forEach((child, i) => {
      ctx.save();
      ctx.translate(shifts[i], 0);

      if (stacked) {
        const preChildren = children.slice(0, i);
        //if shown as stacked bar shift individual cells of a column to the left where they belong to
        context.cellX = (index) => {
          //shift by all the empty space left from the previous columns
          return ueber(index) - preChildren.reduce((prev, child) => prev + child.getWidth() * (1 - child.getValue(rows[index])), 0);
        };
      }
      context.renderCanvas(child, ctx, rows, context);

      ctx.restore();
    });
    ctx.restore();
    context.cellX = ueber;
    context.option = ueberOption;
  }
}

export interface IRenderFunction {
  render($col:d3.Selection<any>, col:model.Column, rows:any[], context:IRenderContext): void;
}

/**
 * defines a custom renderer object
 * @param selector d3 selector, e.g. text.my
 * @param render render function
 * @param extras additional functions
 * @returns {DerivedCellRenderer}
 */
export function createRenderer(selector: string, render: IRenderFunction, extras : any = {}) {
  extras.selector = selector;
  extras.render = render;
  extras.findRow = ($col:d3.Selection<any>, index:number) => $col.selectAll(this.selector + '[data-index="' + index + '"]');

  const r = new DerivedCellRenderer(extras);
  return r;
}

const combineRenderer = barRenderer({
  colorOf: (d, i, col) => col.getColor(d)
});

/**
 * returns a map of all known renderers by type
 * @return
 */
export function renderers() {
  return {
    string: new StringCellRenderer(),
    link: new LinkCellRenderer(),
    number: barRenderer(),
    rank: defaultRenderer({
      textClass: 'rank',
      align: 'right'
    }),
    boolean: defaultRenderer({
      textClass: 'boolean',
      align: 'center'
    }),
    heatmap: new HeatMapCellRenderer(),
    stack: new StackCellRenderer(),
    categorical: new CategoricalRenderer(),
    ordinal: barRenderer({
      renderValue: true,
      colorOf: (d, i, col) => col.getColor(d)
    }),
    max: combineRenderer,
    min: combineRenderer,
    mean: combineRenderer,
    script: combineRenderer,
    actions: new ActionCellRenderer(),
    annotate: new AnnotateCellRenderer(),
    selection: new SelectionCellRenderer(),
    nested: new StackCellRenderer(false)
  };
}
