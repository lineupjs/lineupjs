import {IDialogContext} from './ADialog';
import {StringColumn} from '../../model';
import {cssClass} from '../../styles';


/** @internal */
export default function append(col: StringColumn, node: HTMLElement, dialog: IDialogContext) {
  const current = col.getGroupCriteria();
  const isRegex = current.length > 0 && current[0] instanceof RegExp;
  node.insertAdjacentHTML('beforeend', `
    <label class="${cssClass('checkbox')}">
      <input type="radio" name="regex" value="startsWith" id="${dialog.idPrefix}RW" ${!isRegex ? 'checked' : ''}>
      <span>Text starts with &hellip;</span>
    </label>
    <label class="${cssClass('checkbox')}">
      <input type="radio" name="regex" value="regex" id="${dialog.idPrefix}RE" ${isRegex ? 'checked' : ''}>
      <span>RegExp</span>
    </label>
    <textarea class="${cssClass('textarea')}" required rows="5" placeholder="e.g. Test,a.*" id="${dialog.idPrefix}T">${current.map((d) => typeof d === 'string' ? d : d.source).join('\n')}</textarea>
    <button class="${cssClass('dialog-button')}" id="${dialog.idPrefix}A">Apply</button>
  `);

  const button = node.querySelector<HTMLButtonElement>(`#${dialog.idPrefix}A`)!;
  const isRegexCheck = node.querySelector<HTMLInputElement>(`#${dialog.idPrefix}RE`)!;
  const groups = node.querySelector<HTMLTextAreaElement>(`#${dialog.idPrefix}T`)!;

  button.onclick = (evt) => {
    evt.preventDefault();
    evt.stopPropagation();

    let items: (string | RegExp)[] = groups.value.trim().split('\n').map((d) => d.trim()).filter((d) => d.length > 0);
    const invalid = items.length === 0;
    groups.setCustomValidity(invalid ? 'At least one group is required' : '');
    if (invalid) {
      (<any>groups).reportValidity(); // typedoc not uptodate
      return;
    }
    if (isRegexCheck.checked) {
      items = items.map((d) => new RegExp(d.toString(), 'gm'));
    }
    col.setGroupCriteria(items);
  };
}
