
export interface IPoorManWorkerScopeEventMap {
  message: MessageEvent;
  error: ErrorEvent;
}

export interface IPoorManWorkerScope {
  onmessage: ((this: IPoorManWorkerScope, ev: MessageEvent) => any) | null;
  onerror: ((this: IPoorManWorkerScope, ev: ErrorEvent) => any) | null;
  close(): void;
  postMessage(message: any, transfer?: Transferable[]): void;
  addEventListener<K extends keyof IPoorManWorkerScopeEventMap>(type: K, listener: (this: IPoorManWorkerScope, ev: IPoorManWorkerScopeEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
  removeEventListener<K extends keyof IPoorManWorkerScopeEventMap>(type: K, listener: (this: IPoorManWorkerScope, ev: IPoorManWorkerScopeEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
}

function workerMain(self: IPoorManWorkerScope) {
  self.addEventListener('message', (evt) => {
    self.postMessage(`Worker: ${evt.data} - Polo`);
  });
}

export function toFunctionBody(f: Function) {
  const source = f.toString();
  return source.slice(source.indexOf('{') + 1, source.lastIndexOf('}'));
}

export function createWorker(fs: (string | Function)[]) {
  const sources = fs.map((d) => d.toString()).join('\n\n');

  const blob = new Blob([sources], {type: 'application/javascript'});

  return new Worker(URL.createObjectURL(blob));
}
