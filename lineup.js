function LineUpColumn(desc) {
	this._desc = desc;
	this.column = desc.column;
	this.width = desc.width || 100;
	this.label= desc.label || desc.column;
	this.id = desc.id || this.column;
}
LineUpColumn.prototype = {
	init : function(table, data) {
		this.table = table
	},
	load : function($cell, row, i) {
		this.update($cell, row, i)
	},
	update : function($cell, row, i) {
		$cell.text(this.get(row, i))	
	},
	get : function(row) {
		return row[this.column];
	},
	findTh : function() { return d3.select("#"+this.id+"_th")},
	loadTh : function($cell) {
		$cell.attr("id",this.id+"_th").attr("class",this.id);
		$cell.append("div").attr("class","drag");
		var that = this;
		var table = this.findTable();
		$cell.append("span").text(this.label);
		$cell.on("dblclick", function(col) {
			table.sortBy(that);
		})
	},
	findCol : function() { return d3.select("#"+this.id+"_col")},
	loadCol : function($col) {
		$col.attr("id",this.id+"_col").style("width",this.width+"px")
	},
	changeWidth : function(delta) {
		this.width += delta;
		this.findCol().style("width",this.width+"px");
	},
	sortBy : function(a,b) {
		var va = this.get(a);
		var vb = this.get(b);
		return d3.ascending(va,vb);
	},
	filterBy : function(row) {
		return true;
	},
	findTable : function() {
		if (this.parent)
			return this.parent.findTable();
		return this.table;
	}
};

function LineUpNumber(desc) {
	LineUpColumn.call(this,desc)

	this.scale = d3.scale.linear().domain(desc.domain).range([0,1]);
	this.filter = desc.filter || [0,100];
}
LineUpNumber.prototype = $.extend({},LineUpColumn.prototype,{
	init : function(table, data) {
		LineUpColumn.prototype.init.call(this, table, data)
		var that = this;
		data.forEach(function(row) {
			row[that.column] = that.getN(row);
		})
	},
	load : function($cell, row) {
		$cell.append("div");
		this.update($cell, row);
	},
	update : function($cell, row) {
		$cell.select("div")
			.attr("class",this.id)
			.style("width",this.getS(row)*100+"%")
			.text(this.get(row));
	},
	getS : function(row) {
		return this.scale(this.getN(row));
	},
	getN : function(row) {
		return +LineUpColumn.prototype.get.call(this, row);
	},
	get : function(row) {
		return d3.round(this.getN(row),3)
	},
	sortBy : function(a,b) {
		var va = this.getN(a);
		var vb = this.getN(b);
		return d3.descending(va,vb);
	},
	filterBy : function(row) {
		var n = this.getN(row);
		return n >= this.filter[0] && n <= this.filter[1];
	}
});

function LineUpString(desc) {
	LineUpColumn.call(this,desc)
	this.filter = desc.filter || undefined;
}
LineUpString.prototype = $.extend({},LineUpColumn.prototype, {
	filterBy : function(value) {
		if (!this.filter)
			return true
		return value.contains(this.filter);
	}
});

function LineUpRank(desc) {
	LineUpColumn.call(this,desc)
	this.width = desc.width || 40;
	this.id = "rank";
	this.label = desc.label || "Rank";
}
LineUpRank.prototype = $.extend({},LineUpColumn.prototype, {
	get : function(row, i) {
		return i+1;
	},
	sortBy : undefined
});

function LineUpComposite(desc, toColumn) {
	LineUpColumn.call(this,desc)
	this.children = desc.children.map(toColumn);
	for (var i = this.children.length - 1; i >= 0; i--) {
		this.children[i].parent = this;
	};
}
LineUpComposite.prototype = $.extend({},LineUpColumn.prototype, {
	init : function(table, data) {
		LineUpColumn.prototype.init.call(this, table, data)
		var that = this;
		this.children.forEach(function(child) {
			child.init(table, data)
		})
	},
});

function LineUpMax(desc,toColumn) {
	LineUpComposite.call(this,desc,toColumn)
	this.filter = desc.filter || [0,1];
}
LineUpMax.prototype = $.extend({},LineUpComposite.prototype, LineUpNumber.prototype, {
	init : function(table, data) {
		LineUpComposite.prototype.init.call(this, table, data)
	},
	select : function(row) {
		var key = "_"+this.id
		if (row[key] !== undefined)
			return this.children[row[key]]
		var m = -1;
		var mi = 0;
		for (var i = this.children.length - 1; i >= 0; i--) {
			var child = this.children[i];
			var cm = child.getS(row);
			if (cm > m) {
				m = cm;
				mi = i;
			}
		};
		row[key] = mi;
		var best = this.children[mi];
		return best;
	},
	update : function($cell, row) {
		LineUpNumber.prototype.update.call(this,$cell,row);
		$cell.select("div")
			.classed(this.select(row).column,true);
	},
	getS : function(row) {
		return this.getN(row);
	},
	getN : function(row) {
		return this.select(row).getS(row);
	},
	get : function(row) {
		return this.select(row).get(row);
	}
});

