/**
 * Created by Samuel Gratzl on 04.09.2014.
 */

(function (LineUp) {
  var menuActions = [
    {name: " new combined", icon: "fa-plus", action: function () {
      lineup.addNewStackedColumnDialog();
    }},
    {name: " add single columns", icon: "fa-plus", action: function () {
      lineup.addNewSingleColumnDialog();
    }},
    {name: " save layout", icon: "fa-floppy-o", action: saveLayout}
  ];
  var lineUpDemoConfig = {
    svgLayout: {
      mode: 'separate',
      plusSigns: {
        addStackedColumn: {
          title: "add stacked column",
          action: "addNewEmptyStackedColumn",
          x: 0, y: 2,
          w: 21, h: 21 // LineUpGlobal.htmlLayout.headerHeight/2-4
        }
      }
    },
    renderingOptions: {
      stacked: true
    }
  };

  var lineup = null;
  var datasets = [];

  $(window).resize(function() {
    if (lineup) {
      lineup.updateBody()
    }
  });
  function updateMenu() {
    var config = lineup.config;
    var kv = d3.entries(lineup.config.renderingOptions);
    var kvNodes = d3.select("#lugui-menu-rendering").selectAll("span").data(kv, function (d) {
      return d.key;
    });
    kvNodes.exit().remove();
    kvNodes.enter().append("span").on('click', function (d) {
      lineup.changeRenderingOption(d.key, !config.renderingOptions[d.key]);
      updateMenu();
    });
    kvNodes.html(function (d) {
      return '<a href="#"> <i class="fa ' + (d.value ? 'fa-check-square-o' : 'fa-square-o') + '" ></i> ' + d.key + '</a>&nbsp;&nbsp;'
    });

    d3.select("#lugui-menu-actions").selectAll("span").data(menuActions)
      .enter().append("span").html(
      function (d) {
        return '<i class="fa ' + (d.icon) + '" ></i>' + d.name + '&nbsp;&nbsp;'
      }
    ).on("click", function (d) {
      d.action.call(d);
    })


  }

  function layoutHTML() {

  }

  function loadDataImpl(name, desc, _data) {
    var spec = {};
    spec.name = name;
    spec.dataspec = desc;
    delete spec.dataspec.file;
    delete spec.dataspec.separator;
    spec.dataspec.data = _data;
    spec.storage = LineUp.createLocalStorage(_data, desc.columns, desc.layout, desc.primaryKey);

    if (lineup) {
      lineup.changeDataStorage(spec);
    } else {
      lineup = LineUp.create(spec, d3.select('#lugui-wrapper'), lineUpDemoConfig);
    }
    updateMenu();
  }

  function loadDataset(ds) {
    function loadDesc(desc, baseUrl) {
      if (desc.data) {
        loadDataImpl(name, desc, desc.data);
      } else if (desc.file) {
        d3.dsv(desc.separator || '\t', 'text/plain')(baseUrl + "/" + desc.file, function (_data) {
          loadDataImpl(name, desc, _data);

          if (desc.sortBy) {
            lineup.sortBy(desc.sortBy);
          }
        });
      }
    }
    document.title = 'LineUp - '+ (ds.name || 'Custom');
    history.pushState(ds, 'LineUp - '+ (ds.name || 'Custom'), '#'+ (ds.id || 'custom'));

    if (ds.descriptionFile) {
      var name = ds.descriptionFile.substring(0, ds.descriptionFile.length - 5);
      d3.json(ds.baseURL + "/" + ds.descriptionFile, function (desc) {
        loadDesc(desc, ds.baseURL);
      })
    } else {
      loadDesc(ds, '');
    }
  }

  function uploadUI(dropCallback) {
    function handleFileSelect(evt) {
      evt.stopPropagation();
      evt.preventDefault();
      var files = evt.target.files || evt.dataTransfer.files;
      //console.log('drop',files);
      files = Array.prototype.slice.call(files); // FileList object.
      dropCallback(files);
    }

    function handleDragOver(evt) {
      evt.stopPropagation();
      evt.preventDefault();
      evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
    }
    var $file = d3.select('input[type="file"]');
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
    drop.addEventListener('drop', handleFileSelect, false);
  }


  function saveLayout() {
    //full spec
    var s = $.extend({}, {}, lineup.spec.dataspec);
    //create current layout
    var descs = lineup.storage.getColumnLayout()
      .map(function (d) {
        return d.description();
      });
    s.layout = _.groupBy(descs, function (d) {
      return d.columnBundle;
    });
    //stringify with pretty print
    var str = JSON.stringify(s, null, '\t');
    //create blob and save it
    var blob = new Blob([str], {type: "application/json;charset=utf-8"});
    saveAs(blob, 'LineUp-' + lineup.spec.name + '.json');
  }

  function loadLayout() {
    function loadDataImpl(name, desc, _data) {
      var spec = {};
      spec.name = name;
      spec.dataspec = desc;
      delete spec.dataspec.file;
      delete spec.dataspec.separator;
      spec.dataspec.data = _data;
      spec.storage = LineUp.createLocalStorage(_data, desc.columns, desc.layout, desc.primaryKey);
      lineup.changeDataStorage(spec);
      updateMenu();
      lineup.startVis();
    }

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
          var name = f.name.substring(0, f.name.lastIndexOf('.'));
          loadDataImpl(name, desc, _data);
        };
        reader.readAsText(f);
      }
    });
  }

// document ready
  $(function () {
      layoutHTML();

      d3.json("datasets.json", function (error, data) {
        //console.log("datasets:", data, error);

        datasets = data.datasets;
        var $s = d3.select("#lugui-dataset-selector");
        var ds = $s.selectAll("option").data(data.datasets);
        ds.enter().append("option")
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
          $s.property('value', datasets.indexOf(old));
          loadDataset(old);
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
  })
}(LineUp));
