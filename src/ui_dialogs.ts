/**
 * Created by Samuel Gratzl on 24.08.2015.
 */

import model = require('./model');
import utils = require('./utils');
import mappingeditor = require('./mappingeditor');

function dialogForm(title, body, buttonsWithLabel = false) {
  return '<span style="font-weight: bold">' + title + '</span>' +
    '<form onsubmit="return false">' +
    body + '<button class="ok fa fa-check" title="ok"></button>' +
    '<button class="cancel fa fa-times" title="cancel"></button>' +
    '<button class="reset fa fa-undo" title="reset"></button></form>';
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

function openMappingEditor(column: model.NumberColumn, $header: d3.Selection<any>) {
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
  var access = function (row) {
    return +column.getRawValue(row);
  };

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
  var editor = mappingeditor.open(d3.scale.linear().domain(bak.domain).range(bak.range), original.domain, [], access, editorOptions);
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
    editor = mappingeditor.open(d3.scale.linear().domain(bak.domain).range(bak.range), original.domain, [], access, editorOptions);
    popup.selectAll('.mappingArea *').remove();
    popup.select('.mappingArea').call(editor);
  });
}

export function openFilter(column: model.Column, $header: d3.Selection<any>) {
  if (column instanceof model.StringColumn) {
    return openStringFilter(<model.StringColumn>column, $header);
  } else if (column instanceof model.CategoricalColumn) {
    return openCategoricalFilter(<model.CategoricalColumn>column, $header);
  } else if (column instanceof model.NumberColumn) {
    return openMappingEditor(<model.NumberColumn>column, $header);
  }
}