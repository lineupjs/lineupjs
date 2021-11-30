import type { IAdvancedBoxPlotData } from '../internal';
import { Column, INumberColumn, IOrderedGroup, isMapAbleColumn, isNumberColumn, NumberColumn } from '../model';
import { tasksAll } from '../provider';
import { cssClass } from '../styles';
import { computeLabel } from './BoxplotCellRenderer';
import { colorOf } from './impose';
import {
  ERenderMode,
  ICellRenderer,
  ICellRendererFactory,
  IGroupCellRenderer,
  IImposer,
  IRenderContext,
  ISummaryRenderer,
} from './interfaces';
import { noRenderer } from './utils';

const VIOLIN = `<div title="">
  <svg class="${cssClass('violin')}">
  </svg>
</div>`;

const MAPPED_VIOLIN = `<div title="">
  <svg class="${cssClass('violin')}">
  </svg>
  <span class="${cssClass('mapping-hint')}"></span><span class="${cssClass('mapping-hint')}"></span>
</div>`;

export default class ViolinPlotCellRenderer implements ICellRendererFactory {
  readonly title: string = 'Violin Plot';

  canRender(col: Column, mode: ERenderMode): boolean {
    return isNumberColumn(col) && mode !== ERenderMode.CELL;
  }

  create(): ICellRenderer {
    return noRenderer;
  }

  createGroup(col: INumberColumn, context: IRenderContext, imposer?: IImposer): IGroupCellRenderer {
    const sort = col instanceof NumberColumn && col.isGroupSortedByMe().asc !== undefined ? col.getSortMethod() : '';
    return {
      template: VIOLIN,
      update: (n: HTMLElement, group: IOrderedGroup) => {
        return tasksAll([
          context.tasks.groupBoxPlotStats(col, group, false),
          context.tasks.groupBoxPlotStats(col, group, true),
        ]).then((data) => {
          if (typeof data === 'symbol') {
            return;
          }
          // render
          const isMissing =
            data == null ||
            data[0] == null ||
            data[0].group.count === 0 ||
            data[0].group.count === data[0].group.missing;
          n.classList.toggle(cssClass('missing'), isMissing);
          if (isMissing) {
            return;
          }
          renderViolin(col, n, data[0].group, data[1].group, sort, colorOf(col, null, imposer));
        });
      },
    };
  }

  createSummary(
    col: INumberColumn,
    context: IRenderContext,
    _interactive: boolean,
    imposer?: IImposer
  ): ISummaryRenderer {
    return {
      template: isMapAbleColumn(col) ? MAPPED_VIOLIN : VIOLIN,
      update: (n: HTMLElement) => {
        return tasksAll([
          context.tasks.summaryBoxPlotStats(col, false),
          context.tasks.summaryBoxPlotStats(col, true),
        ]).then((data) => {
          if (typeof data === 'symbol') {
            return;
          }
          const isMissing =
            data == null ||
            data[0] == null ||
            data[0].summary.count === 0 ||
            data[0].summary.count === data[0].summary.missing;
          n.classList.toggle(cssClass('missing'), isMissing);
          if (isMissing) {
            return;
          }
          const mappedSummary = data[0].summary;
          const rawSummary = data[1].summary;
          const sort =
            col instanceof NumberColumn && col.isGroupSortedByMe().asc !== undefined ? col.getSortMethod() : '';

          if (isMapAbleColumn(col)) {
            const range = col.getRange();
            Array.from(n.getElementsByTagName('span')).forEach((d: HTMLElement, i) => (d.textContent = range[i]));
          }

          renderViolin(col, n, mappedSummary, rawSummary, sort, colorOf(col, null, imposer), isMapAbleColumn(col));
        });
      },
    };
  }
}

function renderViolin(
  col: INumberColumn,
  n: HTMLElement,
  _data: IAdvancedBoxPlotData,
  label: IAdvancedBoxPlotData,
  _sort: string,
  _color: string | null,
  _hasRange = false
) {
  n.title = computeLabel(col, label);
}
