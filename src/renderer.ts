/**
 * Created by Samuel Gratzl on 14.08.2015.
 */

import model = require('./model');

/**
 * context for rendering, wrapped as an object for easy extensibility
 */
export interface IRenderContext<T> {
  /**
   * the y position of the cell
   * @param index
   */
  cellY(index: number): number;

  /**
   * the previous y position of the cell
   * @param index
   */
  cellPrevY(index: number): number;
  /**
   * the x position of the cell
   * @param index
   */
  cellX(index: number): number;
  /**
   * the height of a row
   * @param index
   */
  rowHeight(index: number): number;
  /**
   * a key function for uniquely identifying a data row
   * @param d
   * @param i
   */
  rowKey(d: any, i: number): string;

  /**
   * render a column
   * @param col
   */
  render(col: model.Column, target: T, data: any[], context?: IRenderContext<T>);

  /**
   * prefix used for all generated id names
   */
  idPrefix: string;

  /**
   * whether changes should be animated
   * < 0 no animation
   */
  animationDuration: number;

  /**
   * lookup custom options by key
   * @param key key to lookup
   * @param default_ default value
   */
  option<T>(key: string, default_: T): T;
}

export interface IDOMRenderContext extends IRenderContext<d3.Selection<any>> {

}
export interface ICanvasRenderContext extends IRenderContext<CanvasRenderingContext2D> {

}

/**
 * a cell renderer for rendering a cell of specific column
 */
export interface ISVGCellRenderer {
  /**
   * render a whole column at once
   * @param $col the column container
   * @param col the column to render
   * @param rows the data rows
   * @param context render context
   */
  renderSVG($col: d3.Selection<any>, col: model.Column, rows: any[], context: IDOMRenderContext);
}

export interface IHTMLCellRenderer {
  renderHTML($col: d3.Selection<any>, col: model.Column, rows: any[], context: IDOMRenderContext);
}

export interface ICanvasCellRenderer {
  renderCanvas(ctx: CanvasRenderingContext2D, col: model.Column, rows: any[], context: IRenderContext<CanvasRenderingContext2D>);
}

function animated($rows: d3.Selection<any>, context: IDOMRenderContext) {
  if (context.animationDuration > 0) {
    return <any>$rows.transition();
  }
  return $rows;
}
/**
 * default renderer instance rendering the value as a text
 */
export class DefaultCellRenderer implements ISVGCellRenderer, IHTMLCellRenderer {
  /**
   * class to append to the text elements
   * @type {string}
   */
  textClass = 'text';
  /**
   * the text alignment: left, center, right
   * @type {string}
   */
  align: string = 'left';


  renderSVG($col: d3.Selection<any>, col: model.Column, rows: any[], context: IDOMRenderContext) {
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

    animated($rows, context).attr({
      y: (d, i) => context.cellY(i)
    });

    $rows.exit().remove();
  }

  renderHTML($col: d3.Selection<any>, col: model.Column, rows: any[], context: IDOMRenderContext) {
    var $rows = $col.datum(col).selectAll('div.' + this.textClass).data(rows, context.rowKey);

    $rows.enter().append('div')
      .attr('class',this.textClass)
      .style('top',(d, i) => context.cellPrevY(i)+'px');

    $rows.attr('data-index',(d, i) => i).style({
      left: (d, i) => (context.cellX(i)) +'px',
      width: col.getWidth()+'px'
    }).text((d) => col.getLabel(d));

    animated($rows, context).style('top',(d, i) => context.cellY(i)+'px');

    $rows.exit().remove();
  }
}

/**
 * simple derived one where individual elements can be overridden
 */
