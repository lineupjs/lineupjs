export interface IPoorManIdleDeadline {
  didTimeout: boolean;
  timeRemaining(): number;
}

export interface IPoorManIdleCallback {
  requestIdleCallback(callback: (deadline: IPoorManIdleDeadline) => void, options?: {timeout: number}): number;

  clearIdleCallback(callbackId: number): void;
}

export interface ITask<T> {
  calc: () => T | PromiseLike<T>;
  resolve(r: T | PromiseLike<T>): void;
  result: PromiseLike<T>;
}

export default class TaskScheduler {
  private readonly tasks: ITask<any>[] = [];
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

  push<T>(calc: () => T | PromiseLike<T>): Promise<T> {
    const p = new Promise<T>((resolve) => {
      this.tasks.push({
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
    return p;
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

    this.tasks.splice(0, this.tasks.length);
  }
}
