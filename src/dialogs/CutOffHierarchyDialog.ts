import HierarchyColumn, {resolveInnerNodes} from '../model/HierarchyColumn';
import ADialog from './ADialog';

export default class CutOffHierarchyDialog extends ADialog {

  /**
   * opens a dialog for filtering a categorical column
   * @param column the column to rename
   * @param header the visual header element of this column
   * @param idPrefix id prefix used for generated ids
   */
  constructor(private readonly column: HierarchyColumn, header: HTMLElement, private readonly idPrefix: string) {
    super(header, 'Edit Hierarchy Cutoff');
  }

  protected build():HTMLElement {
    const bak = this.column.getCutOff();
    const innerNodes = resolveInnerNodes(this.column.hierarchy);
    const innerNodePaths = innerNodes.map((n) => n.path);
    const t = `<input type="text" value="${bak.node.label}"
        required="required" autofocus="autofocus" list="ui${this.idPrefix}lineupHierarchyList" placeholder="cut off node"><br>
        <input type="number" value="${isFinite(bak.maxDepth) ? bak.maxDepth : ''}" placeholder="max depth (&infin;)"><br>
        <datalist id="ui${this.idPrefix}lineupHierarchyList">${innerNodes.map((node) => `<option value="${node.path}">${node.label}</option>`)}</datalist>`;

    const popup = this.makePopup(t);

    //custom validation
    popup.querySelector('input[type="text"]')!.addEventListener('change', function (this: HTMLInputElement) {
      const value = this.value;
      console.log('validate', value);
      if (innerNodePaths.indexOf(value) < 0) {
        this.setCustomValidity('invalid node');
      } else {
        this.setCustomValidity('');
      }
    });

    this.onButton(popup, {
      cancel: () => undefined,
      reset: () => undefined,
      submit: () => {
        const form = <HTMLFormElement>popup.querySelector('form');
        if (!form.checkValidity()) {
          return false;
        }
        const newNode = (<HTMLInputElement>popup.querySelector('input[type="text"]')).value;
        const newNodeIndex = innerNodePaths.indexOf(newNode);
        const node = innerNodes[newNodeIndex];
        const maxDepthText = (<HTMLInputElement>popup.querySelector('input[type="number"]')).value;
        const maxDepth = maxDepthText === '' ? Infinity : parseInt(maxDepthText, 10);
        this.column.setCutOff(node, maxDepth);
        return true;
      }
    });

    return popup;
  }
}
