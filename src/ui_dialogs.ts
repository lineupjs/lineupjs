/**
 * a set of simple dialogs for LineUp
 *
 * Created by Samuel Gratzl on 24.08.2015.
 */

import model = require('./model');
import utils = require('./utils');
import mappingeditor = require('./mappingeditor');
import provider = require('./provider');

export function dialogForm(title, body, buttonsWithLabel = false) {
  return '<span style="font-weight: bold">' + title + '</span>' +
    '<form onsubmit="return false">' +
    body + '<button type = "submit" class="ok fa fa-check" title="ok"></button>' +
    '<button type = "reset" class="cancel fa fa-times" title="cancel"></button>' +
    '<button type = "button" class="reset fa fa-undo" title="reset"></button></form>';
}

/**
 * creates a simple popup dialog under the given attachment
 * @param attachement
 * @param title
 * @param body
 * @returns {Selection<any>}
 */
export function makePopup(attachement:d3.Selection<any>, title:string, body:string) {
  var pos = utils.offset(<Element>attachement.node());
  var $popup = d3.select('body').append('div')
    .attr({
      'class': 'lu-popup2'
    }).style({
      left: pos.left + 'px',
      top: pos.top + 'px'
    }).html(dialogForm(title, body));
  $popup.on('keydown', () => {
    if (d3.event.which === 27) {
      $popup.remove();
    }
  });
  var auto = <HTMLInputElement>$popup.select('input[autofocus]').node();
  if (auto) {
    auto.focus();
  }
  return $popup;

}

/**
 * opens a rename dialog for the given column
 * @param column the column to rename
 * @param $header the visual header element of this column
 */
export function openRenameDialog(column:model.Column, $header:d3.Selection<model.Column>) {
  var popup = makePopup($header, 'Rename Column', `<input type="text" size="15" value="${column.label}" required="required" autofocus="autofocus"><br><input type="color" size="15" value="${column.color}" required="required"><br>`);

  popup.select('.ok').on('click', function () {
    var newValue = popup.select('input[type="text"]').property('value');
    var newColor = popup.select('input[type="color"]').property('value');
    column.setMetaData( { label: newValue, color: newColor});
    popup.remove();
  });

  popup.select('.cancel').on('click', function () {
    popup.remove();
  });
}


/**
 * opens a dialog for editing the link of a column
 * @param column the column to rename
 * @param $header the visual header element of this column
 */
export function openEditLinkDialog(column:model.LinkColumn, $header:d3.Selection<model.Column>, templates: string[] = []) {
  var t = `<input type="text" size="15" value="${column.getLink()}" required="required" autofocus="autofocus" ${templates.length > 0 ? 'list="lineupPatternList"' : ''}><br>`;
  if (templates.length > 0) {
    t += '<datalist id="lineupPatternList">'+templates.map((t) => `<option value="${t}">`)+'</datalist>';
  }

  var popup = makePopup($header, 'Edit Link ($ as Placeholder)', t);

  popup.select('.ok').on('click', function () {
    var newValue = popup.select('input[type="text"]').property('value');
    column.setLink(newValue);

    popup.remove();
  });

  popup.select('.cancel').on('click', function () {
    popup.remove();
  });
}

/**
 * opens a search dialog for the given column
 * @param column the column to rename
 * @param $header the visual header element of this column
 * @param provider the data provider for the actual search
 */
export function openSearchDialog(column:model.Column, $header:d3.Selection<model.Column>, provider:provider.DataProvider) {
  var popup = makePopup($header, 'Search', '<input type="text" size="15" value="" required="required" autofocus="autofocus"><br><label><input type="checkbox">RegExp</label><br>');

  popup.select('input[type="text"]').on('input', function () {
    var search:any = (<HTMLInputElement>d3.event.target).value;
    if (search.length >= 3) {
      var isRegex = popup.select('input[type="checkbox"]').property('checked');
      if (isRegex) {
        search = new RegExp(search);
      }
      provider.searchSelect(search, column);
    }
  });

  function updateImpl() {
    var search = popup.select('input[type="text"]').property('value');
    var isRegex = popup.select('input[type="text"]').property('checked');
    if (search.length > 0) {
      if (isRegex) {
        search = new RegExp(search);
      }
      provider.searchSelect(search, column);
    }
    popup.remove();
  }

  popup.select('input[type="checkbox"]').on('change', updateImpl);
  popup.select('.ok').on('click', updateImpl);

  popup.select('.cancel').on('click', function () {
    popup.remove();
  });
}

