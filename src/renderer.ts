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
   * the height of a row
   * @param index
   */
  rowHeight(index: number): number;

  /**
   * render a column
   * @param col
   */
  renderer(col: model.Column, context: IRenderContext<T>): ICellRenderer<T>;

  /**
   * prefix used for all generated id names
   */
  idPrefix: string;

  /**
   * lookup custom options by key
   * @param key key to lookup
   * @param default_ default value
   */
  option<T>(key: string, default_: T): T;
}

export declare type IDOMRenderContext = IRenderContext<Element>;

/**
 * a cell renderer for rendering a cell of specific column
 */
export interface ICellRenderer<T> {
  /**
   * template as a basis for the update
   */
  template: string;
  /**
   * update a given node (create using the template) with the given data
   * @param node the node to update
   * @param d the data item
   * @param i the order relative index
   */
  update(node: T, d: IDataRow, i: number): void;
}
export declare type ISVGCellRenderer = ICellRenderer<SVGElement>;
export declare type IHTMLCellRenderer = ICellRenderer<HTMLElement>;

/**
 * utility function to sets attributes and styles in a nodes
 * @param node
 * @param attrs
 * @param styles
 * @return {T}
 */
function attr<T extends (HTMLElement | SVGElement & SVGStylable)>(node: T, attrs = {}, styles = {}): T {
  Object.keys(attrs).forEach((attr) => node.setAttribute(attr, String(attrs[attr])));
  Object.keys(styles).forEach((attr) => node.style.setProperty(attr, styles[attr]));
  return node;
}
/**
 * default renderer instance rendering the value as a text
 */
export class DefaultCellRenderer {
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

  constructor(textClass = 'text', align = 'left') {
    this.textClass = textClass;
    this.align = align;
  }

  createSVG(col: model.Column, context: IDOMRenderContext): ISVGCellRenderer {
    return {
      template: `<text class="${this.textClass}" clip-path="url(#${context.idPrefix}clipCol${col.id})"></text>`,
      update: (n: SVGTextElement, d: IDataRow, i: number) => {
        var alignmentShift = 2;
        if (this.align === 'right') {
          alignmentShift = col.getWidth() - 5;
        } else if (this.align === 'center') {
          alignmentShift = col.getWidth() * 0.5;
        }
        attr(n, {
          x: alignmentShift
        });
        n.textContent = col.getLabel(d.v);
      }
    }
  }

  createHTML(col: model.Column, context: IDOMRenderContext): IHTMLCellRenderer {
    return {
      template: `<div class="${this.textClass} ${this.align}"></div>`,
      update: (n: HTMLDivElement, d: IDataRow, i: number) => {
        attr(n, {}, {
          width: `${col.getWidth()}px`
        });
        n.textContent = col.getLabel(d.v);
      }
    }
  }
}

/**
 * a renderer rendering a bar for numerical columns
 */
export class BarCellRenderer {
  /**
   * flag to always render the value
   * @type {boolean}
   */
  protected renderValue = false;

  constructor(renderValue = false, private colorOf: (d: any, i: number, col: model.Column)=>string = (d,i,col) => col.color) {
    this.renderValue = renderValue;
  }

  createSVG(col: model.Column, context: IDOMRenderContext): ISVGCellRenderer {
    const padding = context.option('rowPadding', 1);
    return {
      template: `<g class="bar">
          <rect class="${col.cssClass}" y="${padding}" style="fill: ${col.color}">
            <title></title>   
          </rect>
          <text class="number ${this.renderValue? '': 'hoverOnly'}" clip-path="url(#${context.idPrefix}clipCol${col.id})"></text>
        </g>`,
      update: (n: SVGGElement, d: IDataRow, i: number) => {
        n.querySelector('rect title').textContent = col.getLabel(d.v);
        const width = col.getWidth() * col.getValue(d.v);

        attr(<SVGRectElement>n.querySelector('rect'),{
          y: padding,
          width: isNaN(width) ? 0 : width,
          height: context.rowHeight(i) - padding * 2
        }, {
          fill: this.colorOf(d.v, i, col)
        });
        attr(<SVGTextElement>n.querySelector('text'),{ }).textContent = col.getLabel(d.v);
      }
    }
  }

