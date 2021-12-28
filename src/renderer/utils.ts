import { MIN_LABEL_WIDTH } from '../constants';
import { Column, IArrayColumn, IDataRow, ICategoricalLikeColumn, isMapAbleColumn, DEFAULT_COLOR } from '../model';
import { hsl } from 'd3-color';
import { cssClass } from '../styles';
import type { ISequence } from '../internal';
import type { IRenderContext } from './interfaces';

/** @internal */
export function noop() {
  // no op
}

export const noRenderer = {
  template: `<div></div>`,
  update: noop as () => void,
};

/** @internal */
export function setText<T extends Node>(node: T, text?: string): T {
  if (text === undefined) {
    return node;
  }
  //no performance boost if setting the text node directly
  //const textNode = <Text>node.firstChild;
  //if (textNode == null) {
  //  node.appendChild(node.ownerDocument!.createTextNode(text));
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
 * @internal
 */
export function forEach<T extends Element>(node: Element, selector: string, callback: (d: T, i: number) => void) {
  Array.from(node.querySelectorAll<T>(selector)).forEach(callback);
}

/** @internal */
export function forEachChild<T extends Element>(node: Element, callback: (d: T, i: number) => void) {
  (Array.from(node.children) as T[]).forEach(callback);
}

/**
 * matches the columns and the dom nodes representing them
 * @param {HTMLElement} node row
 * @param columns columns to check
 * @internal
 */
export function matchColumns(
  node: HTMLElement,
  columns: { column: Column; template: string; rendererId: string }[],
  ctx: IRenderContext
) {
  if (node.childElementCount === 0) {
    // initial call fast method
    node.innerHTML = columns.map((c) => c.template).join('');
    const children = Array.from(node.children);
    columns.forEach((col, i) => {
      const childNode = children[i] as HTMLElement;
      // set attribute for finding again
      childNode.dataset.columnId = col.column.id;
      // store current renderer
      childNode.dataset.renderer = col.rendererId;
      childNode.classList.add(cssClass(`renderer-${col.rendererId}`));
    });
    return;
  }

  function matches(c: { column: Column; rendererId: string }, i: number) {
    //do both match?
    const n = node.children[i] as HTMLElement;
    return n != null && n.dataset.columnId === c.column.id && n.dataset.renderer === c.rendererId;
  }

  if (columns.every(matches)) {
    return; //nothing to do
  }

  const idsAndRenderer = new Set(columns.map((c) => `${c.column.id}@${c.rendererId}`));
  //remove all that are not existing anymore
  forEachChild(node, (n: HTMLElement) => {
    const id = n.dataset.columnId;
    const renderer = n.dataset.renderer;
    const idAndRenderer = `${id}@${renderer}`;
    if (!idsAndRenderer.has(idAndRenderer)) {
      node.removeChild(n);
    }
  });
  columns.forEach((col) => {
    let childNode = node.querySelector<HTMLElement>(`[data-column-id="${col.column.id}"]`);
    if (!childNode) {
      childNode = ctx.asElement(col.template);
      childNode.dataset.columnId = col.column.id;
      childNode.dataset.renderer = col.rendererId;
      childNode.classList.add(cssClass(`renderer-${col.rendererId}`));
    }
    node.appendChild(childNode);
  });
}

export function wideEnough(col: IArrayColumn<any>, length: number = col.labels.length) {
  const w = col.getWidth();
  return w / length > MIN_LABEL_WIDTH; // at least 30 pixel
}

export function wideEnoughCat(col: ICategoricalLikeColumn) {
  const w = col.getWidth();
  return w / col.categories.length > MIN_LABEL_WIDTH; // at least 30 pixel
}

// side effect
const adaptTextColorToBgColorCache: { [bg: string]: string } = {};
/**
 * Adapts the text color for a given background color
 * @param {string} bgColor as `#ff0000`
 * @returns {string} returns `black` or `white` for best contrast
 */
export function adaptTextColorToBgColor(bgColor: string): string {
  const bak = adaptTextColorToBgColorCache[bgColor];
  if (bak) {
    return bak;
  }
  return (adaptTextColorToBgColorCache[bgColor] = hsl(bgColor).l > 0.5 ? 'black' : 'white');
}

/**
 *
 * Adapts the text color for a given background color
 * @param {HTMLElement} node the node containing the text
 * @param {string} bgColor as `#ff0000`
 * @param {string} title the title to render
 * @param {number} width for which percentages of the cell this background applies (0..1)
 */
export function adaptDynamicColorToBgColor(node: HTMLElement, bgColor: string, title: string, width: number) {
  const adapt = adaptTextColorToBgColor(bgColor);
  if (width <= 0.05 || adapt === 'black' || width > 0.9) {
    // almost empty or full
    node.style.color = adapt === 'black' || width <= 0.05 ? null : adapt; // null = black
    // node.classList.remove('lu-gradient-text');
    // node.style.backgroundImage = null;
    return;
  }

  node.style.color = null;
  node.innerText = title;

  const span = node.ownerDocument!.createElement('span');
  span.classList.add(cssClass('gradient-text'));
  span.style.color = adapt;
  span.innerText = title;
  node.appendChild(span);
}

/** @internal */
export const uniqueId: (prefix: string) => string = (function () {
  // side effect but just within the function itself, so good for the library
  let idCounter = 0;
  return (prefix: string) => `${prefix}${(idCounter++).toString(36)}`;
})();

const NUM_EXAMPLE_VALUES = 5;

/** @internal */
export function exampleText(col: Column, rows: ISequence<IDataRow>) {
  const examples: string[] = [];
  rows.every((row) => {
    if (col.getValue(row) == null) {
      return true;
    }
    const v = col.getLabel(row);
    examples.push(v);
    return examples.length < NUM_EXAMPLE_VALUES;
  });
  if (examples.length === 0) {
    return '';
  }
  return `${examples.join(', ')}${examples.length < rows.length ? ', ...' : ''}`;
}

/** @internal */
export function multiLevelGridCSSClass(idPrefix: string, column: Column) {
  return cssClass(`stacked-${idPrefix}-${column.id}`);
}

/** @internal */
export function colorOf(col: Column) {
  if (isMapAbleColumn(col)) {
    return col.getColorMapping().apply(0);
  }
  return DEFAULT_COLOR;
}

// side effect
const adaptColorCache: { [bg: string]: string } = {};

export const BIG_MARK_LIGHTNESS_FACTOR = 1.1;
export const SMALL_MARK_LIGHTNESS_FACTOR = 0.9;

export function adaptColor(color: string, lightnessFactor = 1, saturationFactor = 1): string {
  const key = `${color}-${saturationFactor}-${lightnessFactor}`;
  const r = adaptColorCache[key];
  if (r) {
    return r;
  }
  const hslColor = hsl(color);
  hslColor.s = Math.max(Math.min(hslColor.s * saturationFactor, 1), 0);
  hslColor.l = Math.max(Math.min(hslColor.l * lightnessFactor, 1), 0);
  const result = hslColor.formatHex();
  adaptColorCache[key] = result;
  return result;
}
