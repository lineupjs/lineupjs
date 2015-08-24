/**
 * Created by Samuel Gratzl on 24.08.2015.
 */

import model = require('./model');
import utils = require('./utils');
import mappingeditor = require('./mappingeditor');
import provider = require('./provider');

function dialogForm(title, body, buttonsWithLabel = false) {
  return '<span style="font-weight: bold">' + title + '</span>' +
    '<form onsubmit="return false">' +
    body + '<button type = "submit" class="ok fa fa-check" title="ok"></button>' +
    '<button type = "reset" class="cancel fa fa-times" title="cancel"></button>' +
    '<button type = "button" class="reset fa fa-undo" title="reset"></button></form>';
}

export function openRenameDialog(column:model.Column, $header:d3.Selection<model.Column>) {
  var pos = utils.offset($header.node());
  var popup = d3.select('body').append('div')
    .attr({
      'class': 'lu-popup2'
    }).style({
      left: pos.left + 'px',
      top: pos.top + 'px',
      width: '200px'

    }).html(dialogForm('Rename Column', '<input type="text" size="20" value="' + column.label + '" required="required"><br>'));

  popup.select('.ok').on('click', function () {
    var newValue = popup.select('input').property('value');
    column.setLabel(newValue);
    popup.remove();
  });

  popup.select('.cancel').on('click', function () {
    popup.remove();
  });
}

export function openEditWeightsDialog(column: model.StackColumn, $header: d3.Selection<model.Column>) {
  var weights = column.weights,
    children = column.children.map((d, i) => ({ col: d, weight: weights[i] * 100} ));

  var scale = d3.scale.linear().domain([0, 100]).range([0, 120]);
  var pos = utils.offset($header.node());

  var $popup = d3.select('body').append('div')
    .attr({
      'class': 'lu-popup2'
    }).style({
      left: pos.left + 'px',
      top: pos.top + 'px'
    })
    .html(dialogForm('Edit Weights', '<table></table>'));

  var $rows = $popup.select('table').selectAll('tr').data(children);
  var $rows_enter = $rows.enter().append('tr');
  $rows_enter.append('td')
    .append('input').attr({
      type: 'number',
      value: (d) => d.weight,
      size: 5
    }).on('input', function(d) {
      d.weight = +this.value;
      redraw();
    });

  $rows_enter.append('td').append('div')
    .attr('class', 'bar')
    .style('background-color', (d) => d.col.color);

  $rows_enter.append('td').text((d) => d.col.label);

  function redraw() {
    $rows.select(".bar").transition().style({
      width: function (d) {
        return scale(d.weight) + "px";
      }
    });
  }

  redraw();

  $popup.select('.cancel').on('click', function () {
    column.setWeights(weights);
    $popup.remove();
  });
  $popup.select('.reset').on('click', function () {

  });
  $popup.select('.ok').on('click', function () {
    column.setWeights(children.map((d) => d.weight));
    $popup.remove();
  });
}