/**
 * opens a dialog for editing the weights of a stack column
 * @param column the column to filter
 * @param $header the visual header element of this column
 */
export function openEditWeightsDialog(column:model.StackColumn, $header:d3.Selection<model.Column>) {
  var weights = column.getWeights(),
    children = column.children.map((d, i) => ({col: d, weight: weights[i] * 100} ));

  //map weights to pixels
  var scale = d3.scale.linear().domain([0, 100]).range([0, 120]);

  var $popup = makePopup($header, 'Edit Weights', '<table></table>');

  //show as a table with inputs and bars
  var $rows = $popup.select('table').selectAll('tr').data(children);
  var $rows_enter = $rows.enter().append('tr');
  $rows_enter.append('td')
    .append('input').attr({
    type: 'number',
    value: (d) => d.weight,
    min: 0,
    max: 100,
    size: 5
  }).on('input', function (d) {
    d.weight = +this.value;
    redraw();
  });

  $rows_enter.append('td').append('div')
    .attr('class', (d) => 'bar ' + d.col.cssClass)
    .style('background-color', (d) => d.col.color);

  $rows_enter.append('td').text((d) => d.col.label);

  function redraw() {
    $rows.select('.bar').transition().style('width', (d) => scale(d.weight) + 'px');
  }

  redraw();

  $popup.select('.cancel').on('click', function () {
    column.setWeights(weights);
    $popup.remove();
  });
  $popup.select('.reset').on('click', function () {
    children.forEach((d, i) => d.weight = weights[i] * 100);
    $rows.select('input').property('value', (d) => d.weight);
    redraw();
   });
  $popup.select('.ok').on('click', function () {
    column.setWeights(children.map((d) => d.weight));
    $popup.remove();
  });
}

/**
 * flags the header to be filtered
 * @param $header
 * @param filtered
 */
function markFiltered($header: d3.Selection<model.Column>, filtered = false) {
  $header.classed('filtered', filtered);
}

/**
 * opens a dialog for filtering a categorical column
 * @param column the column to rename
 * @param $header the visual header element of this column
 */
function openCategoricalFilter(column:model.CategoricalColumn, $header:d3.Selection<model.Column>) {
  var bak = column.getFilter() || [];
  var popup = makePopup($header, 'Edit Filter', '<div class="selectionTable"><table><thead><th class="selectAll"></th><th>Category</th></thead><tbody></tbody></table></div>');

  // list all data rows !
  var trData = column.categories.map(function (d) {
    return {d: d, isChecked: bak.length === 0 || bak.indexOf(d) >= 0};
  }).sort(function(a, b) {
    if (a.d.toLowerCase() < b.d.toLowerCase())
      return -1;
    if (a.d.toLowerCase() > b.d.toLowerCase())
      return 1;
    return 0;
  });

  var trs = popup.select('tbody').selectAll('tr').data(trData);
  trs.enter().append('tr');
  trs.append('td').attr('class', 'checkmark');
  trs.append('td').attr('class', 'datalabel').text(function (d) {
    return d.d;
  });

  function redraw() {
    var trs = popup.select('tbody').selectAll('tr').data(trData);
    trs.select('.checkmark').html((d) => '<i class="fa fa-' + ((d.isChecked) ? 'check-' : '') + 'square-o"></i>');
    trs.on('click', (d) => {
        d.isChecked = !d.isChecked;
        redraw();
      });
    trs.select('.datalabel').style('opacity', (d) => d.isChecked ? '1.0' : '.8');
  }

  redraw();

  var isCheckedAll = true;

  function redrawSelectAll() {
    popup.select('.selectAll').html((d) => '<i class="fa fa-' + ((isCheckedAll) ? 'check-' : '') + 'square-o"></i>');
    popup.select('thead').on('click', (d) => {
        isCheckedAll = !isCheckedAll;
        trData.map(function(row)  {
          row.isChecked = isCheckedAll;
        });
        redraw();
        redrawSelectAll();
      });
  }

  redrawSelectAll();

  function updateData(filter) {
    markFiltered($header, filter && filter.length > 0 && filter.length < column.categories.length);
    column.setFilter(filter);
  }

  popup.select('.cancel').on('click', function () {
    updateData(bak);
    popup.remove();
  });
  popup.select('.reset').on('click', function () {
    trData.forEach(d => d.isChecked = true);
    redraw();
    updateData(null);
  });
  popup.select('.ok').on('click', function () {
    var f = trData.filter((d) => d.isChecked).map(d => d.d);
    if (f.length === column.categories.length) {
      f = [];
    }
    updateData(f);
    popup.remove();
  });
}