  createHTML(col: model.Column, context: IDOMRenderContext): IHTMLCellRenderer {
    const padding = context.option('rowPadding', 1);
    return {
      template: `<div class="bar" style="top:${padding}px; background-color: ${col.color}">
          <span class="number ${this.renderValue? '': 'hoverOnly'}"></span>
        </div>`,
      update: (n: HTMLDivElement, d: IDataRow, i: number) => {
        const width = col.getWidth() * col.getValue(d.v);
        attr(n, {
          title: col.getLabel(d.v)
        }, {
          width: `${isNaN(width) ? 0 : width}px`,
          height: `${col.getWidth()-padding*2}px`,
          top: `${padding}px`,
          'background-color': this.colorOf(d.v, i, col)
        });
        n.querySelector('span').textContent = col.getLabel(d.v);
      }
    }
  }
}

function toHeatMapColor(d: any, col: model.INumberColumn & model.Column) {
   var v = col.getNumber(d);
   if (isNaN(v)) {
     v = 0;
   }
   //hsl space encoding, encode in lightness
   var color = d3.hsl(col.color || model.Column.DEFAULT_COLOR);
   color.l = v;
   return color.toString();
 }

function createHeatmapSVG(col: model.INumberColumn & model.Column, context: IDOMRenderContext): ISVGCellRenderer {
  const padding = context.option('rowPadding', 1);
  return {
    template: `<rect class="heatmap ${col.cssClass}" y="${padding}" style="fill: ${col.color}">
          <title></title>
        </rect>`,
    update: (n: SVGGElement, d: IDataRow, i: number) => {
      n.querySelector('title').textContent = col.getLabel(d.v);
      const w = context.rowHeight(i) - padding * 2;

      attr(n, {
        y: padding,
        width: w,
        height: w
      }, {
        fill: toHeatMapColor(d.v, col)
      });
    }
  }
}

