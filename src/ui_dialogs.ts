/**
 * a set of simple dialogs for LineUp
 *
 * Created by Samuel Gratzl on 24.08.2015.
 */

import Column from './model/Column';
import ScriptColumn from './model/ScriptColumn';
import {offset} from './utils';
import {Selection, select, event as d3event, scale as d3scale, behavior} from 'd3';
import * as d3 from 'd3';


export function dialogForm(title: string, body: string, addCloseButtons = true) {
  return `<span style="font-weight: bold" class="lu-popup-title">${title}</span>
            <form onsubmit="return false">
                ${body}
                ${addCloseButtons ?
    '<button type = "submit" class="ok fa fa-check" title="ok"></button>' +
    '<button type = "reset" class="cancel fa fa-times" title="cancel">' +
    '</button><button type = "button" class="reset fa fa-undo" title="reset"></button></form>' : ''}
            </form>`;
}


/**
 * creates a simple popup dialog under the given attachment
 * @param attachment
 * @param title
 * @param body
 * @returns {Selection<any>}
 */
export function makePopup(attachment: Selection<any>, title: string, body: string) {
  const pos = offset(<Element>attachment.node());
  const $popup = select('body').append('div')
    .attr({
      'class': 'lu-popup2'
    }).style({
      left: pos.left + 'px',
      top: pos.top + 'px'
    }).html(dialogForm(title, body));

  function movePopup() {
    //.style("left", (this.parentElement.offsetLeft + (<any>event).dx) + 'px')
    //.style("top", (this.parentElement.offsetTop + event.dy) + 'px');
    //const mouse = d3.mouse(this.parentElement);
    $popup.style({
      left: (this.parentElement.offsetLeft + (<any>d3event).dx) + 'px',
      top: (this.parentElement.offsetTop + (<any>d3event).dy) + 'px'
    });
  }

  $popup.select('span.lu-popup-title').call(behavior.drag().on('drag', movePopup));
  $popup.on('keydown', () => {
    if ((<KeyboardEvent>d3event).which === 27) {
      $popup.remove();
    }
  });
  const auto = <HTMLInputElement>$popup.select('input[autofocus]').node();
  if (auto) {
    auto.focus();
  }
  return $popup;

}

/**
 * opens a dialog for editing the script code
 * @param column the column to edit
 * @param $header the visual header element of this column
 */
// TODO: A refactored version of this function is in src/dialogs/ScriptEditDialog.ts. Delete the following function after the refactored version has been tested.
export function openEditScriptDialog(column: ScriptColumn, $header: d3.Selection<Column>) {
  const bak = column.getScript();
  const $popup = makePopup($header, 'Edit Script',
    `Parameters: <code>values: number[], children: Column[]</code><br>
      <textarea autofocus="true" rows="5" autofocus="autofocus" style="width: 95%;">${column.getScript()}</textarea><br>`);

  function updateData(script) {
    column.setScript(script);
  }

  function updateImpl() {
    //get value
    const script = $popup.select('textarea').property('value');
    updateData(script);
  }

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
