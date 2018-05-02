import HierarchyColumn, {ICategoryInternalNode, ICutOffNode, resolveInnerNodes} from '../../model/HierarchyColumn';
import ADialog, {IDialogContext} from './ADialog';

/** @internal */
export default class CutOffHierarchyDialog extends ADialog {

  private readonly innerNodes: ICategoryInternalNode[];
  private readonly innerNodePaths: string[];

  private readonly before: ICutOffNode;


  constructor(private readonly column: HierarchyColumn, dialog: IDialogContext, private readonly idPrefix: string) {
    super(dialog, {
      fullDialog: true
    });

    this.innerNodes = resolveInnerNodes(this.column.hierarchy);
    this.innerNodePaths = this.innerNodes.map((n) => n.path);
    this.before = column.getCutOff();
  }

  protected build(node: HTMLElement) {
    node.insertAdjacentHTML('beforeend', `
        <input type="text" value="${this.before.node.label}" required="required" autofocus="autofocus" list="ui${this.idPrefix}lineupHierarchyList" placeholder="cut off node">
        <input type="number" value="${isFinite(this.before.maxDepth) ? this.before.maxDepth : ''}" placeholder="max depth (&infin;)">
        <datalist id="ui${this.idPrefix}lineupHierarchyList">${this.innerNodes.map((node) => `<option value="${node.path}">${node.label}</option>`)}</datalist>`);

    //custom validation
    const innerNodePaths = this.innerNodePaths;
    this.findInput('input[type="text"]').addEventListener('change', function (this: HTMLInputElement) {
      const value = this.value;
      if (innerNodePaths.indexOf(value) < 0) {
        this.setCustomValidity('invalid node');
      } else {
        this.setCustomValidity('');
      }
    }, {
      passive: true
    });
  }

  protected reset() {
    this.findInput('input[type="text"]').value = this.before.node.label;
    this.findInput('input[type="number"]').value = isFinite(this.before.maxDepth) ? String(this.before.maxDepth) : '';
    this.column.setCutOff(this.before);
  }

  protected submit() {
    const newNode = this.findInput('input[type="text"]').value;
    const newNodeIndex = this.innerNodePaths.indexOf(newNode);
    const node = this.innerNodes[newNodeIndex];
    const maxDepthText = this.findInput('input[type="number"]').value;
    const maxDepth = maxDepthText === '' ? Infinity : parseInt(maxDepthText, 10);
    this.column.setCutOff({node, maxDepth});
    return true;
  }
}