/**
 * opens a dialog for filtering a string column
 * @param column the column to filter
 * @param $header the visual header element of this column
 */
function openStringFilter(column:model.StringColumn, $header:d3.Selection<model.Column>) {
  var bak = column.getFilter() || '';

  var $popup = makePopup($header, 'Filter',
    `<input type="text" placeholder="containing..." autofocus="true" size="15" value="${(bak instanceof RegExp) ? bak.source : bak}" autofocus="autofocus">
    <br><label><input type="checkbox" ${(bak instanceof RegExp) ? 'checked="checked"' : ''}>RegExp</label>
    <br>`);

  function updateData(filter) {
    markFiltered($header, (filter && filter !== ''));
    column.setFilter(filter);
  }

  function updateImpl(force) {
    //get value
    var search:any = $popup.select('input[type="text"]').property('value');
    if (search.length >= 3 || force) {
      var isRegex = $popup.select('input[type="checkbox"]').property('checked');
      if (isRegex) {
        search = new RegExp(search);
      }
      updateData(search);
    }

  }

  $popup.select('input[type="checkbox"]').on('change', updateImpl);
  $popup.select('input[type="text"]').on('input', updateImpl);

  $popup.select('.cancel').on('click', function () {
    $popup.select('input[type="text"]').property('value', bak);
    $popup.select('input[type="checkbox"]').property('checked', bak instanceof RegExp ? 'checked' : null);
    updateData(bak);
    $popup.remove();
  });
  $popup.select('.reset').on('click', function () {
    $popup.select('input[type="text"]').property('value', '');
    $popup.select('input[type="checkbox"]').property('checked', null);
    updateData(null);
  });
  $popup.select('.ok').on('click', function () {
    updateImpl(true);
    $popup.remove();
  });
}


/**
 * opens a dialog for filtering a boolean column
 * @param column the column to filter
 * @param $header the visual header element of this column
 */
function openBooleanFilter(column:model.BooleanColumn, $header:d3.Selection<model.Column>) {
  var bak = column.getFilter();

  var $popup = makePopup($header, 'Filter',
    `<label><input type="radio" name="boolean_check" value="null" ${bak === null ? 'checked="checked"': ''}>No Filter</label><br>
     <label><input type="radio" name="boolean_check" value="true" ${bak === true ? 'checked="checked"': ''}>True</label><br>
     <label><input type="radio" name="boolean_check" value="false" ${bak === false ? 'checked="checked"': ''}>False</label>
    <br>`);

  function updateData(filter) {
    markFiltered($header, (filter !== null));
    column.setFilter(filter);
  }

  function updateImpl(force) {
    //get value
    const isTrue = $popup.select('input[type="radio"][value="true"]').property('checked');
    const isFalse = $popup.select('input[type="radio"][value="false"]').property('checked');
    updateData(isTrue ? true : (isFalse ? false: null));
  }

  $popup.selectAll('input[type="radio"]').on('change', updateImpl);

  $popup.select('.cancel').on('click', function () {
    updateData(bak);
    $popup.remove();
  });
  $popup.select('.reset').on('click', function () {
    const v = bak === null ? 'null': String(bak);
    $popup.selectAll('input[type="radio"]').property('checked', function() {
      return this.value === v;
    });
    updateData(null);
  });
  $popup.select('.ok').on('click', function () {
    updateImpl(true);
    $popup.remove();
  });
}


/**
 * opens a dialog for editing the script code
 * @param column the column to edit
 * @param $header the visual header element of this column
 */
export function openEditScriptDialog(column:model.ScriptColumn, $header:d3.Selection<model.Column>) {
  const bak = column.getScript();
  const $popup = makePopup($header, 'Edit Script',
    `Parameters: <code>values: number[], children: Column[]</code><br>
      <textarea autofocus="true" rows="5" autofocus="autofocus" style="width: 95%;">${column.getScript()}</textarea><br>`);

  function updateData(script) {
    column.setScript(script);
  }

  function updateImpl() {
    //get value
    var script = $popup.select('textarea').property('value');
    updateData(script);
  }

  $popup.select('.cancel').on('click', function () {
    $popup.select('textarea').property('value', bak);
    updateData(bak);
    $popup.remove();
  });
  $popup.select('.reset').on('click', function () {
    $popup.select('textarea').property('value', model.ScriptColumn.DEFAULT_SCRIPT);
    updateData(model.ScriptColumn.DEFAULT_SCRIPT);
  });
  $popup.select('.ok').on('click', function () {
    updateImpl();
    $popup.remove();
  });
}

