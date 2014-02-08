function LineUpColumn(desc) {
	this._desc = desc;
	this.column = desc.column;
	this.width = desc.width || 100;
	this.label= desc.label || desc.column;
	this.id = desc.id || this.column;
}
LineUpColumn.prototype = {
	load : function($cell, row) {
		this.update($cell, row)
	},
	update : function($cell, row) {
		$cell.text(this.get(row))	
	},
	loadTh : function($cell) {
		$cell.attr("id",this.id)
			.text(this.label)
	},
	get : function(row) {
		return row[this.column];
	},
	loadCol : function($col) {
		$col.attr("width",this.width)
	},
	sortBy : function(a,b) {
		var va = this.get(a);
		var vb = this.get(b);
		return d3.ascending(va,vb);
	},
	filterBy : function(row) {
		return true;
	}
};

function LineUpNumber(desc) {
	LineUpColumn.call(this,desc)

	this.scale = d3.scale.linear().domain(desc.domain).range([0,1]);
	this.filter = desc.filter || [0,100];
}
LineUpNumber.prototype = $.extend({},LineUpColumn.prototype,{
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
		return +this.get(row);
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

function LineUpComposite(desc, toColumn) {
	LineUpColumn.call(this,desc)
	this.children = desc.children.map(toColumn);
}
LineUpComposite.prototype = $.extend({},LineUpColumn.prototype, {
	
});

function LineUpMax(desc,toColumn) {
	LineUpComposite.call(this,desc,toColumn)
	this.filter = desc.filter || [0,1];
}
LineUpMax.prototype = $.extend({},LineUpComposite.prototype, LineUpNumber.prototype, {
	select : function(row) {
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
	this.filter = desc.filter || [0,1];
}
LineUpStacked.prototype = $.extend({},LineUpComposite.prototype, LineUpNumber.prototype, {
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
		var w = this.weights();
		var s = 0;
		for (var i = this.children.length - 1; i >= 0; i--) {
			s += w[i] * this.children[i].getS(row);
		};
		return s;
	},
	get : function(row) {
		return d3.round(this.getN(row),3);
	}
});

function LineUp(tableId, file, columns) {
	var $table = d3.select(tableId).classed("lineup",true);
	var $thead = $table.append("thead");
	var $tbody = $table.append("tbody");
	var data = [];

	var colTypes = {
		"number" : LineUpNumber,
		"string" : LineUpString,
		"max" : LineUpMax,
		"stacked" : LineUpStacked,
	};

	function toColumn(desc) {
		return new colTypes[desc.type](desc, toColumn);
	}
	this.cols = columns.map(toColumn);

	//create header line
	$table.selectAll("col").data(cols)
		.enter()
			.append("col")
				.each(function(col) { 
					col.loadCol(d3.select(this)); 
				})
	
	//create header line
	$thead.append("tr").selectAll("th").data(cols)
		.enter()
			.append("th")
				.each(function(x) { x.loadTh(d3.select(this)); })
				.on("click", function(col) {
					d3.selectAll("th").classed("sortBy",false)
					d3.select("th#"+col.column).classed("sortBy",true)
					sortBy(function(a,b) { return col.sortBy(a,b) }); 
				});
		
	function sortBy(cmp) {
		data.sort(cmp)
		update()
	}
	
	function updateLine(row) {
		var $line = d3.select(this).selectAll("td").data(cols)
			.each(function(c) {
				c.update(d3.select(this),row)
			});
		$line.exit()
			.remove();
		$line.enter()
			.append("td")
			.each(function(c) {
				c.load(d3.select(this),row);
				return this;
			});
	}

	function update() {
		//create content lines
		var d = data;
		d = d.filter(function(row) {
			for (var i = cols.length - 1; i >= 0; i--) {
				if (!cols[i].filterBy(row))
					return false;
			}
			return true;
		});
		d = d.slice(0,100);
		var $row = $tbody.selectAll("tr").data(d);
		$row.each(updateLine);
		$row.exit()
			.remove();
		$row.enter()
			.append("tr").each(updateLine);
		$row.order();
	}

	d3.tsv(file, function(_data) {
		data = _data;
		update();
	});
}