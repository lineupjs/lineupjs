import {IDialogContext} from './ADialog';
import StringColumn from '../../model/StringColumn';
import {EStringGroupCriteriaType} from '../../model/StringColumn';

/** @internal */
export default function append(col: StringColumn, node: HTMLElement, dialog: IDialogContext) {
  const current = col.getGroupCriteria();
  const {type, values} = current;

  node.insertAdjacentHTML('beforeend', `
    <div class="lu-checkbox">
      <input type="radio" name="${dialog.idPrefix}groupString" value="${EStringGroupCriteriaType.value}" id="${dialog.idPrefix}VAL" ${type === EStringGroupCriteriaType.value ? 'checked' : ''}>
      <label for="${dialog.idPrefix}VAL">Use text value</label>
    </div>
    <div class="lu-checkbox">
      <input type="radio" name="${dialog.idPrefix}groupString" value="${EStringGroupCriteriaType.startsWith}" id="${dialog.idPrefix}RW" ${type === EStringGroupCriteriaType.startsWith ? 'checked' : ''}>
      <label for="${dialog.idPrefix}RW">Text starts with &hellip;</label>
    </div>
    <div class="lu-checkbox">
      <input type="radio" name="${dialog.idPrefix}groupString" value="${EStringGroupCriteriaType.regex}" id="${dialog.idPrefix}RE" ${type === EStringGroupCriteriaType.regex ? 'checked' : ''}>
      <label for="${dialog.idPrefix}RE">Use regular expressions</label>
    </div>
    <textarea required ${type === EStringGroupCriteriaType.value ? 'disabled' : ''} rows="5" placeholder="e.g. Test,a.*" id="${dialog.idPrefix}T">${values.map((value) => value instanceof RegExp ? value.source : value).join('\n')}</textarea>
    <button id="${dialog.idPrefix}A">Apply</button>
  `);

  const button = node.querySelector<HTMLButtonElement>(`#${dialog.idPrefix}A`)!;
  const valueRadioButton = node.querySelector<HTMLInputElement>(`#${dialog.idPrefix}VAL`)!;
  const startsWithRadioButton = node.querySelector<HTMLInputElement>(`#${dialog.idPrefix}RW`)!;
  const regexRadioButton = node.querySelector<HTMLInputElement>(`#${dialog.idPrefix}RE`)!;
  const text = node.querySelector<HTMLTextAreaElement>(`#${dialog.idPrefix}T`)!;

  valueRadioButton.onchange = () => text.disabled = valueRadioButton.checked;
  startsWithRadioButton.onchange = () => text.disabled = !startsWithRadioButton.checked;
  regexRadioButton.onchange = () => text.disabled = !regexRadioButton.checked;

  button.onclick = (evt) => {
    evt.preventDefault();
    evt.stopPropagation();
    const checkedNode = node.querySelector<HTMLInputElement>(`input[name="${dialog.idPrefix}groupString"]:checked`)!;
    const newType = <EStringGroupCriteriaType>checkedNode.value;
    let items: (string | RegExp)[] = text.value.trim().split('\n').map((d) => d.trim()).filter((d) => d.length > 0);

    if (newType !== EStringGroupCriteriaType.value) {
      const invalid = items.length === 0;
      text.setCustomValidity(invalid ? 'At least one entry is required' : '');
      if (invalid) {
        (<any>text).reportValidity(); // typedoc not uptodate
        return;
      }
    }
    if (newType === EStringGroupCriteriaType.regex) {
      items = items.map((d) => new RegExp(d.toString(), 'gm'));
    }
    col.setGroupCriteria({
      type: newType,
      values: items
    });
  };
}
