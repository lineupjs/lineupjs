/**
 * Created by Samuel Gratzl on 14.08.2015.
 */

///<reference path='../typings/tsd.d.ts' />
import d3 = require('d3');
import utils = require('./utils');
import model = require('./model');

'use strict';
function addLine($svg, x1, y1, x2, y2, clazz) {
  return $svg.append('line').attr({
    x1: x1, y1: y1, x2: x2, y2: y2, 'class': clazz
  });
}
function addText($svg, x, y, text, dy?, clazz?) {
  return $svg.append('text').attr({
    x: x, y: y, dy: dy, 'class': clazz
  }).text(text);
}
function addCircle($svg, x, shift, y, radius) {
  shift -= x;
  return $svg
    .append('circle')
    .attr({
      'class': 'handle',
      r: radius,
      cx: x,
      cy: y,
      transform: 'translate(' + shift + ',0)'
    });
}

function clamp(v:number, min:number, max:number) {
  return Math.max(Math.min(v, max), min);
}


export function open(scale:model.IMappingFunction, original:model.IMappingFunction, dataPromise:Promise<number[]>, options:any) {
  //work on a local copy
  scale = scale.clone();

  options = utils.merge({
    width: 320,
    height: 200,
    padding_hor: 5,
    padding_ver: 5,
    radius: 5,
    callback: (d)=>d,
    callbackThisArg: null,
    triggerCallback: 'change' //change, dragend
  }, options);

  var editor = function ($root: d3.Selection<any>) {
    $root = $root.append('div').classed('lugui-me', true);
    (<HTMLElement>$root.node()).innerHTML = `<div>
    <span class="raw_min">0</span>
    <span class="center"><label><select>
        <option value="linear">Linear</option>
        <option value="linear_invert">Invert</option>
        <option value="log">Log</option>
        <option value="sqrt">Sqrt</option>
      </select></label>
      </span>
    <span class="raw_max">1</span>
  </div>
  <svg width="${options.width}" height="${options.height}">
    <g transform="translate(${options.padding_hor},${options.padding_ver})">
      <g class="samples">

      </g>
      <g class="mappings">

      </g>
    </g>
  </svg>
  <div>
    <input type="text" class="raw_min" value="0">
    <span class="center">Raw</span>
    <input type="text" class="raw_max" value="1">
  </div>
  <div class="script">
    <textarea>

    </textarea>
    <button>Apply</button>
  </div>`;

    const width = options.width - options.padding_hor*2;
    const height = options.height - options.padding_ver*2;

    const raw2pixel = d3.scale.linear().domain([Math.min(scale.domain[0], original.domain[0]), Math.min(scale.domain[1], original.domain[1])])
      .range([0,width]);
    const normal2pixel = d3.scale.linear().domain([0, 1])
      .range([0, width]);

    //lines that show mapping of individual data items
    var datalines = $root.select('g.samples').selectAll('line').data([]);
    dataPromise.then((data) => {
      //to unique values
      data = d3.set(data.map(String)).values().map(parseFloat);

      datalines = datalines.data(data);
      datalines.enter()
        .append('line')
          .attr({
            x1: (d) => normal2pixel(scale.apply(d)),
            y1: 0,
            x2: raw2pixel,
            y2: height
          }).style('visibility', function (d) {
            const domain = scale.domain;
            return (d < domain[0] || d > domain[domain.length - 1]) ? 'hidden' : null;
        });
    });

    function updateDataLines() {
      datalines.attr({
        x1: (d) => normal2pixel(scale.apply(d)),
        x2: raw2pixel
      }).style('visibility', function (d) {
        const domain = scale.domain;
        return (d < domain[0] || d > domain[domain.length-1]) ? 'hidden' : null;
      });
    }

    function createDrag(move) {
      return d3.behavior.drag()
        .on('dragstart', function () {
          d3.select(this)
            .classed('dragging', true)
            .attr('r', options.radius * 1.1);
        })
        .on('drag', move)
        .on('dragend', function () {
          d3.select(this)
            .classed('dragging', false)
            .attr('r', options.radius);
          triggerUpdate(true);
        });
    }

    function renderMappingLines() {
      if (!(scale instanceof model.ScaleMappingFunction)) {
        return;
      }

      let sscale = <model.ScaleMappingFunction>scale;
      let domain = sscale.domain;
      let range = sscale.range;

      let mapping_lines = domain.map((d,i) => ({ r: d, n: range[i]}));

      function updateScale() {
        //sort by raw value
        mapping_lines.sort((a,b) => a.r - b.r);
        sscale.domain = mapping_lines.map((d) => d.r);
        sscale.range = mapping_lines.map((d) => d.n);
        console.log(sscale.domain, sscale.range);
        updateDataLines();
      }

      const $mapping = $root.select('g.mappings').selectAll('g.mapping').data(mapping_lines);
      const $mapping_enter = $mapping.enter().append('g').classed('mapping', true);
      $mapping_enter.append('line').attr({
          y1: 0,
          y2: height
      }).call(createDrag(function(d) {
        const dx = (<any>d3.event).dx;
        const nx = clamp(normal2pixel(d.n)+dx, 0, width);
        const rx = clamp(raw2pixel(d.r)+dx, 0, width);
        d.n = normal2pixel.invert(nx);
        d.r = raw2pixel.invert(rx);
        d3.select(this).attr('x1', nx).attr('x2', rx);
        d3.select(this.parentElement).select('circle.normalized').attr('cx', nx);
        d3.select(this.parentElement).select('circle.raw').attr('cx', rx);

        updateScale();
      }));
      $mapping_enter.append('circle').classed('normalized',true).attr('r',options.radius).call(createDrag(function(d) {
        const x = clamp(d3.event.x, 0, width);
        d.n = normal2pixel.invert(x);
        d3.select(this).attr('cx', x);
        d3.select(this.parentElement).select('line').attr('x1', x);

        updateScale();
      }));
      $mapping_enter.append('circle').classed('raw', true).attr('r',options.radius).attr('cy',height).call(createDrag(function(d) {
        const x = clamp(d3.event.x, 0, width);
        d.r = raw2pixel.invert(x);
        d3.select(this).attr('cx', x);
        d3.select(this.parentElement).select('line').attr('x2', x);

        updateScale();
      }));

      $mapping.select('line').attr({
        x1: (d) => normal2pixel(d.n),
        x2: (d) => raw2pixel(d.r)
      });
      $mapping.select('circle.normalized').attr('cx', (d) => normal2pixel(d.n));
      $mapping.select('circle.raw').attr('cx', (d) => raw2pixel(d.r));
      $mapping.exit().remove();
    }

    function renderScript() {
       if (!(scale instanceof model.ScriptMappingFunction)) {
       $root.select('div.script').style('display', 'none');
        return;
      }
      $root.select('div.script').style('display', null);

      let sscale = <model.ScriptMappingFunction>scale;
      $root.select('textarea').text(sscale.code);
    }

    renderMappingLines();
    renderScript();

    function triggerUpdate(isDragEnd = false) {
      if (isDragEnd !== (options.triggerCallback === 'dragend')) {
        return;
      }
      options.callback.call(options.callbackThisArg, scale.clone());
    }
  /*

    //label for minimum raw2pixel value
    function editLimit(index:number) {
      return function () {
        var $elem = d3.select(this);
        var $input = $base.append('foreignObject').attr({
          x: (index === 0 ? lowerLimitX - 7 : upperLimitX - 45),
          y: raw2pixelAxisY + 15,
          width: 50,
          height: 20
        });

        function update() {
          var old = raw2pixel.domain();
          var new_ = old.slice();
          new_[index] = +this.value;
          if (old[index] === new_[index]) {
            return;
          }
          raw2pixel.domain(new_);
          $elem.text(this.value);

          scale.domain.forEach((p) => {

          })
          lowerRaw = raw2pixel(scale.domain()[0]);
          upperRaw = raw2pixel(scale.domain()[1]);
          $lowRawCircle.attr('transform', 'translate(' + (lowerRaw - lowerLimitX) + ',0)');
          $upperRawCircle.attr('transform', 'translate(' + (upperRaw - upperLimitX) + ',0)');
          mapperLineLowerBounds.attr('x2', lowerRaw);
          mapperLineUpperBounds.attr('x2', upperRaw);

          datalines.attr('x2', raw2pixel);

          updateRaw();
          updateScale(true);

          $input.remove();
        }

        $input.append('xhtml:input')
          .attr('value', raw2pixel.domain()[index])
          .style('width', '5em')
          .on('change', update)
          .on('blur', update);
      };
    }*/
  };
  return editor;
}
