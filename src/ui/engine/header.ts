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
    addIcon('Edit Link Pattern', EditLinkDialog, ctx.options.idPrefix, (<string[]>[]).concat((<any>col.desc).templates || [], ctx.options.linkTemplates));
  }

  if (col instanceof ScriptColumn) {
    //edit script
    addIcon('Edit Combine Script', ScriptEditDialog);
  }

  //filter
  if (ctx.options.filters.hasOwnProperty(col.desc.type)) {
    addIcon('Filter', ctx.options.filters[col.desc.type], '', ctx.provider, ctx.options.idPrefix);
  }

  if (col instanceof HierarchyColumn) {
    //cutoff
    addIcon('Set Cut Off', CutOffHierarchyDialog, ctx.options.idPrefix);
  }

  if (ctx.options.searchAble(col)) {
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
    if (ctx.provider.getRankings().length === 0) { //create at least one
      ctx.provider.pushRanking();
    }
  };
}
