/**
 * Alexander Lex - alex@seas.harvard.edu Inspired by
 * http://bl.ocks.org/mbostock/3885705
 */

var data = [ 15, 23, 16, 14, 32, 30 ];
var data2 = [ 18, 25, 17, 12, 85, 22 ];
var schoolName = "schoolName";
var academic = "academic";
var data;

function dataload(dataTmp) {

	data = dataTmp;

	// data.forEach(function(d) {
	// d.academic = +d.academic;
	// });
	plot();
}

function plot() {

	var barHeight = 15;
	var barSpacing = 3;
	var textWidth = 200;

	var paddingTop = 30;
	var paddingSide = 20;

	var truncateAfter = 25;

	var w = 700;
	var h = data.length * (barHeight + barSpacing) + 2 * paddingTop;

	// var yScale = d3.scale.ordinal().domain(d3.range(data.length))
	// .rangeRoundBands([ 0, h ], 0.3);

	var yScale = d3.scale.ordinal().rangeRoundBands([ paddingTop, h ], .1);
	var xScale = d3.scale.linear().domain([ 0, d3.max(data, function(d) {
		return d.academic;
	}) ]).range([ 0, w - textWidth - paddingSide ]);

	yScale.domain(data.map(function(d) {
		return d.schoolname;
	}));

	var xAxis = d3.svg.axis().scale(xScale).orient("top");

	var svg = d3.select("body").append("svg").attr("width", w)
			.attr("height", h);

	// background color
	svg.append("rect").attr({
		id : "base",
		width : w,
		height : h,
		fill : "#eeeeee"
	});

	svg.append("g").attr("class", "axis").attr("transform",
			"translate(" + textWidth + ", " + (paddingTop - 5) + ")").attr(
			"class", "x axis").call(xAxis);

	var rectangles = svg.selectAll(".bar").data(data).enter().append("rect")
			.attr({
				class : "bar",
				width : function(d) {
					console.log(d.academic);
					return xScale(d.academic);
				},
				height : yScale.rangeBand,
				y : function(d) {
					return yScale(d.schoolname);
				},
				x : textWidth
			});

	svg.selectAll(".barLabel").data(data).enter().append("text").text(
			function(d) {
				return d.schoolname.substring(0, truncateAfter);
			}).attr({
		class : "barLabel",
		y : function(d) {
			return yScale(d.schoolname) + 15;
		},
		x : paddingSide,
		height : yScale.rangeBand,
		'text-anchor' : 'left'
	});

	d3.select("#update-list").on(
			"click",
			function() {

				data.sort(function(a, b) {
					return b.academic - a.academic;
				});

				console.log(data, function(d) {
					d.academic
				});

				yScale.domain(data.map(function(d) {
					return d.schoolname;
				}));

				svg.selectAll(".barLabel").transition().duration(1000).attr(
						"y", function(d) {
							return yScale(d.schoolname) + 15;
						});

				svg.selectAll(".bar").transition().duration(1000).attr("y",
						function(d) {
							return yScale(d.schoolname);
						});

			});

}

d3.tsv("wur2013.txt", dataload);
