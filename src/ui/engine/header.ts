/**
 * Created by Samuel Gratzl on 25.07.2017.
 */
import Column from '../../model/Column';
import {IRankingHeaderContext} from './RenderColumn';
import {isSupportType, createStackDesc, createNestedDesc} from '../../model';
import NumbersColumn from '../../model/NumbersColumn';
import BoxPlotColumn from '../../model/BoxPlotColumn';
import SortDialog from '../../dialogs/SortDialog';
import {select, Selection} from 'd3';
import RenameDialog from '../../dialogs/RenameDialog';
import RendererTypeDialog from '../../dialogs/RendererTypeDialog';
import LinkColumn from '../../model/LinkColumn';
import ADialog from '../../dialogs/ADialog';
import ScriptColumn from '../../model/ScriptColumn';
import ScriptEditDialog from '../../dialogs/ScriptEditDialog';
import EditLinkDialog from '../../dialogs/EditLinkDialog';
import {default as CompositeColumn, IMultiLevelColumn, isMultiLevelColumn} from '../../model/CompositeColumn';
import RankColumn from '../../model/RankColumn';
import WeightsEditDialog from '../../dialogs/WeightsEditDialog';
import StackColumn from '../../model/StackColumn';
import CutOffHierarchyDialog from '../../dialogs/CutOffHierarchyDialog';
import SearchDialog from '../../dialogs/SearchDialog';
import HierarchyColumn from '../../model/HierarchyColumn';
import {dragAble, dropAble, IDropResult} from './dnd';
import {isNumberColumn} from '../../model/NumberColumn';
import Ranking from '../../model/Ranking';

export {default as createSummary} from './summary';


export function createToolbar(node: HTMLElement, col: Column, ctx: IRankingHeaderContext) {
  const addIcon = (title: string, dialogClass?: { new(col: any, header: Selection<any>, ...args: any[]): ADialog }, ...dialogArgs: any[]) => {
    node.insertAdjacentHTML('beforeend', `<i title="${title}"><span aria-hidden="true">${title}</span> </i>`);
    const i = <HTMLElement>node.lastElementChild;
    if (!dialogClass) {
      return i;
    }
    i.onclick = (evt) => {
      evt.stopPropagation();
      const dialog = new dialogClass(col, select(node.parentElement!), ...dialogArgs);
      dialog.openDialog();
    };
    return i;
  };
  return createToolbarImpl(<any>addIcon, col, ctx);
}

interface IAddIcon {
  (title: string, dialogClass?: { new(col: any, header: Selection<any>, ...args: any[]): ADialog }, ...dialogArgs: any[]): { onclick: (evt: { stopPropagation: ()=>void, currentTarget: Element, [key: string]: any}) => any };
}

export function createToolbarImpl(addIcon: IAddIcon, col: Column, ctx: IRankingHeaderContext) {
  const isSupportColumn = isSupportType(col.desc);

  if (!isSupportColumn) {
    //rename
    addIcon('Rename', RenameDialog);
    //clone
    addIcon('Generate Snapshot').onclick = (evt) => {
      evt.stopPropagation();
      ctx.provider.takeSnapshot(col);
    };
  }

  if (col instanceof NumbersColumn || col instanceof BoxPlotColumn) {
    //Numbers Sort
    addIcon('Sort By', SortDialog);
  }

  if (col.getRendererList().length > 1) {
    //Renderer Change
    addIcon('Change Visualization', RendererTypeDialog);
  }

  if (col instanceof LinkColumn) {
    //edit link
    addIcon('Edit Link Pattern', EditLinkDialog, ctx.idPrefix, (<string[]>[]).concat((<any>col.desc).templates || [], ctx.linkTemplates));
  }

  if (col instanceof ScriptColumn) {
    //edit script
    addIcon('Edit Combine Script', ScriptEditDialog);
  }

  //filter
  if (ctx.filters.hasOwnProperty(col.desc.type)) {
    addIcon('Filter', ctx.filters[col.desc.type], '', ctx.provider, ctx.idPrefix);
  }

  if (col instanceof HierarchyColumn) {
    //cutoff
    addIcon('Set Cut Off', CutOffHierarchyDialog, ctx.idPrefix);
  }

  if (ctx.searchAble(col)) {
    //search
    addIcon('Search', SearchDialog, ctx.provider);
  }

  if (col instanceof StackColumn) {
    //edit weights
    addIcon('Edit Weights', WeightsEditDialog);
  }

  if (!isSupportColumn) {
    addIcon(col.getCompressed() ? 'UnCollapse' : 'Collapse').onclick = (evt) => {
      evt.stopPropagation();
      col.setCompressed(!col.getCompressed());
      const i = <HTMLElement>evt.currentTarget;
      i.title = col.getCompressed() ? 'UnCollapse' : 'Collapse';
    };
  }

  if (isMultiLevelColumn(col)) {
    const mcol = <IMultiLevelColumn>col;
    addIcon(mcol.getCollapsed() ? 'Expand' : 'Compress').onclick = (evt) => {
      evt.stopPropagation();
      mcol.setCollapsed(!mcol.getCollapsed());
      const i = <HTMLElement>evt.currentTarget;
      i.title = mcol.getCollapsed() ? 'Expand' : 'Compress';
    };
  }

  addIcon('Hide').onclick = (evt) => {
    evt.stopPropagation();
    if (!(col instanceof RankColumn)) {
      col.removeMe();
      return;
    }
    ctx.provider.removeRanking(col.findMyRanker()!);
    ctx.provider.ensureOneRanking();
  };
}

