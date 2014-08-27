/**
 * lineup mapping editor
 */
var LineUp;

(function (LineUp, d3, $) {
  'use strict';
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

      $svg.append("rect").attr({
        width: "100%",
        height: "100%",
        fill: "white"
      });

      
      //left limit for the axes
      var lowerLimitX = 50;
      //right limit for the axes
      var upperLimitX = 350;
      //location for the score axis
      var scoreAxisY = 50;
      //location for the raw value axis
      var rawAxisY = 350;
      //x coordinate for the score axis lower bound
      var lowerNormalized = lowerLimitX;
      //x coordinate for the score axis upper bound
      var upperNormalized = upperLimitX;
      //x coordinate for the raw axis lower bound
      var lowerRaw = lowerLimitX;
      //x coordinate for the raw axis upper bound
      var upperRaw = upperLimitX;

      var normalizedAxisScale = d3.scale.linear()
        .clamp(true)
          .domain(dataDomain)
        .range([lowerNormalized, upperNormalized]);
      var rawAxisScale = d3.scale.linear()
        .clamp(true)
        .domain(dataDomain)
        .range([lowerRaw, upperRaw]);
      //this is needed for filtering the shown datalines
      var originalRawAxisScale = d3.scale.linear()
        .domain(dataDomain)
        .range([lowerRaw, upperRaw]);
					 
      
      //upper axis for scored values
      $svg.append("svg:line")
        .attr("x1", lowerLimitX)
        .attr("y1", scoreAxisY)
        .attr("x2", upperLimitX)
        .attr("y2", scoreAxisY)
        .attr("stroke", "gray");
      //label for minimum scored value
      $svg.append("text")
        .attr("x", lowerLimitX)
        .attr("y", scoreAxisY - 25)
        .attr("dy", ".75em")
        .text(0);
      //label for maximum scored value
      $svg.append("text")
        .attr("x", upperLimitX)
        .attr("y", scoreAxisY - 25)
        .attr("dy", ".75em")
        .text(1);
      $svg.append("text")
        .attr("x", 175)
        .attr("y", 25)
        .text("Score");
        
      //lower axis for raw values
      $svg.append("svg:line")
        .attr("x1", lowerLimitX)
        .attr("y1", rawAxisY)
        .attr("x2", upperLimitX)
        .attr("y2", rawAxisY)
        .attr("stroke", "gray");
      //label for minimum raw value
      $svg.append("text")
        .attr("x", lowerLimitX)
        .attr("y", rawAxisY + 20)
        .attr("dy", ".75em")
        .text(d3.min(dataDomain));
      //label for maximum raw value
      $svg.append("text")
        .attr("x", upperLimitX)
        .attr("y", rawAxisY + 20)
        .attr("dy", ".75em")
        .text(d3.max(dataDomain));
      $svg.append("text")
        .attr("x", 180)
        .attr("y", 385)
        .text("Raw");
      
      //lines that show mapping of individual data items
      var datalines = $svg.selectAll("dataline")
                        .data(data)
                        .enter()
                        .append("svg:line")
                        .attr("x1", function (d) { return normalizedAxisScale(data_accessor(d)); })
                        .attr("y1", scoreAxisY)
                        .attr("x2", function (d) { return rawAxisScale(data_accessor(d)); })
                        .attr("y2", rawAxisY)
                        .attr("stroke", "gray");
      
      //line that defines lower bounds for the scale
      var mapperLineLowerBounds = $svg
        .append("svg:line")
        .attr("x1", lowerLimitX)
        .attr("y1", scoreAxisY)
        .attr("x2", lowerLimitX)
        .attr("y2", rawAxisY)
        .attr("stroke", "black")
        .attr("stroke-width", 2);
        
      //line that defines upper bounds for the scale
      var mapperLineUpperBounds = $svg
        .append("svg:line")
        .attr("x1", upperLimitX)
        .attr("y1", scoreAxisY)
        .attr("x2", upperLimitX)
        .attr("y2", rawAxisY)
        .attr("stroke", "black")
        .attr("stroke-width", 2);
      
      //label for lower bound of normalized values
      var lowerBoundNormalizedLabel = $svg.append("text")
              .attr("x", lowerNormalized + 5)
              .attr("y", scoreAxisY - 15)
              .attr("dy", ".25em")
              .text(d3.round(getNormalized_min(), 2))
              .style("display", "none");
      
      //label for lower bound of raw values
      var lowerBoundRawLabel = $svg.append("text")
              .attr("x", lowerRaw + 5)
              .attr("y", rawAxisY - 15)
              .attr("dy", ".25em")
              .text(d3.round(getRaw_min(), 2))
              .style("display", "none");
      
      //draggable circle that defines the lower bound of normalized values
      var mapperCircleNormalizedLower = $svg
        .append("circle")
        .style("fill", "steelblue")
        .style("cursor", "pointer")
        .attr("r", radius)
        .attr("cx", lowerLimitX)
        .attr("cy", scoreAxisY)
        .call(d3.behavior.drag()
            .on("dragstart", function(){
              dragstartModifyMapperCircle(this);
              lowerBoundNormalizedLabel.style("display", "block");
            })
            .on("drag", function(){
              if(d3.event.x >= 0 && d3.event.x <= (upperLimitX - lowerLimitX))
              {
                mapperLineLowerBounds.attr("x1", lowerLimitX + d3.event.x);
                d3.select(this)
                  .attr("transform", "translate(" + d3.event.x  + ", 0)");
                lowerNormalized = d3.event.x + lowerLimitX;
                lowerBoundNormalizedLabel
                  .text(d3.round(getNormalized_min(), 2))
                  .attr("transform", "translate(" + d3.event.x  + ", 0)");
                normalizedAxisScale.range([lowerNormalized, upperNormalized]);
                datalines.attr("x1", function (d) { return normalizedAxisScale(data_accessor(d)); });
                updateScale();
              }
            })
            .on("dragend", function(){
              dragendModifyMapperCircle(this);
              lowerBoundNormalizedLabel.style("display", "none");
            })
            .origin(function() {
              var t = d3.transform(d3.select(this).attr("transform"));
              return {x: t.translate[0], y: t.translate[1]};
            }));
      
      //draggable circle that defines the lower bound of raw values
      var mapperCircleRawLower = $svg
        .append("circle")
        .style("fill", "steelblue")
        .style("cursor", "pointer")
        .attr("r", radius)
        .attr("cx", lowerLimitX)
        .attr("cy", rawAxisY)
        .call(d3.behavior.drag()
            .on("dragstart", function(){
              dragstartModifyMapperCircle(this);
              lowerBoundRawLabel.style("display", "block");
            })
            .on("drag", function(){
              if(d3.event.x >= 0 && d3.event.x <= (upperLimitX - lowerLimitX) )
              {
                mapperLineLowerBounds.attr("x2", lowerLimitX + d3.event.x);
                d3.select(this)
                  .attr("transform", "translate(" + d3.event.x  + ", 0)");
                lowerRaw = d3.event.x + lowerLimitX;
                lowerBoundRawLabel
                  .text(d3.round(getRaw_min(), 2))
                  .attr("transform", "translate(" + d3.event.x  + ", 0)");
                rawAxisScale.range([lowerRaw, upperRaw]);
                if(lowerRaw < upperRaw)
                {
                  var hiddenDatalines = datalines.select(function(d, i) { return (originalRawAxisScale(data_accessor(d)) < lowerRaw || originalRawAxisScale(data_accessor(d)) > upperRaw) ? this : null; });
                  var shownDatalines = datalines.select(function(d, i) { return (originalRawAxisScale(data_accessor(d)) < lowerRaw || originalRawAxisScale(data_accessor(d)) > upperRaw) ? null : this; });
                }
                else
                {
                  var hiddenDatalines = datalines.select(function(d, i) { return (originalRawAxisScale(data_accessor(d)) > lowerRaw || originalRawAxisScale(data_accessor(d)) < upperRaw) ? this : null; });
                  var shownDatalines = datalines.select(function(d, i) { return (originalRawAxisScale(data_accessor(d)) > lowerRaw || originalRawAxisScale(data_accessor(d)) < upperRaw) ? null : this; });
                }
                hiddenDatalines.style("display", "none");
                normalizedAxisScale.domain([getRaw_min(), getRaw_max()]);
                shownDatalines
                  .style("display", "block")
                  .attr("x1", function (d) { return normalizedAxisScale(data_accessor(d)); });
                updateScale();
              }
            })
            .on("dragend", function(){
              dragendModifyMapperCircle(this);
              lowerBoundRawLabel.style("display", "none");
            })
            .origin(function() {
              var t = d3.transform(d3.select(this).attr("transform"));
              return {x: t.translate[0], y: t.translate[1]};
            }));
      
      //label for upper bound of normalized values
      var upperBoundNormalizedLabel = $svg.append("text")
              .attr("x", upperNormalized + 5)
              .attr("y", scoreAxisY - 15)
              .attr("dy", ".25em")
              .text(d3.round(getNormalized_max(), 2))
              .style("display", "none");
      
      //label for upper bound of raw values
      var upperBoundRawLabel = $svg.append("text")
              .attr("x", upperRaw + 5)
              .attr("y", rawAxisY - 15)
              .attr("dy", ".25em")
              .text(d3.round(getRaw_max(), 2))
              .style("display", "none");
      
      //draggable circle that defines the upper bound of normalized values
      var mapperCircleNormalizedUpper = $svg
        .append("circle")
        .style("fill", "steelblue")
        .style("cursor", "pointer")
        .attr("r", radius)
        .attr("cx", upperLimitX)
        .attr("cy", scoreAxisY)
        .call(d3.behavior.drag()
            .on("dragstart", function(){
              dragstartModifyMapperCircle(this);
              upperBoundNormalizedLabel.style("display", "block");
            })
            .on("drag", function(){
              if(d3.event.x >= (-1 * (upperLimitX - lowerLimitX)) && d3.event.x <= 0)
              {
                mapperLineUpperBounds.attr("x1", upperLimitX + d3.event.x);
                d3.select(this)
                  .attr("transform", "translate(" + d3.event.x  + ", 0)");
                upperNormalized = d3.event.x + upperLimitX;
                upperBoundNormalizedLabel
                  .text(d3.round(getNormalized_max(), 2))
                  .attr("transform", "translate(" + d3.event.x  + ", 0)");
                normalizedAxisScale.range([lowerNormalized, upperNormalized]);
                datalines.attr("x1", function (d) { return normalizedAxisScale(data_accessor(d)); });
                updateScale();
              }
            })
            .on("dragend", function(){
              dragendModifyMapperCircle(this);
              upperBoundNormalizedLabel.style("display", "none");
            })
            .origin(function() {
              var t = d3.transform(d3.select(this).attr("transform"));
              return {x: t.translate[0], y: t.translate[1]};
            }));
      
      //draggable circle that defines the upper bound of raw values
      var mapperCircleRawUpper = $svg
        .append("circle")
        .style("fill", "steelblue")
        .style("cursor", "pointer")
        .attr("r", radius)
        .attr("cx", upperLimitX)
        .attr("cy", rawAxisY)
        .call(d3.behavior.drag()
            .on("dragstart", function(){
              dragstartModifyMapperCircle(this);
              upperBoundRawLabel.style("display", "block");
            })
            .on("drag", function(){
              if(d3.event.x >= (-1 * (upperLimitX - lowerLimitX)) && d3.event.x <= 0)
              {
                mapperLineUpperBounds.attr("x2", upperLimitX + d3.event.x);
                d3.select(this)
                  .attr("transform", "translate(" + d3.event.x  + ", 0)");
                upperRaw = d3.event.x + upperLimitX;
                upperBoundRawLabel
                  .text(d3.round(getRaw_max(), 2))
                  .attr("transform", "translate(" + d3.event.x  + ", 0)");
                rawAxisScale.range([lowerRaw, upperRaw]);
                if(lowerRaw < upperRaw)
                {
                  var hiddenDatalines = datalines.select(function(d, i) { return (originalRawAxisScale(data_accessor(d)) < lowerRaw || originalRawAxisScale(data_accessor(d)) > upperRaw) ? this : null; });
                  var shownDatalines = datalines.select(function(d, i) { return (originalRawAxisScale(data_accessor(d)) < lowerRaw || originalRawAxisScale(data_accessor(d)) > upperRaw) ? null : this; });
                }
                else
                {
                  var hiddenDatalines = datalines.select(function(d, i) { return (originalRawAxisScale(data_accessor(d)) > lowerRaw || originalRawAxisScale(data_accessor(d)) < upperRaw) ? this : null; });
                  var shownDatalines = datalines.select(function(d, i) { return (originalRawAxisScale(data_accessor(d)) > lowerRaw || originalRawAxisScale(data_accessor(d)) < upperRaw) ? null : this; });
                }
                hiddenDatalines.style("display", "none");
                normalizedAxisScale.domain([getRaw_min(), getRaw_max()]);
                shownDatalines
                  .style("display", "block")
                  .attr("x1", function (d) { return normalizedAxisScale(data_accessor(d)); })
                updateScale();
              }
            })
            .on("dragend", function(){
              dragendModifyMapperCircle(this);
              upperBoundRawLabel.style("display", "none");
            })
            .origin(function() {
              var t = d3.transform(d3.select(this).attr("transform"));
              return {x: t.translate[0], y: t.translate[1]};
            }));
      
      function dragstartModifyMapperCircle(mapper) {
        d3.select(mapper)
          .style("fill", "black")
          .attr("r", radius*1.1);
      }
      
      function dragendModifyMapperCircle(mapper) {
        d3.select(mapper)
          .style("fill", "steelblue")
          .attr("r", radius);
      }
      
      function updateScale() {
        var newScale = d3.scale.linear()
          .domain([getRaw_min(), getRaw_max()])
          .range([getNormalized_min(), getNormalized_max()]);
        callback(newScale);
      }
      
      function getRaw_min() {
        return (lowerRaw-lowerLimitX) / (upperLimitX-lowerLimitX) * d3.max(dataDomain);
      }
      function getRaw_max() {
        return (upperRaw-lowerLimitX) / (upperLimitX-lowerLimitX) * d3.max(dataDomain);
      }
      function getNormalized_min() {
        return (lowerNormalized-lowerLimitX) / (upperLimitX-lowerLimitX) * d3.max(scale.range());
      }
      function getNormalized_max() {
        return (upperNormalized-lowerLimitX) / (upperLimitX-lowerLimitX) * d3.max(scale.range());
      }
      
    };
    return editor;
  }
}(LineUp || (LineUp = {}), d3, $));
 
