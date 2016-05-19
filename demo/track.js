/**
 * Created by Samuel Gratzl on 25.08.2015.
 */

var model = LineUpJS.model;
var exports = {};
var Command = (function () {
  function Command(type, ref, args, invArgs) {
    this.type = type;
    this.ref = ref;
    this.args = args;
    this.invArgs = invArgs;
  }

  Command.prototype.redo = function (p) {
    this.run(p, this.args);
  };
  Command.prototype.undo = function (p) {
    this.run(p, this.invArgs);
  };
  Command.prototype.run = function (p, args) {
    if (this.type === 'ranking_add') {
      return this.runProvider(p, args);
    }
    return this.runRanking(p, args);
  };
  Command.prototype.runProvider = function (p, args) {
    switch (this.type) {
      case 'ranking_add':
      {
        var index = args.index;
        if (args.dump) {
          p.insertRanking(p.restoreRanking(args.dump), index);
        }
        else {
          p.removeRanking(p.getRankings()[index]);
        }
      }
        break;
    }
  };
  Command.prototype.runRanking = function (p, args) {
    var ranking = p.getRankings()[this.ref.rid];
    switch (this.type) {
      case 'column_set':
      {
        var prop = this.ref.prop;
        var source = ranking.findByPath(this.ref.path);
        source['set' + prop[0].toUpperCase() + prop.slice(1)].call(source, args);
      }
        break;
      case 'column_set_mapping':
      {
        var source = ranking.findByPath(this.ref.path);
        source.setMapping(model.createMappingFunction(args));
      }
        break;
      case 'ranking_set':
      {
        var prop = this.ref.prop;
        ranking['set' + prop[0].toUpperCase() + prop.slice(1)].call(ranking, args);
      }
        break;
      case 'ranking_set_sortcriteria':
        ranking.sortBy(args.col ? ranking.findByPath(args.col) : null, args.asc);
        break;
      case 'ranking_column_add':
      {
        var index = args.index;
        if (args.dump) {
          ranking.insert(p.restoreColumn(args.dump), index);
        }
        else {
          ranking.remove(ranking.at(index));
        }
      }
        break;
      case 'column_add':
      {
        var source = ranking.findByPath(this.ref.path);
        var index = args.index;
        if (args.dump) {
          source.insert(p.restoreColumn(args.dump), index);
        }
        else {
          source.remove(source.at(index));
        }
      }
        break;
    }
  };
  return Command;
}());
var commands = [];
var ignoreNext = false;
function push(type, ref, args, invArgs) {
  if (!ignoreNext) {
    commands.push(new Command(type, ref, args, invArgs));
  }
  ignoreNext = false;
}
function undo(p) {
  ignoreNext = true;
  commands.pop().undo(p);
}
exports.undo = undo;
function delayedCall(callback, timeToDelay, thisCallback) {
  var _this = this;
  if (timeToDelay === void 0) {
    timeToDelay = 100;
  }
  if (thisCallback === void 0) {
    thisCallback = this;
  }
  var tm = -1;
  var oldest = null;

  function callbackImpl(new_) {
    callback.call(thisCallback, oldest, new_);
    oldest = null;
    tm = -1;
  }

  return function (old, new_) {
    if (tm >= 0) {
      clearTimeout(tm);
      tm = -1;
    }
    else {
      oldest = old;
    }
    tm = setTimeout(callbackImpl.bind(_this, new_), timeToDelay);
  };
}
function rankingId(provider, ranking) {
  return provider.getRankings().indexOf(ranking);
}
function recordPropertyChange(source, provider, property, delayed) {
  if (delayed === void 0) {
    delayed = -1;
  }
  var f = function (old, new_) {
    console.log(source, property, old, new_);
    if (source instanceof model.Column) {
      push('column_set', {
        rid: rankingId(provider, source.findMyRanker()),
        path: source.fqpath,
        prop: property
      }, new_, old);
    }
    else if (source instanceof model.Ranking) {
      push('ranking_set', {rid: rankingId(provider, source), prop: property}, new_, old);
    }
  };
  source.on(property + 'Changed.track', delayed > 0 ? delayedCall(f, delayed) : f);
}
function trackColumn(provider, col) {
  recordPropertyChange(col, provider, 'metaData');
  recordPropertyChange(col, provider, 'filter');
  recordPropertyChange(col, provider, 'width', 100);
  if (col instanceof model.CompositeColumn) {
    col.on('addColumn.track', function (column, index) {
      console.log(col.fqpath, 'addColumn', column, index);
      var d = provider.dumpColumn(column);
      push('column_add', {rid: rankingId(provider, col.findMyRanker()), path: col.fqpath}, {
        index: index,
        dump: d
      }, {index: index});
      trackColumn(provider, column);
    });
    col.on('removeColumn.track', function (column, index) {
      console.log(col.fqpath, 'addColumn', column, index);
      var d = provider.dumpColumn(column);
      push('column_add', {
        rid: rankingId(provider, col.findMyRanker()),
        path: col.fqpath
      }, {index: index}, {index: index, dump: d});
      untrackColumn(column);
    });
    col.children.forEach(trackColumn.bind(this, provider));
    if (col instanceof model.StackColumn) {
      recordPropertyChange(col, provider, 'weights', 100);
    }
  }
  else if (col instanceof model.NumberColumn) {
    col.on('mappingChanged.track', function (old, new_) {
      console.log(col.fqpath, 'mapping', old.dump(), new_.dump());
      push('column_set_mapping', {
        rid: rankingId(provider, col.findMyRanker()),
        path: col.fqpath
      }, new_.dump(), old.dump());
    });
  }
  else if (col instanceof model.ScriptColumn) {
    recordPropertyChange(col, provider, 'script');
  }
  else if (col instanceof model.LinkColumn) {
    recordPropertyChange(col, provider, 'link');
  }
  else if (col instanceof model.CategoricalNumberColumn) {
    recordPropertyChange(col, provider, 'mapping');
  }
}
function untrackColumn(col) {
  col.on(['metaDataChanged.filter', 'filterChanged.track', 'widthChanged.track'], null);
  if (col instanceof model.CompositeColumn) {
    col.on(['addColumn.track', 'removeColumn.track'], null);
    col.children.forEach(untrackColumn);
  }
  else if (col instanceof model.NumberColumn) {
    col.on('mappingChanged.track', null);
  }
  else if (col instanceof model.ScriptColumn) {
    col.on('scriptChanged.track', null);
  }
  else if (col instanceof model.LinkColumn) {
    col.on('linkChanged.track', null);
  }
}
function trackRanking(provider, ranking) {
  ranking.on('sortCriteriaChanged.track', function (old, new_) {
    console.log(ranking.id, 'sortCriteriaChanged', old, new_);
    push('ranking_set_sortcriteria', {rid: rankingId(provider, ranking)}, {
      asc: new_.asc,
      col: new_.col ? new_.col.fqpath : null
    }, {asc: old.asc, col: old.col ? old.col.fqpath : null});
  });
  ranking.on('addColumn.track', function (column, index) {
    console.log(ranking, 'addColumn', column, index);
    var d = provider.dumpColumn(column);
    trackColumn(provider, column);
    push('ranking_column_add', {rid: rankingId(provider, ranking)}, {index: index, dump: d}, {index: index});
  });
  ranking.on('removeColumn.track', function (column, index) {
    console.log(ranking, 'removeColumn', column, index);
    var d = provider.dumpColumn(column);
    untrackColumn(column);
    push('ranking_column_add', {rid: rankingId(provider, ranking)}, {index: index}, {index: index, dump: d});
  });
  ranking.children.forEach(trackColumn.bind(this, provider));
}
function untrackRanking(ranking) {
  ranking.on(['sortCriteriaChanged.track', 'addColumn.track', 'removeColumn.track'], null);
  ranking.children.forEach(untrackColumn);
}
function track(p) {
  p.on('addRanking', function (ranking, index) {
    console.log(p, 'addRanking', ranking, index);
    var d = ranking.dump(p.toDescRef);
    push('ranking_add', {}, {index: index, dump: d}, {index: index});
    trackRanking(p, ranking);
  });
  p.on('removeRanking', function (ranking, index) {
    console.log(p, 'removeRanking', ranking, index);
    var d = ranking.dump(p.toDescRef);
    push('ranking_add', {}, {index: index}, {index: index, dump: d});
    untrackRanking(ranking);
  });
  p.getRankings().forEach(trackRanking.bind(this, p));
}
exports.track = track;

