/**
 * Created by Samuel Gratzl on 04.09.2014.
 */

(function (LineUp) {
  var htmlLayout = {
    menuHeight: 25,
    menuHeightExpanded: 50,
    windowOffsetX: 5,
    windowOffsetY: 5,
    headerHeight: 50,
    headerOffsetY: function () {
      return (this.menuHeight + this.windowOffsetY + 3)
    },
    bodyOffsetY: function () {
      return (this.menuHeight + this.windowOffsetY + this.headerHeight + 3)
    }
  };
  var menuActions = [
    {name: " new combined", icon: "fa-plus", action: function () {
      lineup.addNewStackedColumnDialog();
    }},
    {name: " add single columns", icon: "fa-plus", action: function () {
      lineup.addNewSingleColumnDialog();
    }},
    {name: " save layout", icon: "fa-floppy-o", action: saveLayout},
    {name: " load layout", icon: "fa-recycle", action: loadLayout}
  ];
  var lineUpDemoConfig = {
    htmlLayout: {
      headerHeight: htmlLayout.headerHeight
    },
    svgLayout: {
      plusSigns: {
        addStackedColumn: {
          title: "add stacked column",
          action: "addNewEmptyStackedColumn",
          x: 0, y: 2,
          w: 21, h: 21 // LineUpGlobal.htmlLayout.headerHeight/2-4
        }
      }
    }
  };

  var lineup = null;
  var datasets = [];
  var $header = d3.select("#lugui-table-header-svg");
  var $body = d3.select("#lugui-table-body-svg");

  function updateMenu() {
    var config = lineup.config;
    var kv = d3.entries(lineup.config.renderingOptions);
    var kvNodes = d3.select("#lugui-menu-rendering").selectAll("span").data(kv, function (d) {
      return d.key;
    });
    kvNodes.exit().remove();
    kvNodes.enter().append("span").on('click', function (d) {
      config.renderingOptions[d.key] = !config.renderingOptions[d.key];
      updateMenu();
      lineup.updateAll(true);
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
    //add svgs:
    var header = d3.select("#lugui-table-header-svg").attr({
      width: ($(window).width()),
      height: htmlLayout.headerHeight
    });

    var body = d3.select("#lugui-table-body-svg").attr({
      width: ($(window).width())
    });

    // constant layout attributes:
    $("#lugui-menu").css({
      "top": htmlLayout.windowOffsetY + "px",
      "left": htmlLayout.windowOffsetX + "px",
      "height": htmlLayout.menuHeight + "px"
    });
    $("#lugui-table-header").css({
      "top": htmlLayout.headerOffsetY() + "px",
      "left": htmlLayout.windowOffsetX + "px",
      "height": htmlLayout.headerHeight + "px"
    });

    $("#lugui-table-body-wrapper").css({
      "top": htmlLayout.bodyOffsetY() + "px",
      "left": htmlLayout.windowOffsetX + "px"
    });


    // ----- Adjust UI elements...
    var resizeGUI = function () {
      d3.selectAll("#lugui-menu, #lugui-table-header, #lugui-table-body-wrapper").style({
        "width": ($(window).width() - 2 * htmlLayout.windowOffsetX) + "px"
      });
      d3.selectAll("#lugui-table-header-svg, #lugui-table-body-svg").attr({
        "width": ($(window).width() - 2 * htmlLayout.windowOffsetX)
      });
      d3.select("#lugui-table-body-wrapper").style({
        "height": ($(window).height() - htmlLayout.bodyOffsetY()) + "px"
      });
    };

    // .. on window changes...
    $(window).resize(function () {
      resizeGUI();
    });

    // .. and initially once.
    resizeGUI();
  }

  function loadDataImpl(name, desc, _data) {
    var spec = {};
    spec.name = name;
    spec.dataspec = desc;
    delete spec.dataspec.file;
    delete spec.dataspec.separator;
    spec.dataspec.data = _data;
    spec.storage = new LineUpLocalStorage(_data, desc.columns, desc.layout, desc.primaryKey);

    if (lineup) {
      lineup.changeDataStorage(spec);
    } else {
      lineup = new LineUp(spec, $header, $body, $.extend(true, {}, lineUpDemoConfig));
    }
    updateMenu();
    lineup.startVis();
  }

  var loadDataset = function (ds) {
    var name = ds.descriptionFile.substring(0, ds.descriptionFile.length - 5);
    d3.json(ds.baseURL + "/" + ds.descriptionFile, function (desc) {
      if (desc.data) {
        loadDataImpl(name, desc, desc.data);
      } else if (desc.file) {
        d3.dsv(desc.separator || '\t', 'text/plain')(ds.baseURL + "/" + desc.file, function (_data) {
          loadDataImpl(name, desc, _data);
        });
      }
    })
  };


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
    var that = lineup;

    function loadDataImpl(name, desc, _data) {
      var spec = {};
      spec.name = name;
      spec.dataspec = desc;
      delete spec.dataspec.file;
      delete spec.dataspec.separator;
      spec.dataspec.data = _data;
      spec.storage = new LineUpLocalStorage(_data, desc.columns, desc.layout, desc.primaryKey);
      that.changeDataStorage(spec);
      updateMenu();
      that.startVis();
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

    lineup.uploadUI(function (files) {
      var descs = files.filter(function (f) {
        return f.name.match(/.*\.json/i) || f.type === 'application/json';
      });

      if (descs.length > 0) {
        var reader = new FileReader();

        // Closure to capture the file information.
        reader.onload = function (e) {
          var desc = e.target.result;
          var name = descs[0].name.substring(0, descs[0].name.length - 5);
          desc = JSON.parse(desc);
          if (desc.data) {
            loadDataImpl(name, desc, desc.data);
          } else if (desc.url) {
            d3.dsv(desc.separator || '\t', 'text/plain')(desc.url, function (_data) {
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
      }
    });
  }

// document ready
  $(function () {
      layoutHTML();

      d3.json("datasets.json", function (error, data) {
        console.log("datasets:", data, error);

        datasets = data.datasets;
        var $s = d3.select("#lugui-dataset-selector");
        var ds = $s.selectAll("option").data(data.datasets);
        ds.enter().append("option")
          .attr('value', function (d, i) {
            return i;
          }).text(function (d) {
            return d.name;
          });

        var s = $s.node();
        s.addEventListener('change', function () {
          loadDataset(datasets[s.value]);
        });

        //and start with 0:
        loadDataset(datasets[0]);
      });
    })
}(LineUp));
