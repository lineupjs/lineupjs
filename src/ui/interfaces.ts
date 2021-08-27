import type { ILineUpFlags } from '../config';
import type { Column, IGroupData, IGroupItem } from '../model';
import type { IDataProvider } from '../provider';
import type { IImposer, IRenderContext, ISummaryRenderer } from '../renderer';
import type DialogManager from './dialogs/DialogManager';
import type { IDialogContext } from './dialogs';

export interface IUIOptions {
  /**
   * whether to show this action as a shortcut action
   * @default 'menu'
   */
  mode:
    | 'menu'
    | 'menu+shortcut'
    | 'shortcut'
    | ((col: Column, mode: 'sidePanel' | 'header') => 'menu' | 'menu+shortcut' | 'shortcut');

  /**
   * order hint for sorting actions
   * @default 50
   */
  order: number;

  featureLevel: 'basic' | 'advanced';
  featureCategory: 'ranking' | 'model' | 'ui';
}

export interface IOnClickHandler {
  (col: Column, evt: MouseEvent, ctx: IRankingHeaderContext, level: number, viaShortcut: boolean): any;
}

export interface IToolbarAction {
  title: string;

  enabled?(col: Column): boolean;

  onClick: IOnClickHandler;

  options: Partial<IUIOptions>;
}

export interface IToolbarDialogAddonHandler {
  elems: string | (HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement)[];
  reset(): void;
  submit(): boolean | undefined;
  cancel(): void;
}

export interface IToolbarDialogAddon {
  title: string;

  order: number;

  append(
    col: Column,
    node: HTMLElement,
    dialog: IDialogContext,
    ctx: IRankingHeaderContext
  ): IToolbarDialogAddonHandler;
}

export interface IRenderInfo {
  type: string;
  label: string;
}

export interface IRankingHeaderContextContainer {
  readonly idPrefix: string;
  readonly document: Document;
  readonly provider: IDataProvider;

  readonly dialogManager: DialogManager;

  asElement(html: string): HTMLElement;
  sanitize(text: string): string;

  resolveToolbarActions(col: Column, keys: string[]): IToolbarAction[];
  resolveToolbarDialogAddons(col: Column, keys: string[]): IToolbarDialogAddon[];

  readonly flags: ILineUpFlags;

  getPossibleRenderer(col: Column): { item: IRenderInfo[]; group: IRenderInfo[]; summary: IRenderInfo[] };

  summaryRenderer(co: Column, interactive: boolean, imposer?: IImposer): ISummaryRenderer;

  readonly caches: {
    toolbar: Map<string, IToolbarAction[]>;
    toolbarAddons: Map<string, IToolbarDialogAddon[]>;
  };
}

export interface IRankingBodyContext extends IRankingHeaderContextContainer, IRenderContext {
  isGroup(index: number): boolean;

  getGroup(index: number): IGroupData;

  getRow(index: number): IGroupItem;
}

export declare type IRankingHeaderContext = Readonly<IRankingHeaderContextContainer>;

export declare type IRankingContext = Readonly<IRankingBodyContext>;

export enum EMode {
  ITEM = 'item',
  BAND = 'band',
}
