import {IAbortAblePromise, ABORTED} from 'lineupengine';
export {IAbortAblePromise, ABORTED} from 'lineupengine';

export interface IPoorManIdleDeadline {
  didTimeout: boolean;
  timeRemaining(): number;
}

export interface IPoorManIdleCallback {
  requestIdleCallback(callback: (deadline: IPoorManIdleDeadline) => void, options?: {timeout: number}): number;

  clearIdleCallback(callbackId: number): void;
}

export interface ITask<T> {
  id: string;
  calc: () => T | PromiseLike<T>;
  resolve(r: T | PromiseLike<T> | symbol): void;
  result: PromiseLike<T | symbol>;
}

export default class TaskScheduler {
  private tasks: ITask<any>[] = [];
  private taskId: number = -1;

  private runTasks = (deadline: IPoorManIdleDeadline) => {
    while (this.tasks.length > 0 && (deadline.didTimeout || deadline.timeRemaining() > 0)) {
      const task = this.tasks.shift()!;

      const r = task.calc();
      requestAnimationFrame(() => task.resolve(r));
    }

    if (this.tasks.length > 0) {
      this.taskId = (<IPoorManIdleCallback><any>self).requestIdleCallback(this.runTasks);
    } else {
      this.taskId = -1;
    }
  }

  push<T>(id: string, calc: () => T | PromiseLike<T>): IAbortAblePromise<T> {
    // abort task with the same id
    const abort = () => {
      const index = this.tasks.findIndex((d) => d.id === id);
      if (index < 0) {
        return; // too late or none
      }
      const task = this.tasks[index];
      this.tasks.splice(index, 1);

      task.resolve(ABORTED);
    };

    abort(); // abort existing with same id

    const p = new Promise<T>((resolve) => {
      this.tasks.push({
        id,
        calc,
        result: p,
        resolve
      });

      if (this.taskId !== -1) {
        return;
      }

      const ww = (<IPoorManIdleCallback><any>self);
      if (ww.requestIdleCallback) {
        this.taskId = ww.requestIdleCallback(this.runTasks);
      } else {
        this.taskId = self.setTimeout(this.runTasks, 1);
      }
    });
    (<any>p).abort = abort;
    return <IAbortAblePromise<T>>p;
  }

  abort(id: string) {
    const index = this.tasks.findIndex((d) => d.id === id);
    if (index < 0) {
      return false; // too late or none
    }
    const task = this.tasks[index];
    this.tasks.splice(index, 1);

    task.resolve(ABORTED);
    return true;
  }

  abortAll(filter: (task: ITask<any>) => boolean) {
    const abort = this.tasks.filter(filter);
    if (abort.length === 0) {
      return;
    }
    this.tasks = this.tasks.filter((d) => !filter(d));
    for (const task of abort) {
      task.resolve(ABORTED);
    }
  }

  clear() {
    if (this.taskId === -1) {
      return;
    }
    const ww = (<IPoorManIdleCallback><any>self);
    if (ww.requestIdleCallback) {
      ww.clearIdleCallback(this.taskId);
    } else {
      self.clearTimeout(this.taskId);
    }
    this.taskId = -1;

    this.tasks.splice(0, this.tasks.length).forEach((d) => d.resolve(ABORTED));
  }
}
