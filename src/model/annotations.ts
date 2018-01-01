import 'reflect-metadata';
import ADialog from '../ui/dialogs/ADialog';
import {IFilterDialog, IRankingHeaderContext} from '../ui/interfaces';
import Column from './Column';

const supportType = Symbol('SupportType');
const uiSymbol = Symbol('ui');

export function SupportType() {
  return Reflect.metadata(supportType, true);
}

export interface IUIOptions {
  shortCut: boolean;
  order: number;
}


export interface IToolbarAction {
  title: string;

  onClick(col: Column, evt: { stopPropagation: () => void, currentTarget: Element, [key: string]: any }, ctx: IRankingHeaderContext): any;

  options: Partial<IUIOptions>;
}


export function ui(title: string, onClick: (col: Column, evt: { stopPropagation: () => void, currentTarget: Element, [key: string]: any }, ctx: IRankingHeaderContext) => any, options: Partial<IUIOptions> = {}) {
  return Reflect.metadata(uiSymbol, <IToolbarAction>{title, onClick, options});
}

export interface IDialogClass {
  new(col: any, icon: HTMLElement, ...args: any[]): ADialog;
}

export function uiDialog(title: string, dialogClass: IDialogClass, extraArgs: ((ctx: IRankingHeaderContext) => any[]) = () => []) {
  return ui(title, (col, evt, ctx) => {
    const dialog = new dialogClass(col, <HTMLElement>evt.currentTarget, ... extraArgs(ctx));
    dialog.openDialog();
  });
}

export function filterBy(dialogClass: IFilterDialog) {
  return uiDialog('Filter &hellip;', dialogClass, (ctx) => ['', ctx.provider, ctx.idPrefix]);
}

const sortAble: IToolbarAction = {
  title: 'Sort',
  onClick: (col) => {
    col.toggleMySorting();
  },
  options: {
    shortCut: true,
    order: 1
  }
};

const cache = new Map<string, IToolbarAction[]>();

export function getAllToolbarActions(col: Column) {
  if (cache.has(col.desc.type)) {
    return cache.get(col.desc.type)!;
  }
  const actions = <IToolbarAction[]>[];

  const clazz = (<any>col).constructor;

  if (!Reflect.hasMetadata(supportType, clazz)) {
    actions.push(sortAble);
  }
  // walk up the prototype chain
  let obj = <any>col;
  do {
    Object.getOwnPropertyNames(obj).forEach((propertyKey) => {
      const m = Reflect.getOwnMetadata(uiSymbol, obj, propertyKey);
      if (m) {
        actions.push(m);
      }
    });
    obj = Object.getPrototypeOf(obj);
  } while (obj);

  actions.sort((a, b) => (a.options.order || 99) - (b.options.order || 99));
  cache.set(col.desc.type, actions);
  return actions;
}