function LineUpStacked(desc,toColumn) {
	LineUpComposite.call(this,desc,toColumn)
	this.hierarchical = this.children;
	this.compressed = false;
	this.filter = desc.filter || [0,1];
	this.width = 0;
	for (var i = this.children.length - 1; i >= 0; i--) {
		var child = this.children[i];
		this.width += child.width;
		if (child.hierarchical)
			child.compressed = true;
	};
}
LineUpStacked.prototype = $.extend({},LineUpComposite.prototype, LineUpNumber.prototype, {
	init : function(table, data) {
		LineUpComposite.prototype.init.call(this, table, data)
	},
	weights : function() {
		var r = [];
		var ws = 0;
		for (var i = this.children.length - 1; i >= 0; i--) {
			r[i] = this.children[i].width;
			ws += r[i];
		};
		for (var i = r.length - 1; i >= 0; i--) {
			r[i] = r[i] / ws;
		};
		return r;		
	},
	getS : function(row) {
		return this.getN(row);
	},
	getN : function(row) {
		var key = "_"+this.id
		if (row[key] !== undefined)
			return row[key]

		var w = this.weights();
		var s = 0;
		for (var i = this.children.length - 1; i >= 0; i--) {
			s += w[i] * this.children[i].getS(row);
		};
		row[key] = s;
		return s;
	},
	get : function(row) {
		return d3.round(this.getN(row),3);
	}
});

function LineUpTable(tableId, data, cols, options) {
	this.$table = d3.select(tableId).classed("lineup",true);
	this.$colgroups = this.$table.append("colgroup");
	this.$thead = this.$table.append("thead");
	this.$tbody = this.$table.append("tbody");
	this.options = options;
	
	this.data = data;
	this.cols = cols;
	var that = this;
	cols.forEach(function(col) {
		col.init(that, data);
	})

	this.init()
}
LineUpTable.prototype = $.extend({}, {
	init : function() {
		//compute nesting level
		var hasSecondLevel = false;
		this.cols.forEach(function(c) { if (c.hierarchical && !c.compressed) hasSecondLevel = true });
		//create header line
		var flatcols = this.flatCols();
		var $colgroups = this.$colgroups;
		var $thead = this.$thead;

		this.cols.forEach(function(c) {
			var e;
			if (c.hierarchical && !c.compressed) {
				//e = $colgroups.append("colgroup");
				c.hierarchical.forEach(function (cc) {
					cc.loadCol($colgroups.append("col"))
				})
			} else {
				c.loadCol($colgroups.append("col"));
			}			
		})
		
		function fillTh(col) {
			var $th = d3.select(this);
			col.loadTh($th);
		}
		//create header lin e
		$thead.append("tr").selectAll("th").data(this.cols)
			.enter()
				.append("th")
				.each(fillTh)
				.each(function(x) { 
					var $th = d3.select(this);
					if (hasSecondLevel && !(x.hierarchical && !x.compressed))
						$th.attr("rowspan",2)
					if ((x.hierarchical && !x.compressed))
						$th.attr("colspan",x.hierarchical.length)
				})
		if (hasSecondLevel) {
			$thead.append("tr").selectAll("th").data(flatcols)
			.enter()
				.append("th")
				.each(fillTh)
				.each(function(x) { 
					if (!x.parent)
						d3.select(this).remove();
				})
		}
	},

	flatCols : function() {
		var r = [];
		function flatImpl(c) {
			c.forEach(function(cx) {
				if (cx.hierarchical && !cx.compressed) {
					flatImpl(cx.hierarchical);
				} else {
					r.push(cx);
				}
			})
		}
		flatImpl(this.cols)
		return r;
	},

	sortBy : function(col) {
		this.$thead.selectAll("th").classed("sortBy",false);
		col.findTh().classed("sortBy",true);

		this.data.sort(function(a,b) { return col.sortBy(a,b) });
		this.update();
	},

	update : function() {
		//create content lines
		var d = this.data;
		var cols = this.cols
		d = d.filter(function(row) {
			for (var i = cols.length - 1; i >= 0; i--) {
				if (!cols[i].filterBy(row))
					return false;
			}
			return true;
		});
		d = d.slice(0,100);
		var $row = this.$tbody.selectAll("tr").data(d);

		var flatcols = this.flatCols();
		var that = this;
		function updateLine(row, i) {
			var $row = d3.select(this);
			var $line = $row.selectAll("td").data(flatcols)
				.each(function(c) {
					c.update(d3.select(this),row, i)
				});
			$line.exit()
				.remove();
			$line.enter()
				.append("td")
				.each(function(c) {
					c.load(d3.select(this),row, i);
				});
		}
		
		$row.each(updateLine);
		$row.exit()
			.remove();
		$row.enter()
			.append("tr").each(updateLine);
		$row.order();
	}
});

function LineUp(tableId, data, columns, options) {
	
	options = $.extend({}, options, {})

	var colTypes = $.extend({},options.colTypes, {
		"number" : LineUpNumber,
		"string" : LineUpString,
		"max" : LineUpMax,
		"stacked" : LineUpStacked,
		"rank" : LineUpRank,
	});


	function toColumn(desc) {
		return new colTypes[desc.type](desc, toColumn);
	}
	var cols = columns.map(toColumn);
	options.toColumn = toColumn;

	return new LineUpTable(tableId, data, cols, options)
	//function onDragged(e) {
	//	//var $th =d3.select(e.currentTarget);
	//	console.log($th.text());
	//}

	//$(tableId).colResizable({
	//	liveDrag: true, 
	//	draggingClass: "dragging", 
	//	headerOnly : true,
	//	onDrag: onDragged
	//});	
}