window.onload = function () {
  var arr = [
    {a: 10, b: 20, c: 30, d: 'Row1', e: false, l: {alt: 'Google', href: 'https://google.com'}, cat: 'c2'},
    {a: 5, b: 14, c: 2, d: 'Row2', e: true, l: {alt: 'ORF', href: 'https://orf.at'}, cat: 'c3'},
    {a: 2, b: 7, c: 100, d: 'Row3', e: false, l: {alt: 'heise.de', href: 'https://heise.de'}, cat: 'c2'},
    {
      a: 7,
      b: 1,
      c: 60,
      d: 'Row4dasfa dsfasdf  adsf asdf asdf',
      e: false,
      l: {alt: 'Google', href: 'https://google.com'},
      cat: 'c1;c3'
    }];
  var desc = [
    {label: 'D', type: 'string', column: 'd', cssClass: 'orange'},
    {label: 'A', type: 'number', column: 'a', 'domain': [0, 10]},
    {label: 'B', type: 'number', column: 'b', 'domain': [0, 30]},
    {label: 'C', type: 'number', column: 'c', 'domain': [0, 120], color: 'green'},
    {label: 'L', type: 'link', column: 'l'},
    {label: 'L2', type: 'link', column: 'a', link: 'https://duckduckgo.com/?q=$1'},
    {label: 'Cat', type: 'categorical', column: 'cat', categories: ['c1', 'c2', 'c3']},
    {label: 'Ord', type: 'ordinal', column: 'cat', categories: ['c1', 'c2', 'c3']},
    {label: 'Annadfas fasdf adsf asdfasd fasd', type: 'annotate', column: 'd'},
    {label: 'BB', type: 'boolean', column: 'e'}
  ];
  //var colors = d3.scale.category10();
  //desc.forEach(function (d, i) {
  //  d.color = colors(''+i);
  //});
  /*var server = {
   sort: function (desc) {
   return Promise.resolve(d3.shuffle(d3.range(arr.length)));
   },
   view: function (indices) {
   var p = new Promise(function (resolve) {
   setTimeout(function (bak) {
   resolve(indices.map(function (index) {
   return arr[index];
   }));
   }, 2000 * Math.random());
   });
   return p;
   }
   };*/
  var p = new LineUpJS.provider.LocalDataProvider(arr, desc);
  track(p);

  window.undo = undo.bind(this, p);
  var r = p.pushRanking();

  var root = d3.select('body');
  r.insert(p.create(LineUpJS.model.createSelectionDesc()), 0);
  r.push(p.create(desc[0]));
  r.push(p.create(desc[1]));
  r.push(p.create(desc[8]));
  r.push(p.create(desc[9]));
  var rstack = p.create(LineUpJS.model.createStackDesc('Stack'));
  r.push(rstack);
  rstack.push(p.create(desc[1]));
  rstack.push(p.create(desc[2]));
  rstack.push(p.create(desc[3]));
  rstack.setWeights([0.2, 0.4]);
  r.push(p.create(desc[4]));
  var rscript = p.create(LineUpJS.model.createScriptDesc('Script'));
  r.push(p.create(desc[1]));
  r.push(p.create(desc[2]));
  r.push(p.create(desc[3]));
  r.push(rscript);
  rscript.push(p.create(desc[1]));
  rscript.push(p.create(desc[2]));
  rscript.push(p.create(desc[3]));

  var r2 = p.pushRanking();
  r2.push(p.create(desc[1]));
  r2.push(p.create(desc[0]));
  r2.push(p.create(desc[5]));
  r2.push(p.create(desc[6]));
  r2.push(p.create(desc[7]));

  var body = LineUpJS.create(p, root.node(), {
    additionalDesc: [
      LineUpJS.model.StackColumn.desc('+ Stack')
    ],
    htmlLayout: {
      autoRotateLabels: true
    },
    body: {
      renderer: 'svg'
    },
    header: {
      rankingButtons: function ($node) {
        $node.append('button').text('+').on('click', function (d) {
          console.log(d);
        });
      },
      linkTemplates: ['a/$1', 'b/$1']
    },
    renderingOptions: {
      histograms: true
    }
  });
  body.update();
};
