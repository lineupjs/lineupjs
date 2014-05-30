/**
 * lineup mapping editor
 */
var LineUp;

(function (LineUp, d3, $) {
  'use strict';
  LineUp.mappingEditor = function (scale, data, data_accessor, callback) {
    var editor = function ($root) {
      var $svg = $root.append("svg").attr({
        "class": "lugui-me",
        width: 400,
        height: 400
      });
      $svg.append("rect").attr({
        width: 400,
        height: 400,
        fill: "red"
      });
    };
    return editor;
  }
}(LineUp || (LineUp = {}), d3, $));
 