class DerivedCellRenderer extends DefaultCellRenderer {
  constructor(extraFuncs: any) {
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
export class BarCellRenderer implements ISVGCellRenderer {
  /**
   * flag to always render the value
   * @type {boolean}
   */
  protected renderValue = false;

  renderSVG($col: d3.Selection<any>, col: model.NumberColumn, rows: any[], context: IDOMRenderContext) {
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

      animated($update, context).attr({
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

    let $rows_enter = $rows.enter().append('g').attr('class', 'bar ' + this.textClass);
    renderBars($rows_enter, col.cssClass, $rows.select('rect'));
    $rows_enter.append('text').attr({
      'class': 'number',
      'clip-path': 'url(#' + context.idPrefix + 'clipCol' + col.id + ')'
    });

    animated($rows.select('text').text((d) => col.getLabel(d)), context)
      .attr('transform', (d, i) => 'translate(' + context.cellX(i) + ',' + context.cellY(i) + ')');

    $rows.attr('data-index', (d, i) => i);

    $rows.exit().remove();
  }

  /**
   * computes the color for a given row
   * @param d the current row
   * @param i the row index
   * @param col the model column
   * @returns {string}
   */
  colorOf(d: any, i: number, col: model.Column) {
    return col.color;
  }
}

/**
 * render as a heatmap cell, e.g., encode the value in color
 */
export class HeatMapCellRenderer implements ISVGCellRenderer {

  renderSVG($col: d3.Selection<any>, col: model.NumberColumn, rows: any[], context: IDOMRenderContext) {
    var $rows = $col.datum(col).selectAll('.heatmap').data(rows, context.rowKey);

    $row.append('text').datum(rowNode.datum()).attr({
        'class': 'number',
        'clip-path': 'url(#' + context.idPrefix + 'clipCol' + col.id + ')',
        transform: 'translate(' + context.cellX(index) + ',' + context.cellY(index) + ')'
      }).text((d) => col.getLabel(d));

    $rows.enter().append('g').attr({
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

    animated($rows, context).attr({
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
  colorOf(d: any, i: number, col: model.Column) {
    var v = col.getValue(d);
    if (isNaN(v)) {
      v = 0;
    }
    //hsl space encoding, encode in lightness
    var color = d3.hsl(col.color || model.Column.DEFAULT_COLOR);
    color.l = v;
    return color.toString();
  }
}

/**
 * a bar cell renderer where individual function can be overwritten
 */
class DerivedBarCellRenderer extends BarCellRenderer {
  constructor(extraFuncs: any) {
    super();
    Object.keys(extraFuncs).forEach((key) => {
      this[key] = extraFuncs[key];
    });
  }
}

/**
 * an rendering for action columns, i.e., clickable column actions
 */
export class ActionCellRenderer implements ISVGCellRenderer {
  renderSVG($col: d3.Selection<any>, col: model.Column, rows: any[], context: IDOMRenderContext) {
    //nothing to render in normal mode
  }

  mouseEnter($col: d3.Selection<any>, $row: d3.Selection<any>, col: model.Column, row: any, index: number, context: IRenderContext) {
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
        d3.event.preventDefault();
        d3.event.stopPropagation();
        d.action(row);
      });
  }

}

export class SelectionCellRenderer implements ISVGCellRenderer, IHTMLCellRenderer {

  renderSVG($col: d3.Selection<any>, col: model.SelectionColumn, rows: any[], context: IDOMRenderContext) {
    var $rows = $col.datum(col).selectAll('text.selection').data(rows, context.rowKey);

    $rows.enter().append('text').attr({
      'class': 'selection fa',
      y: (d, i) => context.cellPrevY(i)
    }).on('click', function (d) {
      d3.event.preventDefault();
      d3.event.stopPropagation();
      const new_ = col.toggleValue(d);
      d3.select(this).text(new_ === true ? '\uf046' : '\uf096');
    });

    $rows.attr({
      x: (d, i) => context.cellX(i),
      'data-index': (d, i) => i
    }).text((d) => col.getValue(d) === true ? '\uf046' : '\uf096');

    animated($rows, context).attr({
      y: (d, i) => context.cellY(i)
    });

    $rows.exit().remove();
  }

  renderHTML($col: d3.Selection<any>, col: model.SelectionColumn, rows: any[], context: IDOMRenderContext) {
    var $rows = $col.datum(col).selectAll('i.selection').data(rows, context.rowKey);

    $rows.enter().append('i').attr('class', 'selection fa')
      .style('top', (d, i) => context.cellPrevY(i) + 'px')
      .on('click', function (d) {
        d3.event.preventDefault();
        d3.event.stopPropagation();
        const new_ = col.toggleValue(d);
        d3.select(this).text(new_ === true ? '\uf046' : '\uf096');
      });

    $rows.attr('data-index', (d, i) => i)
      .style('left', (d, i) => context.cellX(i) + 'px')
      .text((d) => col.getValue(d) === true ? '\uf046' : '\uf096');

    animated($rows, context).style('top', (d, i) => context.cellY(i) + 'px');

    $rows.exit().remove();
  }
}

/**
 * a renderer for annotate columns
 */
class AnnotateCellRenderer extends DefaultCellRenderer {
  mouseEnter($col: d3.Selection<any>, $row: d3.Selection<any>, col: model.AnnotateColumn, row: any, index: number, context: IRenderContext) {
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
    }).on('click', () => d3.event.stopPropagation());
  }

  mouseLeave($col: d3.Selection<any>, $row: d3.Selection<any>, col: model.AnnotateColumn, row: any, index: number, context: IRenderContext) {
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
export function defaultRenderer(extraFuncs?: any) {
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
export function barRenderer(extraFuncs?: any) {
  if (!extraFuncs) {
    return barRendererInstance;
  }
  return new DerivedBarCellRenderer(extraFuncs);
}

/**
 * renderer of a link column, i.e. render an intermediate *a* element
 */
class LinkCellRenderer implements ISVGCellRenderer, IHTMLCellRenderer {
  renderSVG($col: d3.Selection<any>, col: model.LinkColumn, rows: any[], context: IDOMRenderContext) {
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

    animated($rows, context).attr({
      y: (d, i) => context.cellY(i)
    });

    $rows.exit().remove();
  }

  renderHTML($col: d3.Selection<any>, col: model.LinkColumn, rows: any[], context: IDOMRenderContext) {
    //wrap the text elements with an a element
    var $rows = $col.datum(col).selectAll('span.link').data(rows, context.rowKey);
    $rows.enter().append('span').attr({
      'class': 'text link'
    }).style({
      top: (d, i) => context.cellPrevY(i) + 'px'
    });

    $rows.attr('data-index', (d, i) => i)
      .style('left', (d, i) => context.cellX(i) + 'px')
      .html((d) => col.isLink(d) ? `<a class="link" href="${col.getValue(d)}" target="_blank">${col.getLabel(d)}</a>` : col.getLabel(d));

    animated($rows, context).style('top', (d, i) => context.cellY(i) + 'px');

    $rows.exit().remove();
  }

}


/**
 * renders a string with additional alignment behavior
 */
class StringCellRenderer extends DefaultCellRenderer {
  renderSVG($col: d3.Selection<any>, col: model.StringColumn, rows: any[], context: IDOMRenderContext) {
    this.align = col.alignment;
    this.textClass = 'text' + (col.alignment === 'left' ? '' : '_' + col.alignment);
    return super.renderSVG($col, col, rows, context);
  }
}

/**
 * renders categorical columns as a colored rect with label
 */
class CategoricalRenderer implements ISVGCellRenderer {
  textClass = 'cat';

  renderSVG($col: d3.Selection<any>, col: model.CategoricalColumn, rows: any[], context: IDOMRenderContext) {
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

    animated($rows, context).attr({
      transform: (d, i) => 'translate(' + context.cellX(i) + ',' + context.cellY(i) + ')'
    });


    $rows.exit().remove();
  }
}

/**
 * renders a stacked column using composite pattern
 */
class StackCellRenderer implements ISVGCellRenderer {
  constructor(private nestingPossible = true) {
  }

  renderImpl($base: d3.Selection<any>, col: model.StackColumn, context: IDOMRenderContext, perChild: ($child: d3.Selection<model.Column>, col: model.Column, i: number, context: IDOMRenderContext) => void, rowGetter: (index: number) => any) {
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
    animated($children, context).attr({
      transform: (d, i) => 'translate(' + shifts[i] + ',0)'
    });
    $children.exit().remove();

    context.cellX = ueber;
    context.option = ueberOption;
  }

  renderSVG($col: d3.Selection<any>, stack: model.StackColumn, rows: any[], context: IDOMRenderContext) {
    this.renderImpl($col, stack, context, ($child, col, i, ccontext) => {
      ccontext.render(col, $child, rows, ccontext);
    }, (index) => rows[index]);
  }
}


/**
 * defines a custom renderer object
 * @param render render function
 * @param extras additional functions
 * @returns {DerivedCellRenderer}
 */
export function createRenderer(render: ISVGCellRenderer, extras: any = {}) {
  extras.render = render;
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
