/**
 * Created by Samuel Gratzl on 14.08.2015.
 */

import model = require('./model');

export interface IDataRow {
  /**
   * the value
   */
  v: any;
  /**
   * the underlying data index
   */
  dataIndex: number;
}

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
  rowKey(d: IDataRow, i: number): string;

  /**
   * render a column
   * @param col
   */
  render(col: model.Column, target: T, data: IDataRow[], context: IRenderContext<T>);

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

export declare type IDOMRenderContext = IRenderContext<d3.Selection<model.Column>>;

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
  renderSVG($col: d3.Selection<any>, col: model.Column, rows: IDataRow[], context: IDOMRenderContext);
}

/**
 * a cell renderer for rendering a cell of specific column
 */
export interface IHTMLCellRenderer {
  /**
   * render a whole column at once
   * @param $col the column container
   * @param col the column to render
   * @param rows the data rows
   * @param context render context
   */
  renderHTML($col: d3.Selection<any>, col: model.Column, rows: IDataRow[], context: IDOMRenderContext);
}

export function animated<T>($rows: d3.Selection<T>, context: IDOMRenderContext): d3.Selection<T> {
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


  renderSVG($col: d3.Selection<any>, col: model.Column, rows: IDataRow[], context: IDOMRenderContext) {
    var $rows = $col.datum(col).selectAll('text.' + this.textClass).data(rows, context.rowKey);

    $rows.enter().append('text').attr({
      'class': this.textClass,
      'clip-path': `url(#${context.idPrefix}clipCol${col.id})`,
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
      'data-data-index': (d) => d.dataIndex
    }).text((d) => col.getLabel(d.v));

    animated($rows, context).attr('y', (d, i) => context.cellY(i));

    $rows.exit().remove();
  }

  renderHTML($col: d3.Selection<any>, col: model.Column, rows: IDataRow[], context: IDOMRenderContext) {
    var $rows = $col.datum(col).selectAll('div.' + this.textClass).data(rows, context.rowKey);

    $rows.enter().append('div')
      .attr('class',this.textClass+' '+this.align)
      .style('top',(d, i) => context.cellPrevY(i)+'px');

    $rows.attr('data-data-index',(d) => d.dataIndex)
      .style('left', (d, i) => context.cellX(i)+'px')
      .style('width', col.getWidth()+'px')
      .text((d) => col.getLabel(d.v));

    animated($rows, context).style('top', (d, i) => context.cellY(i)+'px');

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
export class BarCellRenderer implements ISVGCellRenderer, IHTMLCellRenderer {
  /**
   * flag to always render the value
   * @type {boolean}
   */
  protected renderValue = false;

  renderSVG($col: d3.Selection<any>, col: model.NumberColumn, rows: IDataRow[], context: IDOMRenderContext) {
    const renderValue = this.renderValue || context.option('renderBarValue', false);
    //map to bars
    var $rows = $col.datum(col).selectAll('.bar').data(rows, context.rowKey);

    const padding = context.option('rowPadding', 1);
    function barLength(d) {
      var n = col.getWidth() * col.getValue(d.v);
      return isNaN(n) ? 0 : n;
    }

    let $rows_enter = $rows.enter().append('g').attr('class', 'bar');
    $rows_enter.append('rect').attr({
      'class': col.cssClass,
      x: (d, i) => context.cellX(i),
      y: (d, i) => context.cellPrevY(i) + padding,
      width: barLength
    }).style('fill', col.color).append('title');

    $rows_enter.append('text').attr({
      'class': 'number '+(renderValue?'':'hoverOnly'),
      'clip-path': `url(#${context.idPrefix}clipCol${col.id})`,
      transform: (d, i) => `translate(${context.cellX(i)},${context.cellPrevY(i)})`
    });

    $rows.attr('data-data-index', (d) => d.dataIndex);
    $rows.select('rect title').text((d) => col.getLabel(d.v));
    animated($rows.select('rect').attr('height', (d, i) => context.rowHeight(i) - padding * 2), context).attr({
        x: (d, i) => context.cellX(i),
        y: (d, i) => context.cellY(i) + padding,
        width: barLength
      }).style('fill', (d, i) => this.colorOf(d.v, i, col));
    animated($rows.select('text').text((d) => col.getLabel(d.v)), context)
      .attr('transform', (d, i) => `translate(${context.cellX(i)},${context.cellY(i)})`);


    $rows.exit().remove();
  }

  renderHTML($col: d3.Selection<any>, col: model.Column, rows: IDataRow[], context: IDOMRenderContext) {
    var $rows = $col.datum(col).selectAll('.bar').data(rows, context.rowKey);

    const padding = context.option('rowPadding', 1);
    function barLength(d) {
      var n = col.getWidth() * col.getValue(d.v);
      return (isNaN(n) ? 0 : n)+'px';
    }

    $rows.enter().append('div').attr('class', 'bar')
      .style('left', (d, i) => context.cellX(i) + 'px')
      .style('top', (d, i) => context.cellPrevY(i) + 'px')
      .style('width', '0px')
      .style('height', (d, i) => (context.rowHeight(i) - padding * 2) + 'px')
      .style('background-color', col.color)
      .append('span');

    $rows.attr('data-data-index',(d) => d.dataIndex)
      .select('span').text((d) => col.getLabel(d.v));

    animated($rows, context)
      .style('left', (d, i) => context.cellX(i)+'px')
      .style('top', (d, i) => (context.cellY(i)+padding)+'px')
      .style('width', barLength)
      .style('height',(d, i) => (context.rowHeight(i) - padding * 2)+'px')
      .style('background-color', (d, i) => this.colorOf(d.v, i, col));

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

  renderSVG($col: d3.Selection<any>, col: model.NumberColumn, rows: IDataRow[], context: IDOMRenderContext) {
    const $rows = $col.datum(col).selectAll('.heatmap').data(rows, context.rowKey);

    const padding = context.option('rowPadding', 1);
    $rows.enter().append('rect').attr({
      'class': 'heatmap ' + col.cssClass,
      x: (d, i) => context.cellX(i),
      y: (d, i) => context.cellPrevY(i) + padding,
      width: (d, i) => context.rowHeight(i) - padding * 2
    }).style('fill', col.color)
      .append('title');

    $rows.attr({
      'data-data-index': (d) => d.dataIndex,
      width: (d, i) => context.rowHeight(i) - padding * 2,
      height: (d, i) => context.rowHeight(i) - padding * 2
    });
    $rows.select('title').text((d) => col.getLabel(d.v));

    animated($rows, context).attr({
      x: (d, i) => context.cellX(i),
      y: (d, i) => context.cellY(i) + padding
    }).style('fill', (d, i) => this.colorOf(d.v, i, col));
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
export class ActionCellRenderer implements ISVGCellRenderer, IHTMLCellRenderer {
  renderSVG($col: d3.Selection<any>, col: model.Column, rows: IDataRow[], context: IDOMRenderContext) {
    //nothing to render in normal mode
    const actions = context.option('actions', []);
    const $rows = $col.selectAll('text.actions').data(rows, context.rowKey);
    $rows.enter().append('text').attr({
      'class': 'actions hoverOnly fa',
      x: (d,i) => context.cellX(i),
      y: (d,i) => context.cellPrevY(i)
    });
    $rows.attr('data-data-index', (d) => d.dataIndex);
    animated($rows, context).attr({
      x: (d,i) => context.cellX(i),
      y: (d,i) => context.cellY(i)
    });

    const $actions = $rows.selectAll('tspan').data(actions);
    $actions.enter().append('tspan')
      .on('click', (d, i, j) => {
        d3.event.preventDefault();
        d3.event.stopPropagation();
        d.action(rows[j].v);
      });
    $actions.text((d) => d.icon)
      .attr('title', (d) => d.name);

    $actions.exit().remove();
    $rows.exit().remove();

  }

  renderHTML($col: d3.Selection<any>, col: model.Column, rows: IDataRow[], context: IDOMRenderContext) {
    //nothing to render in normal mode
    const actions = context.option('actions', []);
    const $rows = $col.selectAll('div.actions').data(rows, context.rowKey);
    $rows.enter().append('div').attr('class', 'actions hoverOnly fa').style({
      left: (d,i) => context.cellX(i)+'px',
      top: (d,i) => context.cellPrevY(i)+'px'
    });

    $rows.attr('data-data-index', (d) => d.dataIndex);
    animated($rows, context).style({
      left: (d,i) => context.cellX(i)+'px',
      top: (d,i) => context.cellY(i)+'px'
    });

    const $actions = $rows.selectAll('span').data(actions);
    $actions.enter().append('span')
      .on('click', (d, i, j) => {
        d3.event.preventDefault();
        d3.event.stopPropagation();
        d.action(rows[j].v);
      });
    $actions.text((d) => d.icon)
      .attr('title', (d) => d.name);

    $actions.exit().remove();
    $rows.exit().remove();

  }
}

export class SelectionCellRenderer implements ISVGCellRenderer, IHTMLCellRenderer {

  renderSVG($col: d3.Selection<any>, col: model.SelectionColumn, rows: IDataRow[], context: IDOMRenderContext) {
    var $rows = $col.datum(col).selectAll('text.selection').data(rows, context.rowKey);

    $rows.enter().append('text').attr({
      'class': 'selection fa',
      y: (d, i) => context.cellPrevY(i)
    }).on('click', function (d) {
      d3.event.preventDefault();
      d3.event.stopPropagation();
      col.toggleValue(d.v);
    }).html(`<tspan class="s_true">\uf046</tspan><tspan class="s_false">\uf096</tspan>`);

    $rows.attr({
      x: (d, i) => context.cellX(i),
      'data-data-index': (d) => d.dataIndex
    });

    animated($rows, context).attr('y', (d, i) => context.cellY(i));

    $rows.exit().remove();
  }

  renderHTML($col: d3.Selection<any>, col: model.Column, rows: IDataRow[], context: IDOMRenderContext) {
    var $rows = $col.datum(col).selectAll('div.selection').data(rows, context.rowKey);

    $rows.enter().append('div')
      .attr('class','selection fa')
      .style('top',(d, i) => context.cellPrevY(i)+'px');

    $rows.attr('data-data-index',(d) => d.dataIndex)
      .style('left', (d, i) => context.cellX(i)+'px')
      .style('width', col.getWidth()+'px');

    animated($rows, context).style('top', (d, i) => context.cellY(i)+'px');

    $rows.exit().remove();
  }
}

/**
 * a renderer for annotate columns
 */
class AnnotateCellRenderer implements ISVGCellRenderer {
  renderSVG($col: d3.Selection<any>, col: model.AnnotateColumn, rows: IDataRow[], context: IDOMRenderContext) {
    //nothing to render in normal mode
    const $rows = $col.selectAll('g.annotations').data(rows, context.rowKey);
    const $rows_enter = $rows.enter().append('g').attr('class', 'annotations');
    $rows_enter.append('text').attr({
      'class': 'notHoverOnly text',
      'clip-path': `url(#${context.idPrefix}clipCol${col.id})`,
      y: (d,i) => context.cellPrevY(i)
    });
    $rows_enter.append('foreignObject').attr({
      x: (d,i) => context.cellX(i) - 2,
      y: (d,i) => context.cellPrevY(i) - 2,
      'class': 'hoverOnly'
    }).append('xhtml:input').attr('type', 'text').on('change', function (d) {
      //update the value
      var text = this.value;
      col.setValue(d.v, text);
    }).on('click', () => d3.event.stopPropagation());

    $rows.attr('data-data-index', (d) => d.dataIndex);
    $rows.select('text')
      .attr('x',(d, i) => context.cellX(i))
      .text((d) => col.getLabel(d.v));
    $rows.select('foreignObject')
      .attr({
        x: (d, i) => context.cellX(i),
        width: col.getWidth(),
        height: (d,i) => context.rowHeight(i)
      }).select('input').style('width', col.getWidth() + 'px').property('value', (d) => col.getLabel(d.v));

    const $rows_animated = animated($rows, context);
    $rows_animated.select('text').attr('y', (d, i) => context.cellY(i));
    $rows_animated.select('foreignObject').attr('y', (d, i) => context.cellY(i)-2);

    $rows.exit().remove();
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
  renderSVG($col: d3.Selection<any>, col: model.LinkColumn, rows: IDataRow[], context: IDOMRenderContext) {
    //wrap the text elements with an a element
    var $rows = $col.datum(col).selectAll('text.link').data(rows, context.rowKey);
    $rows.enter().append('text').attr({
      'class': 'text link',
      'clip-path': `url(#${context.idPrefix}clipCol${col.id})`,
      y: (d, i) => context.cellPrevY(i)
    });

    $rows.attr({
      x: (d, i) => context.cellX(i),
      'data-data-index': (d) => d.dataIndex
    }).html((d) => col.isLink(d.v) ? `<a class="link" xlink:href="${col.getValue(d.v)}" target="_blank">${col.getLabel(d.v)}</a>` : col.getLabel(d.v));

    animated($rows, context).attr('y', (d, i) => context.cellY(i));

    $rows.exit().remove();
  }

  renderHTML($col: d3.Selection<any>, col: model.LinkColumn, rows: IDataRow[], context: IDOMRenderContext) {
    //wrap the text elements with an a element
    var $rows = $col.datum(col).selectAll('div.link').data(rows, context.rowKey);
    $rows.enter().append('div')
      .attr('class','text link')
      .style('top',(d, i) => context.cellPrevY(i)+'px');

    $rows.attr('data-data-index',(d) => d.dataIndex)
      .style('left', (d, i) => context.cellX(i)+'px')
      .style('width', col.getWidth()+'px')
      .html((d) => col.isLink(d.v) ? `<a class="link" href="${col.getValue(d.v)}" target="_blank">${col.getLabel(d.v)}</a>` : col.getLabel(d.v));

    animated($rows, context).style('top', (d, i) => context.cellY(i)+'px');

    $rows.exit().remove();
  }
}


/**
 * renders a string with additional alignment behavior
 */
class StringCellRenderer extends DefaultCellRenderer {
  renderSVG($col: d3.Selection<any>, col: model.StringColumn, rows: IDataRow[], context: IDOMRenderContext) {
    this.align = col.alignment;
    this.textClass = 'text' + (col.alignment === 'left' ? '' : '_' + col.alignment);
    return super.renderSVG($col, col, rows, context);
  }

  renderHTML($col: d3.Selection<any>, col: model.StringColumn, rows: IDataRow[], context: IDOMRenderContext) {
    this.align = col.alignment;
    this.textClass = 'text' + (col.alignment === 'left' ? '' : '_' + col.alignment);
    return super.renderHTML($col, col, rows, context);
  }
}

/**
 * renders categorical columns as a colored rect with label
 */
class CategoricalRenderer implements ISVGCellRenderer {
  textClass = 'cat';

  renderSVG($col: d3.Selection<any>, col: model.CategoricalColumn, rows: IDataRow[], context: IDOMRenderContext) {
    var $rows = $col.datum(col).selectAll('g.' + this.textClass).data(rows, context.rowKey);

    const padding = context.option('rowPadding', 1);
    var $rows_enter = $rows.enter().append('g').attr({
      'class': this.textClass,
      'data-visible-index': (d, i) => i,
      transform: (d, i) => `translate(${context.cellX(i)},${context.cellPrevY(i)})`
    });
    $rows_enter.append('text').attr({
      'clip-path': `url(#${context.idPrefix}clipCol${col.id})`,
      x: (d, i) => context.rowHeight(i)
    });
    $rows_enter.append('rect').attr('y',padding);
    $rows.attr({
      'data-data-index': (d) => d.dataIndex,
      transform: (d, i) => `translate(${context.cellX(i)},${context.cellY(i)})`
    });
    $rows.select('text').attr('x', (d, i) => context.rowHeight(i)).text((d) => col.getLabel(d.v));
    $rows.select('rect').style('fill', (d) => col.getColor(d.v)).attr({
      height: (d, i) => Math.max(context.rowHeight(i) - padding * 2, 0),
      width: (d, i) => Math.max(context.rowHeight(i) - padding * 2, 0)
    });

    animated($rows, context).attr('transform', (d, i) => `translate(${context.cellX(i)},${context.cellY(i)})`);


    $rows.exit().remove();
  }
}

/**
 * renders a stacked column using composite pattern
 */
class StackCellRenderer implements ISVGCellRenderer {
  constructor(private nestingPossible = true) {
  }

  renderSVG($base: d3.Selection<any>, col: model.StackColumn, rows: IDataRow[], context: IDOMRenderContext) {
    const $group = $base.datum(col),
      children = col.children,
      stacked = this.nestingPossible && context.option('stacked', true);
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
      transform: (d, i) => `translate(${shifts[i]},0)`
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
          return ueber(index) - preChildren.reduce((prev, child) => prev + child.getWidth() * (1 - child.getValue(rows[index].v)), 0);
        };
      }
      context.render(d, d3.select(this), rows, context);
    });
    animated($children, context).attr({
      transform: (d, i) => `translate(${shifts[i]},0)`
    });
    $children.exit().remove();

    context.cellX = ueber;
    context.option = ueberOption;
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
