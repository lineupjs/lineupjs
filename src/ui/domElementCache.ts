

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
      return <HTMLElement>cache.get(html)!.cloneNode(true);
    }

    helper.innerHTML = html;
    const node = <HTMLElement>helper.firstElementChild!;
    // keep a copy
    cache.set(html, <HTMLElement>node.cloneNode(true));

    return node;
  };
}
