import Column from '../model/Column';
import {IDOMCellRenderer, IDOMGroupRenderer} from './IDOMCellRenderers';

/**
 * utility function to sets attributes and styles in a nodes
 * @param node
 * @param attrs
 * @param styles
 * @param text
 * @return {T}
 */
export function attr<T extends (HTMLElement | SVGElement)>(node: T, attrs: { [key: string]: any } = {}, styles: { [key: string]: any } = {}, text?: string): T {
  Object.keys(attrs).forEach((attr) => {
    const v = String(attrs[attr]);
    if (node.getAttribute(attr) !== v) {
      node.setAttribute(attr, v);
    }
  });
  Object.keys(styles).forEach((attr) => {
    const v = styles[attr];
    if ((<any>node).style.getPropertyValue(attr) !== v) {
      (<any>node).style.setProperty(attr, v);
    }
  });
  return setText(node, text);
}

export function setText<T extends Node>(node: T, text?: string): T {
  if (text === undefined) {
    return node;
  }
  //no performance boost if setting the text node directly
  //const textNode = <Text>node.firstChild;
  //if (textNode == null) {
  //  node.appendChild(node.ownerDocument.createTextNode(text));
  //} else {
  //  textNode.data = text;
  //}
  if (node.textContent !== text) {
    node.textContent = text;
  }
  return node;
}

/**
 * for each item matching the selector execute the callback
 * @param node
 * @param selector
 * @param callback
 */
export function forEach<T extends Element>(node: T, selector: string, callback: (d: Element, i: number) => void) {
  Array.from(node.querySelectorAll(selector)).forEach(callback);
}

export function forEachChild<T extends Element>(node: T, callback: (d: Element, i: number) => void) {
  Array.from(node.children).forEach(callback);
}

export interface ITextRenderHints {
  readonly maxLetterWidth: number;
  readonly avgLetterWidth: number;
  readonly ellipsisWidth: number;
  readonly spinnerWidth: number;
}

const ellipsis = '…';

function measureFontAweSomeSpinner(ctx: CanvasRenderingContext2D) {
  ctx.font = '10pt FontAwesome';
  return ctx.measureText('\uf110').width;
}

export function createTextHints(ctx: CanvasRenderingContext2D, font: string): ITextRenderHints {
  const bak = ctx.font;
  const spinnerWidth = measureFontAweSomeSpinner(ctx);
  ctx.font = font;
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  const testText = `${alphabet}${alphabet.toUpperCase()}0123456789`;
  const r = {
    maxLetterWidth: ctx.measureText('M').width,
    avgLetterWidth: ctx.measureText(testText).width / testText.length,
    ellipsisWidth: ctx.measureText(ellipsis).width,
    spinnerWidth
  };
  ctx.font = bak;
  return r;
}

export function clipText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, hints: ITextRenderHints) {
  //based on http://stackoverflow.com/questions/10508988/html-canvas-text-overflow-ellipsis#10511598
  const render = (t: string) => ctx.fillText(t, x, y, maxWidth);

  //check if using heuristics
  if (hints.maxLetterWidth * text.length <= maxWidth || maxWidth <= hints.ellipsisWidth || text.length === 0) {
    return render(text);
  }

  //check precisely
  if (ctx.measureText(text).width <= maxWidth) {
    return render(text);
  }

  const availWidth = maxWidth - hints.ellipsisWidth;

  // use binary search
  let min = 0;
  let max = text.length - 1;
  // guess first based on average letter width
  let guess = Math.min(max, Math.floor(maxWidth / hints.avgLetterWidth));
  while (min < max) {
    const overflow = availWidth - ctx.measureText(text.substring(0, guess + 1)).width;
    if (overflow < 0) { //less characters needed
      max = guess - 1;
    } else if (overflow > 0) { // more characters possible
      min = guess + 1;
    } else { //hit it :)
      break;
    }
    guess = Math.floor((max + min) / 2); //compute next guess
  }
  return render(text.substring(0, min + 1) + ellipsis);
}

export function showOverlay(parentElement: HTMLElement, id: string, dx: number, dy: number) {
  let overlay = <HTMLDivElement>parentElement.querySelector(`div.lu-overlay#O${id}`);
  if (!overlay) {
    overlay = parentElement.ownerDocument.createElement('div');
    overlay.classList.add('lu-overlay');
    overlay.id = `O${id}`;
    parentElement.appendChild(overlay);
  }
  overlay.style.display = 'block';
  overlay.style.left = `${dx}px`;
  overlay.style.top = `${dy}px`;
  return overlay;
}

export function hideOverlays(parentElement: HTMLElement) {
  forEach(parentElement, 'div.lu-overlay', (d: HTMLDivElement) => d.style.display = null);
}


/**
 * matches the columns and the dom nodes representing them
 * @param {SVGGElement | HTMLElement} node row
 * @param {{column: Column; renderer: IDOMCellRenderer}[]} columns columns to check
 * @param {string} helperType create types of
 */
export function matchColumns(node: SVGGElement | HTMLElement, columns: { column: Column, renderer: IDOMCellRenderer, groupRenderer: IDOMGroupRenderer }[], render: 'group' | 'detail', helperType = 'svg') {
  const renderer = render === 'detail' ? (col: { column: Column }) => col.column.getRenderer() : (col: { column: Column }) => col.column.getGroupRenderer();
  if (node.childElementCount === 0) {
    // initial call fast method
    node.innerHTML = columns.map((c) => (render === 'detail' ? c.renderer : c.groupRenderer).template).join('');
    columns.forEach((col, i) => {
      const cnode = <Element>node.childNodes[i];
      // set attribute for finding again
      cnode.setAttribute('data-column-id', col.column.id);
      // store current renderer
      cnode.setAttribute('data-renderer', renderer(col));
    });
    return;
  }

  function matches(c: { column: Column }, i: number) {
    //do both match?
    const n = <Element>(node.childElementCount <= i ? null : node.childNodes[i]);
    return n != null && n.getAttribute('data-column-id') === c.column.id && n.getAttribute('data-renderer') === renderer(c);
  }

  if (columns.every(matches)) {
    return; //nothing to do
  }

  const idsAndRenderer = new Set(columns.map((c) => `${c.column.id}@${renderer(c)}`));
  //remove all that are not existing anymore
  Array.from(node.childNodes).forEach((n: Element) => {
    const id = n.getAttribute('data-column-id');
    const renderer = n.getAttribute('data-renderer');
    const idAndRenderer = `${id}@${renderer}`;
    if (!idsAndRenderer.has(idAndRenderer)) {
      node.removeChild(n);
    }
  });
  const helper = helperType === 'svg' ? document.createElementNS('http://www.w3.org/2000/svg', 'g') : document.createElement('div');
  columns.forEach((col) => {
    let cnode = node.querySelector(`[data-column-id="${col.column.id}"]`);
    if (!cnode) {
      //create one
      helper.innerHTML = (render === 'detail' ? col.renderer : col.groupRenderer).template;
      cnode = <Element>helper.childNodes[0];
      cnode.setAttribute('data-column-id', col.column.id);
      cnode.setAttribute('data-renderer', renderer(col));
    }
    node.appendChild(cnode);
  });
}
