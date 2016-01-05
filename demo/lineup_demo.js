/**
 * Created by Samuel Gratzl on 04.09.2014.
 */

(function (LineUpJS) {
  var menuActions = [
    {name: ' new combined', icon: 'fa-plus', action: function () {
      var r = lineup.data.getRankings();
      r = r[r.length-1];
      lineup.data.push(r, LineUpJS.model.StackColumn.desc('Combined'));
    }},
    {name: ' new ranking', icon: 'fa-plus', action: function () {
      var old = lineup.data.getRankings()[0];
      var r = lineup.data.pushRanking();
      r.push(lineup.data.clone(old.children[0]));
    }},
    {name: ' add single columns', icon: 'fa-plus', action: openAddColumnDialog},
    {name: ' save layout', icon: 'fa-floppy-o', action: saveLayout}
  ];
  var lineUpDemoConfig = {
    renderingOptions: {
      stacked: true,
      histograms: true
    },
    svgLayout: {
      freezeCols: 2
    }
  };

  var lineup = null;
  var datasets = [];

  d3.select(window).on('resize', function() {
    if (lineup) {
      lineup.update()
    }
  });
  function updateMenu() {
    var config = lineup.config;
    var kvNodes = d3.select('#lugui-menu-rendering').selectAll('span').data(['stacked', 'animation']);
    kvNodes.exit().remove();
    kvNodes.enter().append('span').on('click', function (d) {
      lineup.changeRenderingOption(d, !config.renderingOptions[d]);
      updateMenu();
    });
    kvNodes.html(function (d) {
      return '<a href="#"> <i class="fa ' + (config.renderingOptions[d] ? 'fa-check-square-o' : 'fa-square-o') + '" ></i> ' + d + '</a>&nbsp;&nbsp;'
    });

    d3.select('#lugui-menu-actions').selectAll('span').data(menuActions)
      .enter().append('span').html(
      function (d) {
        return '<i class="fa ' + (d.icon) + '" ></i>' + d.name + '&nbsp;&nbsp;'
      }
    ).on('click', function (d) {
      d.action.call(d);
    })
  }

  function fixMissing(columns, data) {
    columns.forEach(function(col){
      if (col.type === 'number' && !col.domain) {
        var old = col.domain || [NaN, NaN];
        var minmax = d3.extent(data, function (row) { return row[col.column].length === 0 ? undefined : +(row[col.column])});
        col.domain = [
          isNaN(old[0]) ? minmax[0] : old[0],
          isNaN(old[1]) ? minmax[1] : old[1]
        ];
      } else if (col.type === 'categorical' && !col.categories) {
        var sset = d3.set(data.map(function (row) { return row[col];}));
        col.categories = sset.values().sort();
      }
    });
  }

  function loadDataImpl(name, desc, _data) {
    fixMissing(desc.columns, _data);
    var provider = LineUpJS.createLocalStorage(_data, LineUpJS.deriveColors(desc.columns));
    lineUpDemoConfig.name = name;
    if (lineup) {
      lineup.changeDataStorage(provider, desc);
    } else {
      lineup = LineUpJS.create(provider, d3.select('#lugui-wrapper'), lineUpDemoConfig);
      lineup.addPool(d3.select('#pool').node(), {
        hideUsed: false
      }).update();
      lineup.restore(desc);
    }
    provider.deriveDefault();
    updateMenu();
  }

  function loadDataset(ds) {
    function loadDesc(desc, baseUrl) {
      if (desc.data) {
        loadDataImpl(name, desc, desc.data);
      } else if (desc.file) {
        d3.dsv(desc.separator || '\t', 'text/plain')(baseUrl + '/' + desc.file, function (_data) {
          loadDataImpl(name, desc, _data);
        });
      }
    }
    document.title = 'LineUp - '+ (ds.name || 'Custom');
    history.pushState(ds, 'LineUp - '+ (ds.name || 'Custom'), '#'+ (ds.id || 'custom'));

    if (ds.descriptionFile) {
      var name = ds.descriptionFile.substring(0, ds.descriptionFile.length - 5);
      d3.json(ds.baseURL + '/' + ds.descriptionFile, function (desc) {
        loadDesc(desc, ds.baseURL);
      })
    } else {
      loadDesc(ds, '');
    }
  }

  function uploadUI(dropFileCallback, dropURLCallback) {
    function handleFileSelect(evt) {
      evt.stopPropagation();
      evt.preventDefault();
      var files = evt.target.files || evt.dataTransfer.files;
      //console.log('drop',files);
      files = Array.prototype.slice.call(files); // FileList object.
      dropFileCallback(files);
    }

    function handleDragOver(evt) {
      evt.stopPropagation();
      evt.preventDefault();
      evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
    }
    var $file = d3.select('#lugui-menu input[type="file"]');
    $file.node().addEventListener('change', handleFileSelect, false);
    var $drop = d3.select('#drop_zone');
    var drop = $drop.node();
    drop.addEventListener('dragenter', function() {
      $drop.classed('dragging',true);
    }, false);
    drop.addEventListener('dragleave', function() {
      $drop.classed('dragging',false);
    }, false);
    drop.addEventListener('dragover', handleDragOver, false);
    drop.addEventListener('drop', function(evt) {
      evt.stopPropagation();
      evt.preventDefault();
      var files = evt.dataTransfer.files;
      //console.log('drop',files);
      files = Array.prototype.slice.call(files); // FileList object.
      if (files.length > 0) {
        return dropFileCallback(files);
      } else {
        var url = evt.dataTransfer.getData('text/uri-list');
        if (url) {
          return dropURLCallback(url);
        }
      }
      console.error('unknown datatransfer');
    }, false);
  }

  function openAddColumnDialog() {
    d3.select('#pool').style('display','block');
  }
  d3.select('#pool > div i.fa-close').on('click', function() {
    d3.select('#pool').style('display','none');
  });


  function saveLayout() {
    //full spec
    var s = lineup.dump();
    s.columns = lineup.data.columns;
    s.data = lineup.data.data;

    //stringify with pretty print
    var str = JSON.stringify(s, null, '\t');
    //create blob and save it
    var blob = new Blob([str], {type: 'application/json;charset=utf-8'});
    saveAs(blob, 'LineUp-'+lineUpDemoConfig.name+'.json');
  }

  function loadLayout() {
    function loadDataFile(name, desc, datafile) {
      var reader = new FileReader();
      reader.onload = function (e) {
        var data_s = e.target.result;
        var _data = d3.dsv(desc.separator || '\t', 'text/plain').parse(data_s);
        loadDataImpl(name, desc, _data);
      };
      // Read in the image file as a data URL.
      reader.readAsText(datafile);
    }

    function countOccurrences(text, char) {
      return (text.match(new RegExp(char,'g'))||[]).length;
    }

    function isNumeric(obj) {
      return (obj - parseFloat(obj) + 1) >= 0;
    }

    function deriveDesc(columns, data, separator) {
      var cols = columns.map(function(col) {
        var r = {
          label: col,
          column: col,
          type: 'string'
        };
        if (isNumeric(data[0][col])) {
          r.type = 'number';
          r.domain = d3.extent(data, function (row) { return row[col].length === 0 ? undefined : +(row[col])});
        } else {
          var sset = d3.set(data.map(function (row) { return row[col];}));
          if (sset.size() <= Math.max(20, data.length * 0.2)) { //at most 20 percent unique values
            r.type = 'categorical';
            r.categories = sset.values().sort();
          }
        }
        return r;
      });
      return {
        separator: separator,
        primaryKey : columns[0],
        columns: cols
      };
    }

    function normalizeValue(val) {
      if (typeof val === 'string') {
        val = val.trim();
        if (val.length >= 2 && val.charAt(0) === '"' && val.charAt(val.length-1) === '"') {
          val = val.slice(1, val.length-1);
        }
      }
      return val;
    }
    /**
     * trims the given object
     * @param row
     * @return {{}}
     */
    function normalizeRow(row) {
      var r = {};
      Object.keys(row).forEach(function (key) {
        r[normalizeValue(key)] = normalizeValue(row[key]);
      });
      return r;
    }

    function loadDataFileFromText(data_s, fileName) {
      var header = data_s.slice(0,data_s.indexOf('\n'));
      //guess the separator,
      var separator = [',','\t',';'].reduce(function(prev, current) {
        var c = countOccurrences(header, current);
        if (c > prev.c) {
          prev.c = c;
          prev.s = current;
        }
        return prev;
      },{ s: ',', c : 0});
      var _data = d3.dsv(separator.s, 'text/plain').parse(data_s, normalizeRow);
      //derive a description file
      var desc = deriveDesc(header.split(separator.s).map(normalizeValue), _data);
      var name = fileName.substring(0, fileName.lastIndexOf('.'));
      loadDataImpl(name, desc, _data);
    }

    uploadUI(function (files) {
      var descs = files.filter(function (f) {
        return f.name.match(/.*\.json/i) || f.type === 'application/json';
      });

      var reader = new FileReader();
      if (descs.length > 0) {
        // Closure to capture the file information.
        reader.onload = function (e) {
          var desc = e.target.result;
          var name = descs[0].name.substring(0, descs[0].name.length - 5);
          desc = JSON.parse(desc);
          if (desc.data) {
            loadDataImpl(name, desc, desc.data);
          } else if (desc.url) {
            d3.dsv(desc.separator || '\t', 'text/plain')(desc.url, normalizeRow, function (_data) {
              loadDataImpl(name, desc, _data);
            });
          } else if (desc.file) {
            var d = files.filter(function (f) {
              return f.name === desc.file;
            });
            if (d.length > 0) {
              loadDataFile(name, desc, d[0]);
            }
          }
        };
        // Read in the image file as a data URL.
        reader.readAsText(descs[0]);
      } else if (files.length === 1 && files[0].name.match(/.*\.(tsv|csv|txt)/)) {
        //just a data file
        var f = files[0];
        reader.onload = function (e) {
          var data_s = e.target.result;
          loadDataFileFromText(data_s, f.name);
        };
        reader.readAsText(f);
      }
    }, function (url) {
      //access the url using get request and then parse the data file
      d3.text(url, 'text/plain', function(data) {
        loadDataFileFromText(data, 'by_url');
      });
    });
  }

// document ready
  d3.json('datasets.json', function (error, data) {
    //console.log('datasets:', data, error);

    datasets = data.datasets;
    var $s = d3.select('#lugui-dataset-selector');
    var ds = $s.selectAll('option').data(data.datasets);
    ds.enter().append('option')
      .attr('value', function (d, i) {
        return i;
      }).text(function (d) {
        return d.name;
      });
    $s.on('change', function() {
      loadDataset(datasets[this.value]);
    });

    var old = history.state;
    if (old) {
      var choose = datasets.filter(function(d) { return d.id === old.id; });
      $s.property('value', datasets.indexOf(choose[0]));
      loadDataset(choose[0]);
    } else if (window.location.hash) {
      var choose = datasets.filter(function(d) { return d.id === window.location.hash.substr(1); });
      if (choose.length > 0) {
        $s.property('value', datasets.indexOf(choose[0]));
        loadDataset(choose[0]);
      } else {
        loadDataset(datasets[0]);
      }
    } else {
      //and start with 0:
      loadDataset(datasets[0]);
    }
    loadLayout();
  });
}(LineUpJS));
