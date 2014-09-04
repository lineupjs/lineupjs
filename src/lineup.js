/**
 * Global LineUp Variables
 * @property {d3.scale} columncolors - color scale for columns
 */
var LineUpGlobal = {
  colorMapping: d3.map(),
  columnColors: d3.scale.category20(),
  grayColor: "#999999",
  numberformat : d3.format('.3n'),
  htmlLayout: {
    headerHeight: 50
  },
  svgLayout: {
    rowHeight: 20,
    plusSigns: {
      /* addStackedColumn: {
        title: "add stacked column",
        action: "addNewEmptyStackedColumn",
        x: 0, y: 2,
        w: 21, h: 21 // LineUpGlobal.htmlLayout.headerHeight/2-4
      }*/
    },
    rowActions : [
      /*{
       name: "explore",
       icon: "\uf067",
       action: function(row) {
       console.log(row);
       }
       }*/]
  },
  nodragging : false
};


var LineUpInstance = {
  htmlLayout: {
    menuHeight: 25,
    menuHeightExpanded: 50,
    windowOffsetX: 5,
    windowOffsetY: 5,
    headerOffsetY: function () {
      return (this.menuHeight + this.windowOffsetY + 3)
    },
    bodyOffsetY: function () {
      return (this.menuHeight + this.windowOffsetY + this.headerHeight + 3)
    }
  },
  actionOptions: [
    {name: " new combined", icon: "fa-plus", action: "addNewStackedColumnDialog"},
    {name: " add single columns", icon: "fa-plus", action: "addNewSingleColumnDialog"},
    {name: " save layout", icon: "fa-floppy-o", action: "saveLayout"},
    {name: " load layout", icon: "fa-recycle", action: "loadLayout"}
  ],
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

/**
 * Constructor to Create a LineUp Visualization
 * @param spec - the specifications object
 * @param spec.storage - a LineUp Storage, see {@link LineUpLocalStorage}
 * @constructor
 */
var LineUp = function (spec, $header, $body, config) {
  this.storage = spec.storage;
  this.spec = spec;
//    this.sortedColumn = [];
  this.$header = $header;
  this.$body = $body;

  this.config = $.extend(true, {}, config, {
    renderingOptions: {
      stacked: false
    },
    columnBundles: {
      "primary": {
        sortedColumn: null,
        sortingOrderAsc: true
      },
      "secondary": {
        sortedColumn: [],
        sortingOrderAsc: true
      }
    }});

  this.headerUpdateRequired = true;
  this.stackedColumnModified = null;

  var that = this;

  /*
   * define dragging behaviour for header weights
   * */

  function dragWeightStarted() {
    d3.event.sourceEvent.stopPropagation();
    d3.select(this).classed("dragging", true);
  }


  function draggedWeight() {
    var newValue = Math.max(d3.mouse(this.parentNode)[0], 2);
    that.reweightHeader({column: d3.select(this).data()[0], value: newValue});
    that.updateBody(that.storage.getColumnLayout(), that.storage.getData(), false)
  }

  function dragWeightEnded() {
    d3.select(this).classed("dragging", false);

    if (config.columnBundles.primary.sortedColumn instanceof LayoutStackedColumn) {
      that.storage.resortData({column: config.columnBundles.primary.sortedColumn});
      that.updateBody(that.storage.getColumnLayout(), that.storage.getData(), false);
    }
//        that.updateBody(that.storage.getColumnLayout(), that.storage.getData())

    // TODO: integrate columnbundles dynamically !!
  }


  this.dragWeight = d3.behavior.drag()
    .origin(function (d) {
      return d;
    })
    .on("dragstart", dragWeightStarted)
    .on("drag", draggedWeight)
    .on("dragend", dragWeightEnded);
};

LineUp.prototype.changeDataStorage = function (spec) {
//    d3.select("#lugui-table-header-svg").selectAll().remove();
  this.storage = spec.storage;
  this.spec = spec;
  this.sortedColumn = [];
};

/**
 * the function to start the LineUp visualization
 */
LineUp.prototype.startVis = function () {
  this.assignColors(this.storage.getRawColumns());
  //initial sort
  //this.storage.resortData({});
  this.updateHeader(this.storage.getColumnLayout());
  this.updateBody(this.storage.getColumnLayout(), this.storage.getData(), false);
};

LineUp.prototype.updateAll = function () {
  this.updateHeader(this.storage.getColumnLayout());
  this.updateBody(this.storage.getColumnLayout(), this.storage.getData(), false)
};

LineUp.prototype.updateMenu = function () {
  var kv = d3.entries(LineUpGlobal.renderingOptions);

  var that = this;
  var config = this.config;
  var kvNodes = d3.select("#lugui-menu-rendering").selectAll("span").data(kv, function (d) {
    return d.key;
  });
  kvNodes.exit().remove();
  kvNodes.enter().append("span").on('click',function (d) {
    config.renderingOptions[d.key] = !config.renderingOptions[d.key];
    that.updateMenu();
    that.updateHeader(that.storage.getColumnLayout());
    that.updateBody(that.storage.getColumnLayout(), that.storage.getData(), true)
  });
  kvNodes.html(function (d) {
    return '<a href="#"> <i class="fa ' + (d.value ? 'fa-check-square-o' : 'fa-square-o') + '" ></i> ' + d.key + '</a>&nbsp;&nbsp;'
  });

  var actionNodes = d3.select("#lugui-menu-actions").selectAll("span").data(config.actionOptions)
    .enter().append("span").html(
    function (d) {
      return '<i class="fa ' + (d.icon) + '" ></i>' + d.name + '&nbsp;&nbsp;'
    }
  ).on("click", function (d) {
      console.log(d.action);
      if ($.isFunction(d.action)) {
        d.action.call(that, d);
      } else {
        that[d.action](d);
      }
    })


};


var layoutHTML = function () {
  //add svgs:
  var header = d3.select("#lugui-table-header-svg").attr({
    width: ($(window).width()),
    height: LineUpGlobal.htmlLayout.headerHeight
  });

  var body = d3.select("#lugui-table-body-svg").attr({
    width: ($(window).width())
  });

  // constant layout attributes:
  $("#lugui-menu").css({
    "top": LineUpGlobal.htmlLayout.windowOffsetY + "px",
    "left": LineUpGlobal.htmlLayout.windowOffsetX + "px",
    "height": LineUpGlobal.htmlLayout.menuHeight + "px"
  });
  $("#lugui-table-header").css({
    "top": LineUpGlobal.htmlLayout.headerOffsetY() + "px",
    "left": LineUpGlobal.htmlLayout.windowOffsetX + "px",
    "height": LineUpGlobal.htmlLayout.headerHeight + "px"
  });

  $("#lugui-table-body-wrapper").css({
    "top": LineUpGlobal.htmlLayout.bodyOffsetY() + "px",
    "left": LineUpGlobal.htmlLayout.windowOffsetX + "px"
  });


  // ----- Adjust UI elements...
  var resizeGUI = function () {
    d3.selectAll("#lugui-menu, #lugui-table-header, #lugui-table-body-wrapper").style({
      "width": ($(window).width() - 2 * LineUpGlobal.htmlLayout.windowOffsetX) + "px"
    });
    d3.selectAll("#lugui-table-header-svg, #lugui-table-body-svg").attr({
      "width": ($(window).width() - 2 * LineUpGlobal.htmlLayout.windowOffsetX)
    });
    d3.select("#lugui-table-body-wrapper").style({
      "height": ($(window).height() - LineUpGlobal.htmlLayout.bodyOffsetY()) + "px"
    });
  };

  // .. on window changes...
  $(window).resize(function () {
    resizeGUI();
  });

  // .. and initially once.
  resizeGUI();


};


// document ready
$(
  function () {
    layoutHTML();
    var $header = d3.select("#lugui-table-header-svg");
    var $body = d3.select("#lugui-table-body-svg");
    var lineup = null;
    var datasets = [];

    function loadDataImpl(name, desc, _data) {
      var spec = {};
      spec.name = name;
      spec.dataspec = desc;
      delete spec.dataspec.file;
      delete spec.dataspec.separator;
      spec.dataspec.data = _data;
      spec.storage = new LineUpLocalStorage(_data, desc.columns, desc.layout, desc.primaryKey, LineUpGlobal);

      if (lineup) {
        lineup.changeDataStorage(spec);
      } else {
        lineup = new LineUp(spec, $header, $body, $.extend(true, {}, LineUpGlobal));
      }
      lineup.updateMenu();
      lineup.startVis();
    }

    var loadDataset = function (ds) {
      var name = ds.descriptionFile.substring(0,ds.descriptionFile.length-5);
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
});


LineUp.prototype.saveLayout = function () {
  //full spec
  var s = $.extend({},{},this.spec.dataspec);
  //create current layout
  var descs = this.storage.getColumnLayout()
    .map(function (d) {
      return d.description();
    });
  s.layout = _.groupBy(descs, function(d) {
    return d.columnBundle;
  });
  //stringify with pretty print
  var str = JSON.stringify(s, null, '\t');
  //create blob and save it
  var blob = new Blob([str], {type: "application/json;charset=utf-8"});
  saveAs(blob, 'LineUp-' + this.spec.name+'.json');
};

LineUp.prototype.loadLayout = function () {
  var that = this;
  function loadDataImpl(name, desc, _data) {
    var spec = {};
    spec.name = name;
    spec.dataspec = desc;
    delete spec.dataspec.file;
    delete spec.dataspec.separator;
    spec.dataspec.data = _data;
    spec.storage = new LineUpLocalStorage(_data, desc.columns, desc.layout, desc.primaryKey, LineUpGlobal);

    that.changeDataStorage(spec);
    lineup.updateMenu();
    that.startVis();
  }

  function loadDataFile(name, desc, datafile) {
    var reader = new FileReader();
    reader.onload = function(e) {
      var data_s = e.target.result;
      var _data = d3.dsv(desc.separator || '\t', 'text/plain').parse(data_s);
      loadDataImpl(name, desc, _data);
    };
    // Read in the image file as a data URL.
    reader.readAsText(datafile);
  }

  this.uploadUI(function (files) {
    var descs = files.filter(function (f) {
      return f.name.match(/.*\.json/i) || f.type === 'application/json';
    });

    if (descs.length > 0) {
      var reader = new FileReader();

      // Closure to capture the file information.
      reader.onload = function(e) {
        var desc = e.target.result;
        var name = descs[0].name.substring(0,descs[0].name.length-5);
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
};
