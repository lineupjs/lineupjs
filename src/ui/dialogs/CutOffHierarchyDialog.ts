import type { IRankingHeaderContext } from '..';
import { HierarchyColumn, ICategoryInternalNode, ICutOffNode, resolveInnerNodes } from '../../model';
import ADialog, { IDialogContext } from './ADialog';

/** @internal */
export default class CutOffHierarchyDialog extends ADialog {
  private readonly innerNodes: ICategoryInternalNode[];
  private readonly innerNodePaths: string[];

  private readonly before: ICutOffNode;

  constructor(
    private readonly column: HierarchyColumn,
    dialog: IDialogContext,
    private readonly ctx: IRankingHeaderContext
  ) {
    super(dialog, {
      livePreview: 'cutOff',
    });

    this.innerNodes = resolveInnerNodes(this.column.hierarchy);
    this.innerNodePaths = this.innerNodes.map((n) => n.path);
    this.before = column.getCutOff();
  }

  protected build(node: HTMLElement) {
    const s = this.ctx.sanitize;
    node.insertAdjacentHTML(
      'beforeend',
      `
        <input type="text" value="${s(this.before.node.label)}" required="required" autofocus="autofocus" list="ui${
        this.ctx.idPrefix
      }lineupHierarchyList" placeholder="cut off node">
        <input type="number" value="${
          isFinite(this.before.maxDepth) ? this.before.maxDepth : ''
        }" placeholder="max depth (&infin;)">
        <datalist id="ui${this.ctx.idPrefix}lineupHierarchyList">${this.innerNodes.map(
        (node) => `<option value="${s(node.path)}">${s(node.label)}</option>`
      )}</datalist>`
    );

    //custom validation
    const innerNodePaths = this.innerNodePaths;
    this.findInput('input[type="text"]').addEventListener(
      'change',
      function (this: HTMLInputElement) {
        const value = this.value;
        if (innerNodePaths.indexOf(value) < 0) {
          this.setCustomValidity('invalid node');
        } else {
          this.setCustomValidity('');
        }
      },
      {
        passive: true,
      }
    );

    this.enableLivePreviews('input[type=text],input[type=number]');
  }

  protected reset() {
    this.findInput('input[type="text"]').value = this.column.hierarchy.path;
    this.findInput('input[type="number"]').value = '';
  }

  protected cancel() {
    this.column.setCutOff(this.before);
  }

  protected submit() {
    const newNode = this.findInput('input[type="text"]').value;
    const newNodeIndex = this.innerNodePaths.indexOf(newNode);
    const node = this.innerNodes[newNodeIndex];
    const maxDepthText = this.findInput('input[type="number"]').value;
    const maxDepth = maxDepthText === '' ? Number.POSITIVE_INFINITY : Number.parseInt(maxDepthText, 10);
    this.column.setCutOff({ node, maxDepth });
    return true;
  }
}
