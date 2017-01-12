/**
 * a set of simple dialogs for LineUp
 *
 * Created by Samuel Gratzl on 24.08.2015.
 */

import Column from './model/Column';
import ScriptColumn from './model/ScriptColumn';
import CategoricalNumberColumn from './model/CategoricalNumberColumn';
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
 * flags the header to be filtered
 * @param $header
 * @param filtered
 */
function markFiltered($header: d3.Selection<Column>, filtered = false) {
  $header.classed('filtered', filtered);
}

function sortbyName(prop: string) {
  return function (a, b) {
    const av = a[prop],
      bv = b[prop];
    if (av.toLowerCase() < bv.toLowerCase()) {
      return -1;
    }
    if (av.toLowerCase() > bv.toLowerCase()) {
      return 1;
    }
    return 0;
  };
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




/**
 * opens the mapping editor for a given CategoricalNumberColumn, i.e. to map categories to numbers
 * @param column the column to rename
 * @param $header the visual header element of this column
 */
function openCategoricalMappingEditor(column: CategoricalNumberColumn, $header: d3.Selection<any>) {
  const bak = column.getFilter() || [];


  const scale = d3scale.linear().domain([0, 100]).range([0, 120]);

  const $popup = makePopup($header, 'Edit Categorical Mapping', '<div class="selectionTable"><table><thead><th class="selectAll"></th><th colspan="2">Scale</th><th>Category</th></thead><tbody></tbody></table></div>');

  const range = column.getScale().range,
    colors = column.categoryColors,
    labels = column.categoryLabels;

  const trData = column.categories.map((d, i) => {
    return {
      cat: d,
      label: labels[i],
      isChecked: bak.length === 0 || bak.indexOf(d) >= 0,
      range: range[i] * 100,
      color: colors[i]
    };
  }).sort(sortbyName('label'));

  const $rows = $popup.select('tbody').selectAll('tr').data(trData);
  const $rowsEnter = $rows.enter().append('tr');
  $rowsEnter.append('td').attr('class', 'checkmark').on('click', (d) => {
    d.isChecked = !d.isChecked;
    redraw();
  });
  $rowsEnter.append('td')
    .append('input').attr({
    type: 'number',
    value: (d) => d.range,
    min: 0,
    max: 100,
    size: 5
  }).on('input', function (d) {
    d.range = +this.value;
    redraw();
  });
  $rowsEnter.append('td').append('div').attr('class', 'bar').style('background-color', (d) => d.color);
  $rowsEnter.append('td').attr('class', 'datalabel').text((d) => d.label);

  function redraw() {
    $rows.select('.checkmark').html((d) => '<i class="fa fa-' + ((d.isChecked) ? 'check-' : '') + 'square-o"></i>');
    $rows.select('.bar').transition().style('width', (d) => scale(d.range) + 'px');
    $rows.select('.datalabel').style('opacity', (d) => d.isChecked ? '1.0' : '.8');
  }

  redraw();

  let isCheckedAll = true;

  function redrawSelectAll() {
    $popup.select('.selectAll').html((d) => '<i class="fa fa-' + ((isCheckedAll) ? 'check-' : '') + 'square-o"></i>');
    $popup.select('thead').on('click', () => {
      isCheckedAll = !isCheckedAll;
      trData.forEach((row) => row.isChecked = isCheckedAll);
      redraw();
      redrawSelectAll();
    });
  }

  redrawSelectAll();

  function updateData(filter) {
    markFiltered($header, filter && filter.length > 0 && filter.length < trData.length);
    column.setFilter(filter);
  }

  $popup.select('.cancel').on('click', function () {
    updateData(bak);
    column.setMapping(range);
    $popup.remove();
  });
  $popup.select('.reset').on('click', function () {
    trData.forEach((d) => {
      d.isChecked = true;
      d.range = 50;
    });
    redraw();
    updateData(null);
    column.setMapping(trData.map(() => 1));
  });
  $popup.select('.ok').on('click', function () {
    let f = trData.filter((d) => d.isChecked).map((d) => d.cat);
    if (f.length === trData.length) {
      f = [];
    }
    updateData(f);
    column.setMapping(trData.map((d) => d.range / 100));
    $popup.remove();
  });
}

/**
 * returns all known filter dialogs mappings by type
 * @return
 */
export function filterDialogs() {
  return {
    ordinal: openCategoricalMappingEditor
  };
}
