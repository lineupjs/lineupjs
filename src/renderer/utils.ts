import Column from '../model/Column';
import {ICellRenderer, IGroupCellRenderer} from './interfaces';

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

export function noop() {
  // no op
}

export const noRenderer = {
  template: ``,
  update: noop,
  render: noop
};

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

/**
 * matches the columns and the dom nodes representing them
 * @param {SVGGElement | HTMLElement} node row
 * @param {{column: Column; renderer: IDOMCellRenderer}[]} columns columns to check
 * @param {string} helperType create types of
 */
export function matchColumns(node: SVGGElement | HTMLElement, columns: { column: Column, renderer: ICellRenderer, groupRenderer: IGroupCellRenderer }[], render: 'group' | 'detail', helperType = 'svg') {
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
