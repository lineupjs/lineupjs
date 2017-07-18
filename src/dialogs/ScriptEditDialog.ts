import Column from '../model/Column';
import ADialog from './ADialog';
import ScriptColumn from '../model/ScriptColumn';
import {Selection} from 'd3';


export default class ScriptEditDialog extends ADialog {

  /**
   * opens a dialog for editing the script code
   * @param column the column to edit
   * @param $header the visual header element of this column
   * @param title optional title
   */
  constructor(private readonly column: ScriptColumn, $header: Selection<Column>, title: string = 'Edit Script') {
    super($header, title);
  }

  openDialog() {
    const bak = this.column.getScript();
    const $popup = this.makePopup(`Parameters: <code>values: number[], children: Column[]</code><br>
      <textarea autofocus="true" rows="5" autofocus="autofocus" style="width: 95%;" required="required" placeholder="script to evaluate">${this.column.getScript()}</textarea><br>`);

    const updateData = (script: string) => {
      this.column.setScript(script);
    };

    const updateImpl = () => {
      //get value
      const script = $popup.select('textarea').property('value');
      updateData(script);
    };

    $popup.select('.cancel').on('click', function () {
      $popup.select('textarea').property('value', bak);
      updateData(bak);
      $popup.remove();
    });
    $popup.select('.reset').on('click', function () {
      $popup.select('textarea').property('value', ScriptColumn.DEFAULT_SCRIPT);
      updateData(ScriptColumn.DEFAULT_SCRIPT);
    });
    $popup.select('.ok').on('click', function () {
      updateImpl();
      $popup.remove();
    });
  }
}