export function dragWidth(col: Column, node: HTMLElement) {
  let ueberElement: HTMLElement;
  const handle = <HTMLElement>node.querySelector('.lu-handle');

  let start = 0;
  const mouseMove = (evt: MouseEvent) => {
    const end = evt.clientX;
    if (Math.abs(start - end) < 2) {
      //ignore
      return;
    }
    const delta = end - start;
    start = end;
    col.setWidth(Math.max(0, col.getWidth() + delta));
  };

  const mouseUp = (evt: MouseEvent) => {
    const end = evt.clientX;

    ueberElement.removeEventListener('mousemove', mouseMove);
    ueberElement.removeEventListener('mouseup', mouseUp);
    ueberElement.removeEventListener('mouseleave', mouseUp);

    if (Math.abs(start - end) < 2) {
      //ignore
      return;
    }
    const delta = end - start;
    col.setWidth(Math.max(0, col.getWidth() + delta));
  };
  handle.onmousedown = (evt) => {
    evt.stopPropagation();
    evt.preventDefault();
    node.classList.add('lu-change-width');

    start = evt.clientX;
    ueberElement = <HTMLElement>node.closest('header')!;
    ueberElement.addEventListener('mousemove', mouseMove);
    ueberElement.addEventListener('mouseup', mouseUp);
    ueberElement.addEventListener('mouseleave', mouseUp);
  };

}

export const MIMETYPE_PREFIX = 'text/x-caleydo-lineup-column';

export function handleDnD(node: HTMLElement, column: Column, ctx: IRankingHeaderContext) {
  dragAble(node, () => {
    const ref = JSON.stringify(ctx.provider.toDescRef(column.desc));
    const data: any = {
      'text/plain': column.label,
      [`${MIMETYPE_PREFIX}-ref`]: column.id,
      [MIMETYPE_PREFIX]: ref
    };
    if (isNumberColumn(column)) {
      data[`${MIMETYPE_PREFIX}-number`] = ref;
      data[`${MIMETYPE_PREFIX}-number-ref`] = column.id;
    }
    return {
      effectAllowed: 'copyMove',
      data
    };
  }, true);

  dropAble(<HTMLElement>node.querySelector('.lu-handle')!, [`${MIMETYPE_PREFIX}-ref`, MIMETYPE_PREFIX], (result) => {
    let col: Column|null = null;
    const data = result.data;
    if (`${MIMETYPE_PREFIX}-ref` in data) {
      const id = data[`${MIMETYPE_PREFIX}-ref`];
      col = ctx.provider.find(id);
      if (!col || (col === column && result.effect === 'move')) {
        return false;
      }
      if (result.effect === 'copy') {
        col = ctx.provider.clone(col!);
      } else {
        col.removeMe();
      }
    } else {
      const desc = JSON.parse(data[MIMETYPE_PREFIX]);
      col = ctx.provider.create(ctx.provider.fromDescRef(desc));
    }
    if (!col || col === column) {
      return false;
    }
    return column.insertAfterMe(col) != null;
  }, null, true);

  const resolveDrop = (result: IDropResult, numbersOnly: boolean) => {
    const data = result.data;
    const copy = result.effect === 'copy';
    const prefix = `${MIMETYPE_PREFIX}${numbersOnly?'-number':''}`;
      if (`${prefix}-ref` in data) {
        const id = data[`${prefix}-ref`];
        let col: Column = ctx.provider.find(id)!;
        if (copy) {
          col = ctx.provider.clone(col);
        } else if (col === column) {
          return null;
        } else {
          col.removeMe();
        }
        return col;
      }
      const desc = JSON.parse(data[prefix]);
      return ctx.provider.create(ctx.provider.fromDescRef(desc))!;
  };

  if (isMultiLevelColumn(column)) {
    if ((<IMultiLevelColumn>column).canJustAddNumbers) {
      dropAble(node, [`${MIMETYPE_PREFIX}-number-ref`, `${MIMETYPE_PREFIX}-number`], (result) => {
        const col: Column | null = resolveDrop(result, true);
        return col != null && (<IMultiLevelColumn>column).push(col) != null;
      });
    } else {
      dropAble(node, [`${MIMETYPE_PREFIX}-ref`, MIMETYPE_PREFIX], (result) => {
        const col: Column|null = resolveDrop(result, false);
        return col != null && (<IMultiLevelColumn>column).push(col) != null;
      });
    }
    return;
  }

  const justNumbers = (d: Column) => (d instanceof CompositeColumn && d.canJustAddNumbers) || (isNumberColumn(d) && d.parent instanceof Ranking);
  const dropOrMerge = (justNumbers: boolean) => {
    return (result: IDropResult) => {
      const col: Column|null = resolveDrop(result, justNumbers);
      if (!col) {
        return false;
      }
      if (column instanceof CompositeColumn) {
        return (column.push(col) !== null);
      }
      const ranking = column.findMyRanker()!;
      const index = ranking.indexOf(column);
      const parent = <CompositeColumn>ctx.provider.create(justNumbers ? createStackDesc(): createNestedDesc());
      column.removeMe();
      parent.push(column);
      parent.push(col);
      return ranking.insert(parent, index) != null;
    };
  };

  if (justNumbers(column)) {
    dropAble(node, [`${MIMETYPE_PREFIX}-number-ref`, `${MIMETYPE_PREFIX}-number`], dropOrMerge(true));
  } else {
    dropAble(node, [`${MIMETYPE_PREFIX}-ref`, `${MIMETYPE_PREFIX}`], dropOrMerge(false));
  }
}