function createHeatmapHTML(col: model.INumberColumn & model.Column, context: IDOMRenderContext): ISVGCellRenderer {
  const padding = context.option('rowPadding', 1);
  return {
    template: `<div class="heatmap ${col.cssClass}" style="background-color: ${col.color}; top: ${padding}"></div>`,
    update: (n: SVGGElement, d: IDataRow, i: number) => {
      const w = context.rowHeight(i) - padding * 2;
      attr(n, {
        title: col.getLabel(d.v)
      }, {
        width: `${w}px`,
        height: `${w}px`,
        top: `${padding}px`,
        'background-color': toHeatMapColor(d.v, col)
      });
    }
  }
}
//
// /**
//  * an rendering for action columns, i.e., clickable column actions
//  */
// export class ActionCellRenderer implements ISVGCellRenderer, IHTMLCellRenderer {
//   renderSVG($col: d3.Selection<any>, col: model.Column, rows: IDataRow[], context: IDOMRenderContext) {
//     //nothing to render in normal mode
//     const actions = context.option('actions', []);
//     const $rows = $col.selectAll('text.actions').data(rows, context.rowKey);
//     $rows.enter().append('text').attr({
//       'class': 'actions hoverOnly fa',
//       x: (d,i) => context.cellX(i),
//       y: (d,i) => context.cellPrevY(i)
//     });
//     $rows.attr('data-data-index', (d) => d.dataIndex);
//     animated($rows, context).attr({
//       x: (d,i) => context.cellX(i),
//       y: (d,i) => context.cellY(i)
//     });
//
//     const $actions = $rows.selectAll('tspan').data(actions);
//     $actions.enter().append('tspan')
//       .on('click', (d, i, j) => {
//         d3.event.preventDefault();
//         d3.event.stopPropagation();
//         d.action(rows[j].v);
//       });
//     $actions.text((d) => d.icon)
//       .attr('title', (d) => d.name);
//
//     $actions.exit().remove();
//     $rows.exit().remove();
//
//   }
//
//   renderHTML($col: d3.Selection<any>, col: model.Column, rows: IDataRow[], context: IDOMRenderContext) {
//     //nothing to render in normal mode
//     const actions = context.option('actions', []);
//     const $rows = $col.selectAll('div.actions').data(rows, context.rowKey);
//     $rows.enter().append('div').attr('class', 'actions hoverOnly fa').style({
//       left: (d,i) => context.cellX(i)+'px',
//       top: (d,i) => context.cellPrevY(i)+'px'
//     });
//
//     $rows.attr('data-data-index', (d) => d.dataIndex);
//     animated($rows, context).style({
//       left: (d,i) => context.cellX(i)+'px',
//       top: (d,i) => context.cellY(i)+'px'
//     });
//
//     const $actions = $rows.selectAll('span').data(actions);
//     $actions.enter().append('span')
//       .on('click', (d, i, j) => {
//         d3.event.preventDefault();
//         d3.event.stopPropagation();
//         d.action(rows[j].v);
//       });
//     $actions.text((d) => d.icon)
//       .attr('title', (d) => d.name);
//
//     $actions.exit().remove();
//     $rows.exit().remove();
//
//   }
// }
//
function createSelectionSVG(col: model.SelectionColumn): ISVGCellRenderer {
  return {
    template: `<text class="selection fa"><tspan class="selectionOnly">\uf046</tspan><tspan class="notSelectionOnly">\uf096</tspan></text>`,
    update: (n: SVGGElement, d: IDataRow, i: number) => {
      n.onclick = function(event) {
        event.preventDefault();
        event.stopPropagation();
        col.toggleValue(d.v);
      };
    }
  }
}

function createSelectionHTML(col: model.SelectionColumn): IHTMLCellRenderer {
  return {
    template: `<div class="selection fa"></div>`,
    update: (n: HTMLElement, d: IDataRow, i: number) => {
      n.onclick = function(event) {
        event.preventDefault();
        event.stopPropagation();
        col.toggleValue(d.v);
      };
    }
  }
}
//
// /**
//  * a renderer for annotate columns
//  */
// class AnnotateCellRenderer implements ISVGCellRenderer {
//   renderSVG($col: d3.Selection<any>, col: model.AnnotateColumn, rows: IDataRow[], context: IDOMRenderContext) {
//     //nothing to render in normal mode
//     const $rows = $col.selectAll('g.annotations').data(rows, context.rowKey);
//     const $rows_enter = $rows.enter().append('g').attr('class', 'annotations');
//     $rows_enter.append('text').attr({
//       'class': 'notHoverOnly text',
//       'clip-path': `url(#${context.idPrefix}clipCol${col.id})`,
//       y: (d,i) => context.cellPrevY(i)
//     });
//     $rows_enter.append('foreignObject').attr({
//       x: (d,i) => context.cellX(i) - 2,
//       y: (d,i) => context.cellPrevY(i) - 2,
//       'class': 'hoverOnly'
//     }).append('xhtml:input').attr('type', 'text').on('change', function (d) {
//       //update the value
//       var text = this.value;
//       col.setValue(d.v, text);
//     }).on('click', () => d3.event.stopPropagation());
//
//     $rows.attr('data-data-index', (d) => d.dataIndex);
//     $rows.select('text')
//       .attr('x',(d, i) => context.cellX(i))
//       .text((d) => col.getLabel(d.v));
//     $rows.select('foreignObject')
//       .attr({
//         x: (d, i) => context.cellX(i),
//         width: col.getWidth(),
//         height: (d,i) => context.rowHeight(i)
//       }).select('input').style('width', col.getWidth() + 'px').property('value', (d) => col.getLabel(d.v));
//
//     const $rows_animated = animated($rows, context);
//     $rows_animated.select('text').attr('y', (d, i) => context.cellY(i));
//     $rows_animated.select('foreignObject').attr('y', (d, i) => context.cellY(i)-2);
//
//     $rows.exit().remove();
//   }
// }

