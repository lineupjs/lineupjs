import {IWorkerMessage} from './math';

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

// function workerMain(self: IPoorManWorkerScope) {
//   self.addEventListener('message', (evt) => {
//     self.postMessage(`Worker: ${evt.data} - Polo`);
//   });
// }

export function toFunctionBody(f: Function) {
  const source = f.toString();
  return source.slice(source.indexOf('{') + 1, source.lastIndexOf('}'));
}

export function createWorkerCodeBlob(fs: (string | Function)[]) {
  const sources = fs.map((d) => d.toString()).join('\n\n');

  const blob = new Blob([sources], {type: 'application/javascript'});
  return URL.createObjectURL(blob);
}

export function createWorker(fs: (string | Function)[]) {
  return new Worker(createWorkerCodeBlob(fs));
}

const MAX_WORKER_THREADS = Math.max(navigator.hardwareConcurrency, 1);
const MIN_WORKER_THREADS = 1;
const THREAD_CLEANUP_TIME = 10000; // 10s

export class WorkerTaskScheduler {
  private readonly workers: {worker: Worker, tasks: Set<number>}[] = [];
  private cleanUpWorkerTimer: number = -1;
  private workerTaskCounter = 0;

  constructor(private readonly blob: string, private readonly initWorker: (push: (type: string, msg: any) => void) => void) {
    // start with two worker
    for (let i = 0; i < MIN_WORKER_THREADS; ++i) {
      const w = new Worker(blob);
      initWorker(this.sendMessageTo(w));
      this.workers.push({worker: w, tasks: new Set()});
    }
  }

  terminate() {
    this.workers.splice(0, this.workers.length).forEach((w) => w.worker.terminate());
  }

  private readonly cleanUpWorker = () => {
    this.workers.splice(0, MIN_WORKER_THREADS).forEach((w) => w.worker.terminate());
  }

  private checkOutWorker() {
    if (this.cleanUpWorkerTimer >= 0) {
      clearTimeout(this.cleanUpWorkerTimer);
      this.cleanUpWorkerTimer = -1;
    }

    const emptyWorker = this.workers.find((d) => d.tasks.size === 0);

    if (emptyWorker) {
      return emptyWorker;
    }

    if (this.workers.length >= MAX_WORKER_THREADS) {
      // find the one with the fewest tasks
      return this.workers.reduce((a, b) => a == null || a.tasks.size > b.tasks.size ? b : a, <{worker: Worker, tasks: Set<number>} | null>null)!;
    }

    // create new one
    const r = {
      worker: new Worker(this.blob),
      tasks: new Set<number>()
    };
    this.initWorker(this.sendMessageTo(r.worker));
    this.workers.push(r);
    return r;
  }

  private finshedTask() {
    if (this.cleanUpWorkerTimer === -1 && this.workers.length > MIN_WORKER_THREADS) {
      this.cleanUpWorkerTimer = self.setTimeout(this.cleanUpWorker, THREAD_CLEANUP_TIME);
    }
  }

  push<M, R, T>(type: string, args: Exclude<M, IWorkerMessage>, transferAbles: ArrayBuffer[], toResult: (r: R) => T) {
    return new Promise<T>((resolve) => {
      const uid = this.workerTaskCounter++;
      const {worker, tasks} = this.checkOutWorker();

      const receiver = (msg: MessageEvent) => {
        const r = <IWorkerMessage>msg.data;
        if (r.uid !== uid || r.type !== type) {
          return;
        }
        worker.removeEventListener('message', receiver);
        tasks.delete(uid);
        this.finshedTask();
        resolve(toResult(<any>r));
      };

      worker.addEventListener('message', receiver);
      tasks.add(uid);
      worker.postMessage(Object.assign({
        type,
        uid
      }, args), transferAbles);
    });
  }

  broadCast<T>(type: string, msg: T) {
    const uid = this.workerTaskCounter++;
    // don't store in tasks queue since there is no response
    for (const w of this.workers) {
      w.worker.postMessage(Object.assign({
        type,
        uid
      }, msg));
    }
  }

  private sendMessageTo(worker: Worker) {
    return <T>(type: string, msg: T) => {
      const uid = this.workerTaskCounter++;
      // don't store in tasks queue since there is no response
      worker.postMessage(Object.assign({
        type,
        uid
      }, msg));
    };
  }

}
