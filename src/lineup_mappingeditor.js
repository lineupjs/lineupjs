/**
 * lineup mapping editor
 */
/* global d3 */
var LineUp;

(function (LineUp, d3) {
  'use strict';
  function addLine($svg, x1, y1, x2, y2, clazz) {
    return $svg.append("line").attr({
      x1 : x1, y1 : y1, x2 : x2, y2: y2, 'class' : clazz
    });
  }
  function addText($svg, x, y, text, dy, clazz) {
    dy = dy || null;
    clazz = clazz || null;
    return $svg.append("text").attr({
      x : x, y : y, dy : dy, 'class' : clazz
    }).text(text);
  }
  function addCircle($svg, x, shift, y, radius) {
    shift -= x;
    return $svg
      .append("circle")
      .attr({
        'class' : 'handle',
        r : radius,
        cx: x,
        cy : y,
        transform : 'translate('+shift+',0)'
      });
  }
  LineUp.mappingEditor = function (scale, dataDomain, data, data_accessor, callback) {
    var editor = function ($root) {

      var width = 400,
        height = 400,
        //radius for mapper circles
        radius = 10;

      var $svg = $root.append("svg").attr({
        "class": "lugui-me",
        width: width,
        height: height
      });
      //left limit for the axes
      var lowerLimitX = 50;
      //right limit for the axes
      var upperLimitX = 350;
      //location for the score axis
      var scoreAxisY = 50;
      //location for the raw2pixel value axis
      var raw2pixelAxisY = 350;
      //this is needed for filtering the shown datalines
      var raw2pixel = d3.scale.linear().domain(dataDomain).range([lowerLimitX, upperLimitX]);
      var normal2pixel = d3.scale.linear().domain([0,1]).range([lowerLimitX,upperLimitX]);

      //x coordinate for the score axis lower bound
      var lowerNormalized = normal2pixel(scale.range()[0]);
      //x coordinate for the score axis upper bound
      var upperNormalized = normal2pixel(scale.range()[1]);
      //x coordinate for the raw2pixel axis lower bound
      var lowerRaw = raw2pixel(scale.domain()[0]);
      //x coordinate for the raw2pixel axis upper bound
      var upperRaw = raw2pixel(scale.domain()[1]);

      scale = d3.scale.linear()
        .clamp(true)
        .domain(scale.domain())
        .range([lowerNormalized, upperNormalized]);
      var $base = $svg.append('g');
      //upper axis for scored values
      addLine($base, lowerLimitX,scoreAxisY, upperLimitX, scoreAxisY, 'axis');
      //label for minimum scored value
      addText($base, lowerLimitX, scoreAxisY - 25, 0, ".75em");
      //label for maximum scored value
      addText($base, upperLimitX, scoreAxisY - 25, 1, ".75em");
      addText($base, width/2, scoreAxisY -25, "Score", ".75em",'centered');

      //lower axis for raw2pixel values
      addLine($base, lowerLimitX,raw2pixelAxisY, upperLimitX, raw2pixelAxisY, 'axis');
      //label for minimum raw2pixel value
      addText($base, lowerLimitX, raw2pixelAxisY + 20, dataDomain[0], ".75em");
      //label for maximum raw2pixel value
      addText($base, upperLimitX, raw2pixelAxisY + 20, dataDomain[1], ".75em");
      addText($base, width/2, raw2pixelAxisY + 20, "Raw", ".75em",'centered');
      
      //lines that show mapping of individual data items
      var datalines = $svg.append('g').classed('data',true).selectAll("line").data(data);
      datalines.enter().append("line")
        .attr({
          x1: function (d) { return scale(data_accessor(d)); },
          y1: scoreAxisY,
          x2: function (d) { return raw2pixel(data_accessor(d)); },
          y2: raw2pixelAxisY
        }).style('visibility', function(d) {
          var a;
          if (lowerRaw < upperRaw) {
            a = (raw2pixel(data_accessor(d)) < lowerRaw || raw2pixel(data_accessor(d)) > upperRaw);
          } else {
            a = (raw2pixel(data_accessor(d)) > lowerRaw || raw2pixel(data_accessor(d)) < upperRaw);
          }
          return a ? 'hidden' : null;
        });
      //line that defines lower bounds for the scale
      var mapperLineLowerBounds = addLine($svg, lowerNormalized, scoreAxisY, lowerRaw, raw2pixelAxisY, 'bound');
      //line that defines upper bounds for the scale
      var mapperLineUpperBounds = addLine($svg, upperNormalized, scoreAxisY, upperRaw, raw2pixelAxisY, 'bound');
      //label for lower bound of normalized values
      var lowerBoundNormalizedLabel = addText($svg, lowerLimitX + 5, scoreAxisY - 15, d3.round(normal2pixel.invert(lowerNormalized), 2), ".25em", 'drag').attr('transform','translate('+(lowerNormalized-lowerLimitX)+',0)');
      //label for lower bound of raw2pixel values
      var lowerBoundRawLabel = addText($svg, lowerLimitX + 5, raw2pixelAxisY - 15, d3.round(raw2pixel.invert(lowerRaw), 2), ".25em", 'drag').attr('transform','translate('+(lowerRaw-lowerLimitX)+',0)');
      //label for upper bound of normalized values
      var upperBoundNormalizedLabel = addText($svg, upperLimitX + 5, scoreAxisY - 15, d3.round(normal2pixel.invert(upperNormalized), 2), ".25em", 'drag').attr('transform','translate('+(upperNormalized-upperLimitX)+',0)');
      //label for upper bound of raw2pixel values
      var upperBoundRawLabel = addText($svg, upperLimitX + 5, raw2pixelAxisY - 15, d3.round(raw2pixel.invert(upperRaw), 2), ".25em", 'drag').attr('transform','translate('+(upperRaw-upperLimitX)+',0)');

      function createDrag(label, move) {
        return d3.behavior.drag()
          .on("dragstart", function () {
            d3.select(this)
              .classed("dragging", true)
              .attr("r", radius * 1.1);
            label.style("visibility", "visible");
          })
          .on("drag", move)
          .on("dragend", function () {
            d3.select(this)
              .classed("dragging", false)
              .attr("r", radius);
            label.style("visibility", null);
          })
          .origin(function () {
            var t = d3.transform(d3.select(this).attr("transform"));
            return {x: t.translate[0], y: t.translate[1]};
          });
      }

      function updateNormalized() {
        scale.range([lowerNormalized, upperNormalized]);
        datalines.attr("x1", function (d) {
          return scale(data_accessor(d));
        });
        updateScale();
      }

      function updateRaw() {
        var hiddenDatalines, shownDatalines;
        if (lowerRaw < upperRaw) {
          hiddenDatalines = datalines.filter(function (d) {
            return (raw2pixel(data_accessor(d)) < lowerRaw || raw2pixel(data_accessor(d)) > upperRaw);
          });
          shownDatalines = datalines.filter(function (d) {
            return !(raw2pixel(data_accessor(d)) < lowerRaw || raw2pixel(data_accessor(d)) > upperRaw);
          });
        }
        else {
          hiddenDatalines = datalines.filter(function (d) {
            return (raw2pixel(data_accessor(d)) > lowerRaw || raw2pixel(data_accessor(d)) < upperRaw);
          });
          shownDatalines = datalines.filter(function (d) {
            return !(raw2pixel(data_accessor(d)) > lowerRaw || raw2pixel(data_accessor(d)) < upperRaw);
          });
        }
        hiddenDatalines.style("visibility", "hidden");
        scale.domain([raw2pixel.invert(lowerRaw), raw2pixel.invert(upperRaw)]);
        shownDatalines
          .style("visibility", null)
          .attr("x1", function (d) {
            return scale(data_accessor(d));
          });
        updateScale();
      }

      //draggable circle that defines the lower bound of normalized values
      addCircle($svg, lowerLimitX, lowerNormalized, scoreAxisY, radius)
        .call(createDrag(lowerBoundNormalizedLabel, function () {
          if (d3.event.x >= 0 && d3.event.x <= (upperLimitX - lowerLimitX)) {
            mapperLineLowerBounds.attr("x1", lowerLimitX + d3.event.x);
            d3.select(this)
              .attr("transform", "translate(" + d3.event.x + ", 0)");
            lowerNormalized = d3.event.x + lowerLimitX;
            lowerBoundNormalizedLabel
              .text(d3.round(normal2pixel.invert(lowerNormalized), 2))
              .attr("transform", "translate(" + d3.event.x + ", 0)");
            updateNormalized();
          }
        }));
      //draggable circle that defines the upper bound of normalized values
      addCircle($svg, upperLimitX, upperNormalized, scoreAxisY, radius)
        .call(createDrag(upperBoundNormalizedLabel, function () {
          if (d3.event.x >= (-1 * (upperLimitX - lowerLimitX)) && d3.event.x <= 0) {
            mapperLineUpperBounds.attr("x1", upperLimitX + d3.event.x);
            d3.select(this)
              .attr("transform", "translate(" + d3.event.x + ", 0)");
            upperNormalized = d3.event.x + upperLimitX;
            upperBoundNormalizedLabel
              .text(d3.round(normal2pixel.invert(upperNormalized), 2))
              .attr("transform", "translate(" + d3.event.x + ", 0)");
            updateNormalized();
          }
        }));
      //draggable circle that defines the lower bound of raw2pixel values
      addCircle($svg, lowerLimitX, lowerRaw, raw2pixelAxisY, radius)
        .call(createDrag(lowerBoundRawLabel, function () {
          if (d3.event.x >= 0 && d3.event.x <= (upperLimitX - lowerLimitX)) {
            mapperLineLowerBounds.attr("x2", lowerLimitX + d3.event.x);
            d3.select(this)
              .attr("transform", "translate(" + d3.event.x + ", 0)");
            lowerRaw = d3.event.x + lowerLimitX;
            lowerBoundRawLabel
              .text(d3.round(raw2pixel.invert(lowerRaw), 2))
              .attr("transform", "translate(" + d3.event.x + ", 0)");
            updateRaw();
          }
        }));
      //draggable circle that defines the upper bound of raw2pixel values
      addCircle($svg, upperLimitX, upperRaw, raw2pixelAxisY, radius)
        .call(createDrag(upperBoundRawLabel, function () {
          if (d3.event.x >= (-1 * (upperLimitX - lowerLimitX)) && d3.event.x <= 0) {
            mapperLineUpperBounds.attr("x2", upperLimitX + d3.event.x);
            d3.select(this)
              .attr("transform", "translate(" + d3.event.x + ", 0)");
            upperRaw = d3.event.x + upperLimitX;
            upperBoundRawLabel
              .text(d3.round(raw2pixel.invert(upperRaw), 2))
              .attr("transform", "translate(" + d3.event.x + ", 0)");
            updateRaw();
          }
        }));

      function updateScale() {
        var newScale = d3.scale.linear()
          .domain([raw2pixel.invert(lowerRaw), raw2pixel.invert(upperRaw)])
          .range([normal2pixel.invert(lowerNormalized), normal2pixel.invert(upperNormalized)]);
        callback(newScale);
      }
    };
    return editor;
  };
}(LineUp || (LineUp = {}), d3));
 
