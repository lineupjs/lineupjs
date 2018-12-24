import {ILineUpFlags} from '../config';
import {Column, IGroupData, IGroupItem} from '../model';
import {IDataProvider} from '../provider';
import {IImposer, IRenderContext, ISummaryRenderer} from '../renderer';
import DialogManager from './dialogs/DialogManager';
import {IDialogContext} from './dialogs';

export interface IUIOptions {
  shortcut: boolean | 'only';
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

export interface IToolbarDialogAddon {
  title: string;

  order: number;

  append(col: Column, node: HTMLElement, dialog: IDialogContext, ctx: IRankingHeaderContext): void;
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

  readonly toolbar: {[key: string]: IToolbarAction | IToolbarDialogAddon};

  readonly flags: ILineUpFlags;

  getPossibleRenderer(col: Column): {item: IRenderInfo[], group: IRenderInfo[], summary: IRenderInfo[]};

  summaryRenderer(co: Column, interactive: boolean, imposer?: IImposer): ISummaryRenderer;
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
  BAND = 'band'
}
