/**
 * caches parsing of html strings in a dom element cache
 * @param doc the doc to create the elements under
 * @internal
 */
export default function domElementCache(doc: Document): (html: string) => HTMLElement {
  const cache = new Map<string, HTMLElement>();

  const helper = doc.createElement('div');

  return (html: string) => {
    if (cache.has(html)) {
      return cache.get(html)!.cloneNode(true) as HTMLElement;
    }

    helper.innerHTML = html;
    const node = helper.firstElementChild! as HTMLElement;
    // keep a copy
    cache.set(html, node.cloneNode(true) as HTMLElement);

    return node;
  };
}

export function createSanitizer(doc: Document): (v: string) => string {
  // prepare variables
  // based on https://stackoverflow.com/questions/24816/escaping-html-strings-with-jquery/17546215#17546215
  const textNode = doc.createTextNode('');
  const wrapper = doc.createElement('div');
  wrapper.appendChild(textNode);

  return (v: string) => {
    if (!v) {
      return '';
    }
    textNode.nodeValue = v;
    return wrapper.innerHTML;
  };
}
