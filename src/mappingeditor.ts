/**
 * Created by Samuel Gratzl on 14.08.2015.
 */

///<reference path='../typings/tsd.d.ts' />
import d3 = require('d3');
import utils = require('./utils');
import model = require('./model');


function clamp(v:number, min:number, max:number) {
  return Math.max(Math.min(v, max), min);
}

export class MappingEditor {
  private options = {
    width: 370,
    height: 200,
    padding_hor: 5,
    padding_ver: 5,
    radius: 5,
    callback: (d)=>d,
    callbackThisArg: null,
    triggerCallback: 'change' //change, dragend
  };

  private computeFilter: ()=>model.INumberFilter;

  constructor(private parent: HTMLElement, private scale_:model.IMappingFunction, private original:model.IMappingFunction, filter: model.INumberFilter, private dataPromise:Promise<number[]>, options:any = {}) {
    utils.merge(this.options, options);
    //work on a local copy
    this.scale_ = scale_.clone();

    this.build(d3.select(parent));
    //this.filter = { min: filter.min, max: filter.max }; //local copy
  }

  get scale() {
    return this.scale_;
  }

  get filter(): model.INumberFilter {
    return this.computeFilter();
  }

  private build($root: d3.Selection<any>) {
    const options = this.options,
      that = this;
    $root = $root.append('div').classed('lugui-me', true);
    (<HTMLElement>$root.node()).innerHTML = `<div>
    <span class="raw_min">0</span>
    <span class="center"><label><select>
        <option value="linear">Linear</option>
        <option value="linear_invert">Invert</option>
        <option value="linear_abs">Absolute</option>
        <option value="log">Log</option>
        <option value="pow1.1">Pow 1.1</option>
        <option value="pow2">Pow 2</option>
        <option value="pow3">Pow 3</option>
        <option value="sqrt">Sqrt</option>
        <option value="script">Custom Script</option>
      </select></label>
      </span>
    <span class="raw_max">1</span>
  </div>
  <svg width="${options.width}" height="${options.height}">
    <rect width="100%" height="10"></rect>
    <rect width="100%" height="10" y="${options.height-10}"></rect>
    <g transform="translate(${options.padding_hor},${options.padding_ver})">
      <g class="samples">

      </g>
      <g class="mappings">

      </g>
    </g>
  </svg>
  <div class="mapping_filter" style="width: ${options.width-options.padding_hor*2}px; margin-left: ${options.padding_hor}px;">
    <div class="mapping_mapping"></div>
    <div class="filter_left_filter"></div>
    <div class="filter_right_filter"></div>
    <div class="left_handle"></div>
    <div class="right_handle"></div>
  </div>
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

    const $mapping_area = $root.select('div.mapping_mapping');


    const raw2pixel = d3.scale.linear().domain([Math.min(this.scale.domain[0], this.original.domain[0]), Math.max(this.scale.domain[this.scale.domain.length - 1], this.original.domain[this.original.domain.length - 1])])
      .range([0,width]);
    const normal2pixel = d3.scale.linear().domain([0, 1])
      .range([0, width]);

    $root.select('input.raw_min')
      .property('value', raw2pixel.domain()[0])
      .on('blur', function() {
        var d = raw2pixel.domain();
        d[0] = parseFloat(this.value);
        raw2pixel.domain(d);
        var old = that.scale_.domain;
        old[0] = d[0];
        that.scale_.domain = old;
        updateRaw();
        triggerUpdate();
      });
    $root.select('input.raw_max')
      .property('value', raw2pixel.domain()[1])
      .on('blur', function() {
        var d = raw2pixel.domain();
        d[1] = parseFloat(this.value);
        raw2pixel.domain(d);
        var old = that.scale_.domain;
        old[old.length-1] = d[1];
        that.scale_.domain = old;
        updateRaw();
        triggerUpdate();
      });

    //lines that show mapping of individual data items
    var datalines = $root.select('g.samples').selectAll('line').data([]);
    this.dataPromise.then((data) => {
      //to unique values
      data = d3.set(data.map(String)).values().map(parseFloat);

      datalines = datalines.data(data);
      datalines.enter()
        .append('line')
          .attr({
            x1: (d) => normal2pixel(that.scale.apply(d)),
            y1: 0,
            x2: raw2pixel,
            y2: height
          }).style('visibility', function (d) {
            const domain = that.scale.domain;
            return (d < domain[0] || d > domain[domain.length - 1]) ? 'hidden' : null;
        });
    });

    function updateDataLines() {
      datalines.attr({
        x1: (d) => normal2pixel(that.scale.apply(d)),
        x2: raw2pixel
      }).style('visibility', function (d) {
        const domain = that.scale.domain;
        return (d < domain[0] || d > domain[domain.length-1]) ? 'hidden' : null;
      });

      const minmax = d3.extent(that.scale.domain);
      $mapping_area.style({
        left: raw2pixel(minmax[0])+'px',
        width: raw2pixel(minmax[1]-minmax[0])+'px'
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

    var mapping_lines = [];
    function renderMappingLines() {
      if (!(that.scale instanceof model.ScaleMappingFunction)) {
        return;
      }

      {
        let sscale = <model.ScaleMappingFunction>that.scale;
        let domain = sscale.domain;
        let range = sscale.range;

        mapping_lines = domain.map((d, i) => ({r: d, n: range[i]}));
      }

      function updateScale() {
        //sort by raw value
        mapping_lines.sort((a,b) => a.r - b.r);
        //update the scale
        let scale = <model.ScaleMappingFunction>that.scale;
        scale.domain = mapping_lines.map((d) => d.r);
        scale.range = mapping_lines.map((d) => d.n);

        //console.log(sscale.domain, sscale.range);
        updateDataLines();
      }

      function removePoint(i) {
        if (mapping_lines.length <= 2) {
          return; //can't remove have to have at least two
        }
        mapping_lines.splice(i,1);
        updateScale();
        renderMappingLines();
      }

      function addPoint(x) {
        x = clamp(x, 0, width);
        mapping_lines.push({
          n : normal2pixel.invert(x),
          r : raw2pixel.invert(x)
        });
        updateScale();
        renderMappingLines();
      }

      $root.selectAll('rect').on('click', () => {
        addPoint(d3.mouse($root.select('svg > g').node())[0]);
      });

      const $mapping = $root.select('g.mappings').selectAll('g.mapping').data(mapping_lines);
      const $mapping_enter = $mapping.enter().append('g').classed('mapping', true).on('contextmenu', (d,i) => {
        d3.event.preventDefault();
        d3.event.stopPropagation();
        removePoint(i);
      });
      $mapping_enter.append('line').attr({
          y1: 0,
          y2: height
      }).call(createDrag(function(d) {
        //drag the line shifts both point in parallel
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
        //drag normalized
        const x = clamp(d3.event.x, 0, width);
        d.n = normal2pixel.invert(x);
        d3.select(this).attr('cx', x);
        d3.select(this.parentElement).select('line').attr('x1', x);

        updateScale();
      }));
      $mapping_enter.append('circle').classed('raw', true).attr('r',options.radius).attr('cy',height).call(createDrag(function(d) {
        //drag raw
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
       if (!(that.scale instanceof model.ScriptMappingFunction)) {
       $root.select('div.script').style('display', 'none');
        return;
      }
      $root.select('div.script').style('display', null);

      let sscale = <model.ScriptMappingFunction>that.scale;
      const $text = $root.select('textarea').text(sscale.code);

      $root.select('div.script').select('button').on('click', () => {
        sscale.code = $text.property('value');
        updateDataLines();
        triggerUpdate();
      });
    }

    renderMappingLines();
    renderScript();

    function triggerUpdate(isDragEnd = false) {
      if (isDragEnd && (options.triggerCallback !== 'dragend')) {
        return;
      }
      options.callback.call(options.callbackThisArg, that.scale.clone(), that.filter);
    }

    $root.selectAll('div.left_handle, div.right_handle').call(createDrag(function (d) {
      //drag normalized
      const x = clamp(d3.event.x, 0, width-5);
      const $this = d3.select(this).style('left', x + 'px');
      const is_left = $this.classed('left_handle');
      if (is_left) {
        $root.select('div.filter_left_filter').style('width',x+'px');
      } else {
        $root.select('div.filter_right_filter').style('left',x+'px').style('width', (width-x)+'px');
      }
    }));
    $root.select('div.right_handle').style('left',(width-5)+'px');

    this.computeFilter = function() {
      const min_p = parseFloat($root.select('div.left_handle').style('left'));
      const min_f = raw2pixel.invert(min_p);

      const max_p = parseFloat($root.select('div.right_handle').style('left'))+5;
      const max_f = raw2pixel.invert(max_p);

      return {
        min: min_p <= 0 ? -Infinity : min_f,
        max: max_p >= width ? Infinity : max_f
      };
    };

    function updateRaw() {
      const d = raw2pixel.domain();
      $root.select('input.raw_min').property('value', d[0]);
      $root.select('input.raw_max').property('value', d[1]);

      updateDataLines();
      renderMappingLines();
    }

    updateRaw();

    $root.select('select').on('change', function() {
      const v = this.value;
      if (v === 'linear_invert') {
        that.scale_ = new model.ScaleMappingFunction(raw2pixel.domain(), 'linear', [1, 0]);
      } else if (v === 'linear_abs') {
        let d = raw2pixel.domain();
        that.scale_ = new model.ScaleMappingFunction([d[0], (d[1]-d[0])/2, d[1]], 'linear', [1, 0, 1]);
      } else if (v === 'script') {
        that.scale_ = new model.ScriptMappingFunction(raw2pixel.domain());
      } else {
        that.scale_ = new model.ScaleMappingFunction(raw2pixel.domain(), v);
      }
      updateDataLines();
      renderMappingLines();
      renderScript();
      triggerUpdate();
    }).property('selectedIndex', function() {
      var name = 'script';
      if (that.scale_ instanceof model.ScaleMappingFunction) {
        name = (<model.ScaleMappingFunction>that.scale).scaleType;
      }
      const types = ['linear', 'linear_invert', 'linear_abs', 'log', 'pow1.1', 'pow2', 'pow3', 'sqrt', 'script'];
      return types.indexOf(name);
    });
  }
}

export function create(parent: HTMLElement, scale:model.IMappingFunction, original:model.IMappingFunction, filter: model.INumberFilter, dataPromise:Promise<number[]>, options:any = {}) {
  return new MappingEditor(parent, scale, original, filter, dataPromise, options);
}