function openCategoricalFilter(column: model.CategoricalColumn, $header: d3.Selection<model.Column>) {
  var pos = utils.offset($header.node()),
    bak = column.getFilter() || [];
  var popup = d3.select('body').append('div')
    .attr({
      'class': 'lu-popup'
    }).style({
      left: pos.left + 'px',
      top: pos.top + 'px'
    })
    .html(dialogForm('Edit Filter', '<div class="selectionTable"><table><thead><th></th><th>Category</th></thead><tbody></tbody></table></div>'));

  popup.select('.selectionTable').style({
    width: (400 - 10) + 'px',
    height: (300 - 40) + 'px'
  });

  // list all data rows !
  var trData = column.categories.map(function (d) {
    return {d: d, isChecked: bak.length === 0 || bak.indexOf(d) >= 0};
  });

  var trs = popup.select('tbody').selectAll('tr').data(trData);
  trs.enter().append('tr');
  trs.append('td').attr('class', 'checkmark');
  trs.append('td').attr('class', 'datalabel').text(function (d) {
    return d.d;
  });

  function redraw() {
    var trs = popup.select('tbody').selectAll('tr').data(trData);
    trs.select('.checkmark').html((d) => '<i class="fa fa-' + ((d.isChecked) ? 'check-' : '') + 'square-o"></i>')
      .on('click', (d) => {
        d.isChecked = !d.isChecked;
        redraw();
      });
    trs.select('.datalabel').style('opacity', (d) => d.isChecked ? '1.0' : '.8');
  }

  redraw();

  function updateData(filter) {
    $header.select('i.fa-filter').classed('filtered', (filter && filter.length > 0 && filter.length < column.categories.length));
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

function openStringFilter(column: model.StringColumn, $header: d3.Selection<model.Column>) {
  var pos = utils.offset($header.node()),
    bak = column.getFilter() || '';

  var $popup = d3.select('body').append('div')
    .attr({
      'class': 'lu-popup2'
    }).style({
      left: pos.left + 'px',
      top: pos.top + 'px'
    })
    .html(dialogForm('Filter', '<input type="text" placeholder="containing..." autofocus="true" size="18" value="' + bak + '"><br>'));

  function updateData(filter) {
    $header.select('i.fa-filter').classed('filtered', (filter && filter.length > 0));
    column.setFilter(filter);
  }

  $popup.select('.cancel').on('click', function () {
    $popup.select('input').property('value', bak);
    updateData(bak);
    $popup.remove();
  });
  $popup.select('.reset').on('click', function () {
    $popup.select('input').property('value', '');
    updateData(null);
  });
  $popup.select('.ok').on('click', function () {
    updateData($popup.select('input').property('value'));
    $popup.remove();
  });
}

function openMappingEditor(column: model.NumberColumn, $header: d3.Selection<any>, data: provider.DataProvider) {
  var pos = utils.offset($header.node()),
    bak = column.getMapping(),
    original = column.getOriginalMapping();
  var act = d3.scale.linear().domain(bak.domain).range(bak.range);

  var popup = d3.select('body').append('div')
    .attr({
      'class': 'lu-popup'
    }).style({
      left: pos.left + 'px',
      top: pos.top + 'px',
      width: "420px",
      height: "470px"
    })
    .html(dialogForm('Change Mapping', '<div class="mappingArea"></div>' +
      '<label><input type="checkbox" id="filterIt" value="filterIt">Filter Outliers</label><br>'));

  var $filterIt = popup.select('input').on('change', function() {
    applyMapping(act);
  });
  $filterIt.property('checked', column.isFiltered());

  function applyMapping(newscale) {
    act = newscale;
    $header.select('i.fa-filter').classed('filtered', !isSame(act.range(), original.range) || !isSame(act.domain(), original.domain));

    column.setMapping(<[number, number]>act.domain(), <[number, number]>act.range());
    var val = $filterIt.property('checked');
    if (val) {
      column.setFilter(newscale.domain()[0], newscale.domain()[1]);
    } else {
      column.setFilter();
    }
  }

  var editorOptions = {
    callback: applyMapping,
    triggerCallback : 'dragend'
  };
  var data_sample = data.mappingSample(column);
  var editor = mappingeditor.open(d3.scale.linear().domain(bak.domain).range(bak.range), original.domain, data_sample, editorOptions);
  popup.select('.mappingArea').call(editor);

  function isSame(a, b) {
    return a[0] === b[0] && a[1] === b[1];
  }

  popup.select(".ok").on("click", function () {
    applyMapping(act);
    popup.remove();
  });
  popup.select('.cancel').on('click', function () {
    column.setMapping(bak.domain, bak.range);
    $header.classed('filtered', !isSame(bak.range, original.range) || !isSame(bak.domain, original.domain));
    popup.remove();
  });
  popup.select('.reset').on('click', function () {
    bak = original;
    act =  d3.scale.linear().domain(bak.domain).range(bak.range);
    applyMapping(act);
    editor = mappingeditor.open(d3.scale.linear().domain(bak.domain).range(bak.range), original.domain, data_sample, editorOptions);
    popup.selectAll('.mappingArea *').remove();
    popup.select('.mappingArea').call(editor);
  });
}

function openCategoricalMappingEditor(column: model.CategoricalNumberColumn, $header: d3.Selection<any>) {

}

export function filterDialogs() {
  return {
    string : openStringFilter,
    categorical: openCategoricalFilter,
    number: openMappingEditor,
    categoricalnumber: openCategoricalMappingEditor
  }
}