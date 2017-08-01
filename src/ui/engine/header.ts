/**
 * Created by Samuel Gratzl on 25.07.2017.
 */
import Column from '../..//model/Column';
import {IRankingContext} from './RenderColumn';
import {isSupportType} from '../../model';
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
import {IMultiLevelColumn, isMultiLevelColumn} from '../../model/CompositeColumn';
import RankColumn from '../../model/RankColumn';
import WeightsEditDialog from '../../dialogs/WeightsEditDialog';
import StackColumn from '../../model/StackColumn';
import CutOffHierarchyDialog from '../../dialogs/CutOffHierarchyDialog';
import SearchDialog from '../../dialogs/SearchDialog';
import HierarchyColumn from '../../model/HierarchyColumn';

export {default as createSummary} from './summary';

export function createToolbar(node: HTMLElement, col: Column, ctx: IRankingContext) {
  const isSupportColumn = isSupportType(col.desc);

  const addIcon = (title: string, icon: string, dialogClass?: { new(col: any, header: Selection<any>, ...args: any[]): ADialog }, ...dialogArgs: any[]) => {
    node.insertAdjacentHTML('beforeend', `<i class="fa ${icon}" title="${title}"><span aria-hidden="true">${title}</span> </i>`);
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

  if (!isSupportColumn) {
    //rename
    addIcon('Rename', 'fa-pencil-square-o', RenameDialog);
    //clone
    addIcon('Generate Snapshot', 'fa-code-fork').onclick = (evt) => {
      evt.stopPropagation();
      ctx.provider.takeSnapshot(col);
    };
  }

  if (col instanceof NumbersColumn || col instanceof BoxPlotColumn) {
    //Numbers Sort
    addIcon('Sort By', 'fa-sort', SortDialog);
  }

  if (col.getRendererList().length > 1) {
    //Renderer Change
    addIcon('Change Visualization', 'fa-exchange', RendererTypeDialog);
  }

  if (col instanceof LinkColumn) {
    //edit link
    addIcon('Edit Link Pattern', 'fa-external-link', EditLinkDialog, ctx.options.idPrefix, (<string[]>[]).concat((<any>col.desc).templates || [], ctx.options.linkTemplates));
  }

  if (col instanceof ScriptColumn) {
    //edit script
    addIcon('Edit Combine Script', 'fa-gears', ScriptEditDialog);
  }

  //filter
  if (ctx.options.filters.hasOwnProperty(col.desc.type)) {
    addIcon('Filter', 'fa-filter', ctx.options.filters[col.desc.type], '', ctx.provider, ctx.options.idPrefix);
  }

  if (col instanceof HierarchyColumn) {
    //cutoff
    addIcon('Set Cut Off', 'fa-scissors', CutOffHierarchyDialog, ctx.options.idPrefix);
  }

  if (ctx.options.searchAble(col)) {
    //search
    addIcon('Search', 'fa-search', SearchDialog, ctx.provider);
  }

  if (col instanceof StackColumn) {
    //edit weights
    addIcon('Edit Weights', 'fa-tasks', WeightsEditDialog);
  }

  if (!isSupportColumn) {
    addIcon('(Un)Collapse', col.getCompressed() ? 'fa-toggle-right' : 'fa-toggle-left').onclick = (evt) => {
      evt.stopPropagation();
      col.setCompressed(!col.getCompressed());
      const i = <HTMLElement>evt.currentTarget;
      i.classList.toggle('fa-toggle-left');
      i.classList.toggle('fa-toggle-right');
    };
  }

  if (isMultiLevelColumn(col)) {
    const mcol = <IMultiLevelColumn>col;
    addIcon('Compress/Expand', mcol.getCollapsed() ? 'fa-expand' : 'fa-compress').onclick = (evt) => {
      evt.stopPropagation();
      mcol.setCollapsed(!mcol.getCollapsed());
      const i = <HTMLElement>evt.currentTarget;
      i.classList.toggle('fa-expand');
      i.classList.toggle('fa-compress');
    };
  }

  addIcon('Hide', 'fa-times').onclick = (evt) => {
    evt.stopPropagation();
    if (!(col instanceof RankColumn)) {
      col.removeMe();
      return;
    }
    ctx.provider.removeRanking(col.findMyRanker()!);
    if (ctx.provider.getRankings().length === 0) { //create at least one
      ctx.provider.pushRanking();
    }
  };
}
