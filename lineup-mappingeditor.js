/**
 * lineup mapping editor
 */
var LineUp;

(function (LineUp, d3, $) {
  'use strict';
  LineUp.mappingEditor = function (scale, data, data_accessor, callback) {
    var editor = function ($root) {
      
      var width = 400,
        height = 400,
        //radius for mapper circles
        radius = 10;
      
      //these names might need revision for greater clarity
      
      //left limit for the scales
      var initialLowerX = 50;
      //right limit for the scales
      var initialUpperX = 350;
      //location for the score scale
      var upperLineY = 50;
      //location for the raw value scale
      var lowerLineY = 350;
      //x coordinate for the score scale lower bound
      var lowerNormalized = initialLowerX;
      //x coordinate for the score scale upper bound
      var upperNormalized = initialUpperX;
      //x coordinate for the raw scale lower bound
      var lowerRaw = initialLowerX;
      //x coordinate for the raw scale upper bound
      var upperRaw = initialUpperX;
      //this might not be necessary
      var initialScale = scale;
      //for some reason the data lines were not drawn when these were used
      /* 
      var normalizedScale = d3.scale.linear()
                     .domain([d3.min(scale.range()), d3.max(scale.range())])
                     .range([lowerNormalized, upperNormalized]);
      var rawScale = d3.scale.linear()
                     .domain([d3.min(scale.domain()), d3.max(scale.domain())])
                     .range([lowerRaw, upperRaw]);
      */    
      var normalizedScale = d3.scale.linear()
                     .domain([0, d3.max(data, function(d) { return data_accessor(d); })])
                     .range([lowerNormalized, upperNormalized]);
      var rawScale = d3.scale.linear()
                     .domain([0, d3.max(data, function(d) { return data_accessor(d); })])
                     .range([lowerRaw, upperRaw]);
      var origRawScale = d3.scale.linear()
                     .domain([0, d3.max(data, function(d) { return data_accessor(d); })])
                     .range([lowerRaw, upperRaw]);
            
      var $svg = $root.append("svg").attr({
        "class": "lugui-me",
        width: 400,
        height: 400
      });
      
      $svg.append("rect").attr({
        width: 400,
        height: 400,
        fill: "white"
      });
      
      //upper scale for scored values
      $svg.append("svg:line")
        .attr("x1", 50)
        .attr("y1", 50)
        .attr("x2", 350)
        .attr("y2", 50)
        .attr("stroke", "gray");
      $svg.append("text")
        .attr("x", 50)
        .attr("y", 25)
        .attr("dy", ".75em")
        .text(d3.min(scale.range()));
      $svg.append("text")
        .attr("x", 350)
        .attr("y", 25)
        .attr("dy", ".75em")
        .text(d3.max(scale.range()));
      $svg.append("text")
        .attr("x", 165)
        .attr("y", 15)
        .attr("dy", ".75em")
        .text("Score");
        
      //lower scale for raw values
      $svg.append("svg:line")
        .attr("x1", 50)
        .attr("y1", 350)
        .attr("x2", 350)
        .attr("y2", 350)
        .attr("stroke", "gray");
      $svg.append("text")
        .attr("x", 50)
        .attr("y", 375)
        .attr("dy", ".75em")
        .text(d3.min(scale.domain()));
      $svg.append("text")
        .attr("x", 350)
        .attr("y", 375)
        .attr("dy", ".75em")
        .text(d3.max(scale.domain()));
      $svg.append("text")
        .attr("x", 165)
        .attr("y", 385)
        .attr("dy", ".75em")
        .text("Raw");
      
      //lines for individual data points
      var datalines = $svg.selectAll("dataline")
                         .data(data)
                         .enter()
                         .append("svg:line")
                         .attr("class", "dataline");
      var allDatalines = datalines;

      datalines
        .attr("x1", function (d) { return normalizedScale(data_accessor(d)); })
        .attr("y1", 50)
        .attr("x2", function (d) { return rawScale(data_accessor(d)); })
        .attr("y2", 350)
        .attr("stroke", "lightgray");
      
      var mapperLine1 = $svg
        .append("svg:line")
        .attr("x1", 50)
        .attr("y1", 50)
        .attr("x2", 50)
        .attr("y2", 350)
        .attr("stroke", "black");
        
      var mapperLine2 = $svg
        .append("svg:line")
        .attr("x1", 350)
        .attr("y1", 50)
        .attr("x2", 350)
        .attr("y2", 350)
        .attr("stroke", "black");
        
      var upperLabel1 = $svg.append("text")
              .attr("x", lowerNormalized + 5)
              .attr("y", upperLineY - 15)
              .attr("dy", ".25em")
              .text(d3.round(getNormalized_min(), 2))
              .style("display", "none");
              
      var dragUpper1 = d3.behavior.drag()
        .on("dragstart", function(){
          dragstartMapper(this);
          upperLabel1.style("display", "block");
        })
        .on("drag", function(){
          if(d3.event.x >= 0 && d3.event.x <= 300)
          {
            mapperLine1.attr("x1", initialLowerX + d3.event.x);
            d3.select(this)
              .attr("transform", "translate(" + d3.event.x  + "," + 0 + ")");
            datalines.attr("stroke", "darkgray");
            lowerNormalized = d3.event.x + initialLowerX;
            upperLabel1
              .text(d3.round(getNormalized_min(), 2))
              .attr("transform", "translate(" + d3.event.x  + "," + 0 + ")");
            normalizedScale.range([lowerNormalized, upperNormalized]);
            datalines.attr("x1", function (d) { return normalizedScale(data_accessor(d)); });
            updateScale();
          }
        })
        .on("dragend", function(){
          dragendMapper(this);
          upperLabel1.style("display", "none");
        })
        .origin(function() {
          var t = d3.transform(d3.select(this).attr("transform"));
          return {x: t.translate[0], y: t.translate[1]};
        });
        
      var lowerLabel1 = $svg.append("text")
              .attr("x", lowerRaw + 5)
              .attr("y", lowerLineY - 15)
              .attr("dy", ".25em")
              .text(d3.round(getRaw_min(), 2))
              .style("display", "none");
              
      var dragLower1 = d3.behavior.drag()
        .on("dragstart", function(){
          dragstartMapper(this);
          lowerLabel1.style("display", "block");
        })
        .on("drag", function(){
          if(d3.event.x >= 0 && d3.event.x <= 300)
          {
            mapperLine1.attr("x2", initialLowerX + d3.event.x);
            d3.select(this)
              .attr("transform", "translate(" + d3.event.x  + "," + 0 + ")");
              
            datalines.attr("stroke", "darkgray");
            lowerRaw = d3.event.x + initialLowerX;
            lowerLabel1
              .text(d3.round(getRaw_min(), 2))
              .attr("transform", "translate(" + d3.event.x  + "," + 0 + ")");
            rawScale.range([lowerRaw, upperRaw]);
            if(lowerRaw < upperRaw)
            {
              var filtered = allDatalines.select(function(d, i) { return (origRawScale(data_accessor(d)) < lowerRaw || origRawScale(data_accessor(d)) > upperRaw) ? this : null; });
              datalines = allDatalines.select(function(d, i) { return (origRawScale(data_accessor(d)) < lowerRaw || origRawScale(data_accessor(d)) > upperRaw) ? null : this; });
            }
            else
            {
              var filtered = allDatalines.select(function(d, i) { return (origRawScale(data_accessor(d)) > lowerRaw || origRawScale(data_accessor(d)) < upperRaw) ? this : null; });
              datalines = allDatalines.select(function(d, i) { return (origRawScale(data_accessor(d)) > lowerRaw || origRawScale(data_accessor(d)) < upperRaw) ? null : this; });
            }
            filtered.style("display", "none");
            //I tried to fix the mapping with this with no success
            //normalizedScale.domain([d3.min(datalines.data()), d3.max(datalines.data())]);
            datalines
              .style("display", "block")
              .attr("x1", function (d) { return normalizedScale(data_accessor(d)); });
            updateScale();
          }
        })
        .on("dragend", function(){
          dragendMapper(this);
          lowerLabel1.style("display", "none");
        })
        .origin(function() {
          var t = d3.transform(d3.select(this).attr("transform"));
          return {x: t.translate[0], y: t.translate[1]};
        });
      
      //the mapping line for lower bounds
      var mapperUpper1 = $svg
        .append("circle")
        .style("fill", "steelblue")
        .style("cursor", "pointer")
        .attr("r", radius)
        .attr("cx", initialLowerX)
        .attr("cy", upperLineY)
        .call(dragUpper1);
        
      //the mapping line for upper bounds
      var mapperLower1 = $svg
        .append("circle")
        .style("fill", "steelblue")
        .style("cursor", "pointer")
        .attr("r", radius)
        .attr("cx", initialLowerX)
        .attr("cy", lowerLineY)
        .call(dragLower1);
      
      var upperLabel2 = $svg.append("text")
              .attr("x", upperNormalized + 5)
              .attr("y", upperLineY - 15)
              .attr("dy", ".25em")
              .text(d3.round(getNormalized_max(), 2))
              .style("display", "none");
      
      var dragUpper2 = d3.behavior.drag()
        .on("dragstart", function(){
          dragstartMapper(this);
          upperLabel2.style("display", "block");
        })
        .on("drag", function(){
          if(d3.event.x >= -300 && d3.event.x <= 0)
          {
            mapperLine2.attr("x1", initialUpperX + d3.event.x);
            d3.select(this)
              .attr("transform", "translate(" + d3.event.x  + "," + 0 + ")");
            datalines.attr("stroke", "darkgray");
            upperNormalized = d3.event.x + initialUpperX;
            upperLabel2
              .text(d3.round(getNormalized_max(), 2))
              .attr("transform", "translate(" + d3.event.x  + "," + 0 + ")");
            normalizedScale.range([lowerNormalized, upperNormalized]);
            datalines.attr("x1", function (d) { return normalizedScale(data_accessor(d)); });
            updateScale();
          }
        })
        .on("dragend", function(){
          dragendMapper(this);
          upperLabel2.style("display", "none");
        })
        .origin(function() {
          var t = d3.transform(d3.select(this).attr("transform"));
          return {x: t.translate[0], y: t.translate[1]};
        });
        
      var lowerLabel2 = $svg.append("text")
              .attr("x", upperRaw + 5)
              .attr("y", lowerLineY - 15)
              .attr("dy", ".25em")
              .text(d3.round(getRaw_max(), 2))
              .style("display", "none");
              
      var dragLower2 = d3.behavior.drag()
        .on("dragstart", function(){
          dragstartMapper(this);
          lowerLabel2.style("display", "block");
        })
        .on("drag", function(){
          if(d3.event.x >= -300 && d3.event.x <= 0)
          {
            mapperLine2.attr("x2", initialUpperX + d3.event.x);
            d3.select(this)
              .attr("transform", "translate(" + d3.event.x  + "," + 0 + ")");
              
            datalines.attr("stroke", "darkgray");
            upperRaw = d3.event.x + initialUpperX;
            lowerLabel2
              .text(d3.round(getRaw_max(), 2))
              .attr("transform", "translate(" + d3.event.x  + "," + 0 + ")");
            rawScale.range([lowerRaw, upperRaw]);
            if(lowerRaw < upperRaw)
            {
              var filtered = allDatalines.select(function(d, i) { return (origRawScale(data_accessor(d)) < lowerRaw || origRawScale(data_accessor(d)) > upperRaw) ? this : null; });
              datalines = allDatalines.select(function(d, i) { return (origRawScale(data_accessor(d)) < lowerRaw || origRawScale(data_accessor(d)) > upperRaw) ? null : this; });
            }
            else
            {
              var filtered = allDatalines.select(function(d, i) { return (origRawScale(data_accessor(d)) > lowerRaw || origRawScale(data_accessor(d)) < upperRaw) ? this : null; });
              datalines = allDatalines.select(function(d, i) { return (origRawScale(data_accessor(d)) > lowerRaw || origRawScale(data_accessor(d)) < upperRaw) ? null : this; });
            }
            datalines
              .style("display", "block")
              .attr("x1", function (d) { return normalizedScale(data_accessor(d)); })
            filtered.style("display", "none");
            updateScale();
          }
        })
        .on("dragend", function(){
          dragendMapper(this);
          lowerLabel2.style("display", "none");
        })
        .origin(function() {
          var t = d3.transform(d3.select(this).attr("transform"));
          return {x: t.translate[0], y: t.translate[1]};
        });
        
      var mapperUpper2 = $svg
        .append("circle")
        .style("fill", "steelblue")
        .style("cursor", "pointer")
        .attr("r", radius)
        .attr("cx", initialUpperX)
        .attr("cy", upperLineY)
        .call(dragUpper2);
      
      var mapperLower2 = $svg
        .append("circle")
        .style("fill", "steelblue")
        .style("cursor", "pointer")
        .attr("r", radius)
        .attr("cx", initialUpperX)
        .attr("cy", lowerLineY)
        .call(dragLower2);
      
      function dragstartMapper(mapper) {
        d3.select(mapper)
          .style("fill", "black")
          .attr("r", radius*1.1);
      }
      
      function dragendMapper(mapper) {
        d3.select(mapper)
          .style("fill", "steelblue")
          .attr("r", radius);
          datalines.attr("stroke", "lightgray");
      }
      function updateScale() {
        var newScale = d3.scale.linear()
          .domain([getRaw_min(), getRaw_max()])
          .range([getNormalized_min(), getNormalized_max()]);
        callback(newScale);
      }
      
      function getRaw_min() {
        return (lowerRaw-initialLowerX) / (initialUpperX-initialLowerX) * d3.max(initialScale.domain());
      }
      function getRaw_max() {
        return (upperRaw-initialLowerX) / (initialUpperX-initialLowerX) * d3.max(initialScale.domain());
      }
      function getNormalized_min() {
        return (lowerNormalized-initialLowerX) / (initialUpperX-initialLowerX) * d3.max(initialScale.range());
      }
      function getNormalized_max() {
        return (upperNormalized-initialLowerX) / (initialUpperX-initialLowerX) * d3.max(initialScale.range());
      }
      
      function filterData() {
        var result = {};
        for (var index in data) {
          if (origRawScale(data_accessor(d)) > lowerRaw && origRawScale(data_accessor(d)) < upperRaw) {
            result[index] = d;
          }
        }
        return result;
      }
    };
    return editor;
  }
}(LineUp || (LineUp = {}), d3, $));
 