function createLinkSVG(col: model.LinkColumn, context: IDOMRenderContext): ISVGCellRenderer {
  return {
    template: `<text class="link text" clip-path="url(#${context.idPrefix}clipCol${col.id})"></text>`,
    update: (n: SVGTextElement, d: IDataRow, i: number) => {
      n.innerHTML = col.isLink(d.v) ? `<a class="link" xlink:href="${col.getValue(d.v)}" target="_blank">${col.getLabel(d.v)}</a>` : col.getLabel(d.v);
    }
  };
}

function createLinkHTML(col: model.LinkColumn): IHTMLCellRenderer {
  return {
    template: `<div class="link text"></div>`,
    update: (n: HTMLElement, d: IDataRow, i: number) => {
      n.style.width = col.getWidth()+'px';
      n.innerHTML = col.isLink(d.v) ? `<a class="link" href="${col.getValue(d.v)}" target="_blank">${col.getLabel(d.v)}</a>` : col.getLabel(d.v);
    }
  }
}
//
//
/**
 * renders a string with additional alignment behavior
 */
class StringCellRenderer extends DefaultCellRenderer {
  createSVG(col: model.StringColumn, context: IDOMRenderContext): ISVGCellRenderer {
    this.align = col.alignment;
    this.textClass = 'text' + (col.alignment === 'left' ? '' : '_' + col.alignment);
    return super.createSVG(col, context);
  }

  createHTML(col: model.StringColumn, context: IDOMRenderContext): IHTMLCellRenderer {
    this.align = col.alignment;
    this.textClass = 'text' + (col.alignment === 'left' ? '' : '_' + col.alignment);
    return super.createHTML(col, context);
  }
}


/**
 * renders categorical columns as a colored rect with label
 */
export class CategoricalCellRenderer {
  /**
   * class to append to the text elements
   * @type {string}
   */
  textClass = 'cat';

  constructor(textClass = 'cat') {
    this.textClass = textClass;
  }

  createSVG(col: model.CategoricalColumn, context: IDOMRenderContext): ISVGCellRenderer {
    const padding = context.option('rowPadding', 1);
    return {
      template: `<g class="${this.textClass}">
        <text clip-path="url(#${context.idPrefix}clipCol${col.id})"></text>
        <rect y="${padding}"></rect>
      </g>`,
      update: (n: SVGGElement, d: IDataRow, i: number) => {
        const cell = Math.max(context.rowHeight(i) - padding * 2, 0);

        attr(<SVGRectElement>n.querySelector('rect'),{
          width: cell,
          height: cell
        }, {
          fill: col.getColor(d.v)
        });
        attr(<SVGTextElement>n.querySelector('text'),{
          x: context.rowHeight(i)
        }).textContent = col.getLabel(d.v);
      }
    }
  }

