function LineUpColumn(desc) {
	this._desc = desc;
	this.column = desc.column;
	this.color = desc.color;
	this.width = desc.width || 100;
	this.label= desc.label || desc.column;
}
LineUpColumn.prototype = {
	load : function($cell, value) {
		this.update($cell, value)
	},
	update : function($cell, value) {
		$cell.text(value)	
	},
	loadTh : function($cell) {
		$cell.attr("id",this.column);
		$cell.text(this.label)
	},
	loadCol : function($col) {
		$col.attr("width",this.width)
	},
	sortBy : function(a,b) {
		var va = a[this.column];
		var vb = b[this.column];
		return d3.ascending(va,vb);
	}
};

function LineUpNumber(desc) {
	LineUpColumn.call(this,desc)

	this.scale = d3.scale.linear().domain(desc.domain).range([0,1]);
}
LineUpNumber.prototype = $.extend({},LineUpColumn.prototype,{
	load : function($cell, value) {
		$cell.append("div");
		this.update($cell, value);
	},
	update : function($cell, value) {
		var n = +value;
		$cell.select("div")
			.style("width",this.scale(n)*100+"%")
			.style("background-color",this.color)
			.text(value);
	},
	sortBy : function(a,b) {
		var va = +a[this.column];
		var vb = +b[this.column];
		return d3.descending(va,vb);
	}
});

function LineUpString(desc) {
	LineUpColumn.call(this,desc)
}
LineUpString.prototype = $.extend({},LineUpColumn.prototype, {

});


function LineUp(tableId, file, columns) {
	var $table = d3.select(tableId).classed("lineup",true);
	var $thead = $table.append("thead");
	var $tbody = $table.append("tbody");
	var data = [];

	var colTypes = {
		"number" : LineUpNumber,
		"string" : LineUpString,
	};

	var colors = d3.scale.category10();
	this.cols = columns.map(function(c,i) {
		c.color = colors(i);
		return new colTypes[c.type](c)
	});

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
	function columnRow(row) {
		return cols.map(function(c) { return { desc : c, value : row[c.column]}})
	}
	
	function updateLine(row) {
		var $line = d3.select(this).selectAll("td").data(columnRow(row))
			.each(function(c) {
				c.desc.update(d3.select(this),c.value)
			});
		$line.exit()
			.remove();
		$line.enter()
			.append("td")
			.each(function(c) {
				c.desc.load(d3.select(this),c.value);
				return this;
			});
	}

	function update() {
		//create content lines
		var $row = $tbody.selectAll("tr").data(data.slice(0,100));
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