/**
 * opens the mapping editor for a given NumberColumn
 * @param column the column to rename
 * @param $header the visual header element of this column
 * @param data the data provider for illustrating the mapping by example
 */
function openMappingEditor(column:model.NumberColumn, $header:d3.Selection<any>, data:provider.DataProvider) {
  var pos = utils.offset($header.node()),
    bak = column.getMapping(),
    original = column.getOriginalMapping(),
    act: model.IMappingFunction = bak.clone();

  var popup = d3.select('body').append('div')
    .attr({
      'class': 'lu-popup'
    }).style({
      left: pos.left + 'px',
      top: pos.top + 'px'
    })
    .html(dialogForm('Change Mapping', '<div class="mappingArea"></div>' +
      '<label><input type="checkbox" id="filterIt" value="filterIt">Filter Outliers</label><br>'));

  var $filterIt = popup.select('input').on('change', function () {
    applyMapping(act);
  });
  $filterIt.property('checked', column.isFiltered());

  function applyMapping(newscale: model.IMappingFunction) {
    act = newscale;
    markFiltered($header, !newscale.eq(original));

    column.setMapping(newscale);
    var val = $filterIt.property('checked');
    if (val) {
      column.setFilter({min: newscale.domain[0], max: newscale.domain[1]});
    } else {
      column.setFilter();
    }
  }

  var editorOptions = {
    callback: applyMapping,
    triggerCallback: 'dragend'
  };
  var data_sample = data.mappingSample(column);
  var editor = mappingeditor.create(<HTMLElement>popup.select('.mappingArea').node(), act, original, data_sample, editorOptions);


  popup.select('.ok').on('click', function () {
    applyMapping(editor.scale);
    popup.remove();
  });
  popup.select('.cancel').on('click', function () {
    column.setMapping(bak);
    markFiltered($header, !bak.eq(original));
    popup.remove();
  });
  popup.select('.reset').on('click', function () {
    bak = original;
    act = bak.clone();
    applyMapping(act);
    popup.selectAll('.mappingArea *').remove();
    editor = mappingeditor.create(<HTMLElement>popup.select('.mappingArea').node(), act, original, data_sample, editorOptions);
  });
}


/**
 * opens the mapping editor for a given CategoricalNumberColumn, i.e. to map categories to numbers
 * @param column the column to rename
 * @param $header the visual header element of this column
 */
function openCategoricalMappingEditor(column:model.CategoricalNumberColumn, $header:d3.Selection<any>) {
  var range = column.getScale().range,
    colors = column.categoryColors,
    children = column.categories.map((d, i) => ({cat: d, range: range[i] * 100, color: colors[i]}));

  var scale = d3.scale.linear().domain([0, 100]).range([0, 120]);

  var $popup = makePopup($header, 'Edit Categorical Mapping', '<table></table>');

  var $rows = $popup.select('table').selectAll('tr').data(children);
  var $rows_enter = $rows.enter().append('tr');
  $rows_enter.append('td')
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

  $rows_enter.append('td').append('div')
    .attr('class', 'bar')
    .style('background-color', (d) => d.color);

  $rows_enter.append('td').text((d) => d.cat);

  function redraw() {
    $rows.select('.bar').transition().style({
      width: function (d) {
        return scale(d.range) + 'px';
      }
    });
  }

  redraw();

  $popup.select('.cancel').on('click', function () {
    column.setMapping(range);
    $popup.remove();
  });
  /*$popup.select('.reset').on('click', function () {

   });*/
  $popup.select('.ok').on('click', function () {
    column.setMapping(children.map((d) => d.range / 100));
    $popup.remove();
  });
}

/**
 * returns all known filter dialogs mappings by type
 * @return
 */
export function filterDialogs() {
  return {
    string: openStringFilter,
    categorical: openCategoricalFilter,
    number: openMappingEditor,
    ordinal: openCategoricalMappingEditor,
    boolean: openBooleanFilter
  };
}