  createHTML(col: model.CategoricalColumn, context: IDOMRenderContext): IHTMLCellRenderer {
    const padding = context.option('rowPadding', 1);
    return {
      template: `<div class="${this.textClass}">
        <div></div>
        <span></span>
      </div>`,
      update: (n: HTMLElement, d: IDataRow, i: number) => {
        const cell = Math.max(context.rowHeight(i) - padding * 2, 0);
        attr(n, {}, {
          width: `${col.getWidth()}px`
        });
        attr(<SVGRectElement>n.querySelector('div'),{}, {
          width: cell+'px',
          height: cell+'px',
          'background-color': col.getColor(d.v)
        });
        attr(<SVGTextElement>n.querySelector('span'),{}).textContent = col.getLabel(d.v);
      }
    }
  }
}
//
// /**
//  * renders a stacked column using composite pattern
//  */
// class StackCellRenderer implements ISVGCellRenderer {
//   constructor(private nestingPossible = true) {
//   }
//
//   renderSVG($base: d3.Selection<any>, col: model.StackColumn, rows: IDataRow[], context: IDOMRenderContext) {
//     const $group = $base.datum(col),
//       children = col.children,
//       stacked = this.nestingPossible && context.option('stacked', true);
//     var offset = 0,
//       shifts = children.map((d) => {
//         var r = offset;
//         offset += d.getWidth();
//         offset += (!stacked ? context.option('columnPadding', 0) : 0);
//         return r;
//       });
//     const baseclass = 'component' + context.option('stackLevel', '');
//
//     const ueber = context.cellX;
//     const ueberOption = context.option;
//     context.option = (option, default_) => {
//       var r = ueberOption(option, default_);
//       return option === 'stackLevel' ? r + 'N' : r;
//     };
//
//     //map all children to g elements
//     const $children = $group.selectAll('g.' + baseclass).data(children, (d) => d.id);
//     //shift children horizontally
//     $children.enter().append('g').attr({
//       'class': baseclass,
//       transform: (d, i) => `translate(${shifts[i]},0)`
//     });
//     //for each children render the column
//     $children.attr({
//       'class': (d) => baseclass + ' ' + d.desc.type,
//       'data-stack': (d, i) => i
//     }).each(function (d, i) {
//       if (stacked) {
//         const preChildren = children.slice(0, i);
//         //if shown as stacked bar shift individual cells of a column to the left where they belong to
//         context.cellX = (index) => {
//           //shift by all the empty space left from the previous columns
//           return ueber(index) - preChildren.reduce((prev, child) => prev + child.getWidth() * (1 - child.getValue(rows[index].v)), 0);
//         };
//       }
//       context.render(d, d3.select(this), rows, context);
//     });
//     animated($children, context).attr({
//       transform: (d, i) => `translate(${shifts[i]},0)`
//     });
//     $children.exit().remove();
//
//     context.cellX = ueber;
//     context.option = ueberOption;
//   }
// }
// /**
//  * returns a map of all known renderers by type
//  * @return
//  */
// export function renderers() {
//   return {
//     stack: new StackCellRenderer(),
//     actions: new ActionCellRenderer(),
//     annotate: new AnnotateCellRenderer(),
//     nested: new StackCellRenderer(false)
//   };
// }


const combineCellRenderer = new BarCellRenderer(false, (d,i,col: any) => col.getColor(d));
const renderers = {
  rank: new DefaultCellRenderer('rank', 'right'),
  boolean: new DefaultCellRenderer('boolean', 'center'),
  number: new BarCellRenderer(),
  ordinal: new BarCellRenderer(true, (d,i,col: any) => col.getColor(d)),
  string: new StringCellRenderer(),
  selection: {
    createSVG: createSelectionSVG,
    createHTML: createSelectionHTML
  },
  heatmap: {
    createSVG: createHeatmapSVG,
    createHTML: createHeatmapHTML
  },
  link: {
    createSVG: createLinkSVG,
    createHTML: createLinkHTML
  },
  categorical: new CategoricalCellRenderer(),
  max: combineCellRenderer,
  min: combineCellRenderer,
  mean: combineCellRenderer,
  script: combineCellRenderer,
  default_: new DefaultCellRenderer()
};

export function createSVGRenderer(col: model.Column, context: IDOMRenderContext): ISVGCellRenderer {
  const r = renderers[col.desc.type];
  if (r) {
    return r.createSVG(col, context);
  }
  return renderers.default_.createSVG(col, context);
}
export function createHTMLRenderer(col: model.Column, context: IDOMRenderContext): IHTMLCellRenderer {
  const r = renderers[col.desc.type];
  if (r) {
    return r.createHTML(col, context);
  }
  return renderers.default_.createHTML(col, context);
}
