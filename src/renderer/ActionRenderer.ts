import { IDataRow, IOrderedGroup, ActionColumn, Column } from '../model';
import {
  IRenderContext,
  ERenderMode,
  ICellRendererFactory,
  ICellRenderer,
  IGroupCellRenderer,
  ISummaryRenderer,
} from './interfaces';
import { forEachChild, noRenderer } from './utils';
import { cssClass } from '../styles';

export default class ActionRenderer implements ICellRendererFactory {
  readonly title = 'Default';

  canRender(col: Column, mode: ERenderMode): boolean {
    return col instanceof ActionColumn && mode !== ERenderMode.SUMMARY;
  }

  create(col: ActionColumn, context: IRenderContext): ICellRenderer {
    const actions = col.actions;
    return {
      template: `<div class="${cssClass('actions')} ${cssClass('hover-only')}">${actions
        .map(
          (a) =>
            `<span title='${context.sanitize(a.name)}' class='${context.sanitize(
              a.className || ''
            )}'>${context.sanitize(a.icon || '')}</span>`
        )
        .join('')}</div>`,
      update: (n: HTMLElement, d: IDataRow) => {
        forEachChild(n, (ni: HTMLSpanElement, i: number) => {
          ni.onclick = function (event) {
            event.preventDefault();
            event.stopPropagation();
            setTimeout(() => actions[i].action(d), 1); // async
          };
        });
      },
    };
  }

  createGroup(col: ActionColumn, context: IRenderContext): IGroupCellRenderer {
    const actions = col.groupActions;
    return {
      template: `<div class="${cssClass('actions')} ${cssClass('hover-only')}">${actions
        .map(
          (a) =>
            `<span title='${context.sanitize(a.name)}' class='${context.sanitize(
              a.className || ''
            )}'>${context.sanitize(a.icon || '')}</span>`
        )
        .join('')}</div>`,
      update: (n: HTMLElement, group: IOrderedGroup) => {
        forEachChild(n, (ni: HTMLSpanElement, i: number) => {
          ni.onclick = function (event) {
            event.preventDefault();
            event.stopPropagation();
            context.tasks
              .groupRows(col, group, 'identity', (r) => r)
              .then((rows) => {
                if (typeof rows === 'symbol') {
                  return;
                }
                setTimeout(() => actions[i].action(group, Array.from(rows)), 1); // async
              });
          };
        });
      },
    };
  }

  createSummary(): ISummaryRenderer {
    return noRenderer;
  }
}
