/**
 * Created by Samuel Gratzl on 14.08.2015.
 */

import {select, scale, behavior, Selection, event as d3event, mouse} from 'd3';
import {merge} from './utils';
import {INumberFilter, IMappingFunction, ScaleMappingFunction, ScriptMappingFunction} from './model/NumberColumn';


function clamp(v: number, min: number, max: number) {
  return Math.max(Math.min(v, max), min);
}

function unique(data: number[]) {
  const s = new Set<number>();
  data.forEach((d) => s.add(d));
  const r = [];
  s.forEach((d) => r.push(d));
  return r;
}

export interface IMappingEditorOptions {
  idPrefix: string;
  width?: number;
  height?: number;
  padding_hor?: number;
  padding_ver?: number;
  filter_height?: number;
  radius?: number;
  callback?(newscale: IMappingFunction, filter: {min: number, max: number }): void;
  callbackThisArg?: any;
  triggerCallback?: string;
}

export default class MappingEditor {
  private options : IMappingEditorOptions = {
    idPrefix: '',
    width: 370,
    height: 225,
    padding_hor: 7,
    padding_ver: 7,
    filter_height: 20,
    radius: 5,
    callback: ()=>undefined,
    callbackThisArg: null,
    triggerCallback: 'change' //change, dragend
  };

  private computeFilter: ()=>INumberFilter;

  constructor(private parent: HTMLElement, private scale_: IMappingFunction, private original: IMappingFunction, private old_filter: INumberFilter, private dataPromise: Promise<number[]>, options: IMappingEditorOptions) {
    merge(this.options, options);
    //work on a local copy
    this.scale_ = scale_.clone();

    this.build(select(parent));
  }

  get scale() {
    return this.scale_;
  }

  get filter(): INumberFilter {
    return this.computeFilter();
  }

  private build($root: Selection<any>) {
    const options = this.options,
      that = this;
    $root = $root.append('div').classed('lugui-me', true);


    const width = options.width - options.padding_hor * 2;
    const height = options.height - options.padding_ver * 2 - options.filter_height;

    (<HTMLElement>$root.node()).innerHTML = `<form onsubmit="return false">
      <div style="text-align: center"><label for="me${options.idPrefix}mapping_type">Mapping Type: <select id="me${options.idPrefix}mapping_type">
        <option value="linear">Linear</option>
        <option value="linear_invert">Invert</option>
        <option value="linear_abs">Absolute</option>
        <option value="log">Log</option>
        <option value="pow1.1">Pow 1.1</option>
        <option value="pow2">Pow 2</option>
        <option value="pow3">Pow 3</option>
        <option value="sqrt">Sqrt</option>
        <option value="script">Custom Script</option>
      </select>
      </label></div>
      <div class="mapping_area">
        <div>
          <span>0</span>
          <input type="text" class="raw_min" id="me${options.idPrefix}raw_min" value="0"><label for="me${options.idPrefix}raw_min">Min</label>
        </div>
        <svg width="${options.width}" height="${options.height}">
          <line y1="${options.padding_ver}" y2="${options.padding_ver}" x1="${options.padding_hor}" x2="${width+options.padding_hor}" stroke="black"></line>
          <rect class="adder" x="${options.padding_hor}" width="${width}" height="10"></rect>
          <line y1="${options.height - options.filter_height - 5}" y2="${options.height - options.filter_height - 5}" x1="${options.padding_hor}" x2="${width+options.padding_hor}" stroke="black"></line>
          <rect class="adder" x="${options.padding_hor}" width="${width}" height="10" y="${options.height - options.filter_height - 10}"></rect>
          <g transform="translate(${options.padding_hor},${options.padding_ver})">
            <g class="samples">
      
            </g>
            <g class="mappings">
      
            </g>
            <g class="filter" transform="translate(0,${options.height - options.filter_height - 10})">
               <g class="left_filter" transform="translate(0,0)">
                  <path d="M0,0L4,7L-4,7z"></path>
                  <rect x="-4" y="7" width="40" height="13" rx="2" ry="2"></rect>
                  <text y="10" x="4" text-anchor="start">&gt; 0</text>
              </g>
              <g class="right_filter" transform="translate(${width},0)">
                  <path d="M0,0L4,7L-4,7z"></path>
                  <rect x="-36" y="7" width="40" height="13" rx="2" ry="2"></rect>
                  <text y="10" x="3" text-anchor="end">&lt; 1</text>
              </g>
            </g>
          </g>
        </svg>
        <div>
          <span>1</span>
          <input type="text" class="raw_max" id="me${options.idPrefix}raw_max" value="1"><label for="me${options.idPrefix}raw_max">Max</label>
        </div>
      </div>
      <div>
         Extras: <label><input type="checkbox" id="me${options.idPrefix}filterMissing" ${this.old_filter.filterMissing?'checked="checked"' : ''}>Filter Missing Values</label>
      </div>
      <div class="script" style="/* display: none; */">
        <label for="me${options.idPrefix}script_code">Custom Script</label><button>Apply</button>
        <textarea id="me${options.idPrefix}script_code">
        </textarea>
      </div>
    </form>`;


    const raw2pixel = scale.linear().domain([Math.min(this.scale.domain[0], this.original.domain[0]), Math.max(this.scale.domain[this.scale.domain.length - 1], this.original.domain[this.original.domain.length - 1])])
      .range([0, width]);
    const normal2pixel = scale.linear().domain([0, 1])
      .range([0, width]);

    $root.select('input.raw_min')
      .property('value', raw2pixel.domain()[0])
      .on('blur', function () {
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
      .on('blur', function () {
        var d = raw2pixel.domain();
        d[1] = parseFloat(this.value);
        raw2pixel.domain(d);
        var old = that.scale_.domain;
        old[old.length - 1] = d[1];
        that.scale_.domain = old;
        updateRaw();
        triggerUpdate();
      });
    $root.select('input[type="checkbox"]').on('change', () => {
      triggerUpdate();
    });

    //lines that show mapping of individual data items
    var datalines = $root.select('g.samples').selectAll('line').data([]);
    this.dataPromise.then((data) => {
      //to unique values
      data = unique(data);

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
        return (d < domain[0] || d > domain[domain.length - 1]) ? 'hidden' : null;
      });
    }

    function createDrag(move) {
      return behavior.drag()
        .on('dragstart', function () {
          select(this)
            .classed('dragging', true)
            .attr('r', options.radius * 1.1);
        })
        .on('drag', move)
        .on('dragend', function () {
          select(this)
            .classed('dragging', false)
            .attr('r', options.radius);
          triggerUpdate(true);
        });
    }

    var mapping_lines = [];

    function renderMappingLines() {
      if (!(that.scale instanceof ScaleMappingFunction)) {
        return;
      }

      {
        let sscale = <ScaleMappingFunction>that.scale;
        let domain = sscale.domain;
        let range = sscale.range;

        mapping_lines = domain.map((d, i) => ({r: d, n: range[i]}));
      }

      function updateScale() {
        //sort by raw value
        mapping_lines.sort((a, b) => a.r - b.r);
        //update the scale
        let scale = <ScaleMappingFunction>that.scale;
        scale.domain = mapping_lines.map((d) => d.r);
        scale.range = mapping_lines.map((d) => d.n);

        //console.log(sscale.domain, sscale.range);
        updateDataLines();
      }

      function removePoint(i) {
        if (mapping_lines.length <= 2) {
          return; //can't remove have to have at least two
        }
        mapping_lines.splice(i, 1);
        updateScale();
        renderMappingLines();
      }

      function addPoint(x) {
        x = clamp(x, 0, width);
        mapping_lines.push({
          n: normal2pixel.invert(x),
          r: raw2pixel.invert(x)
        });
        updateScale();
        renderMappingLines();
      }

      $root.selectAll('rect.adder').on('click', () => {
        addPoint(mouse($root.select('svg > g').node())[0]);
      });

      const $mapping = $root.select('g.mappings').selectAll('g.mapping').data(mapping_lines);
      const $mapping_enter = $mapping.enter().append('g').classed('mapping', true).on('contextmenu', (d, i) => {
        (<MouseEvent>d3event).preventDefault();
        (<MouseEvent>d3event).stopPropagation();
        removePoint(i);
      });
      $mapping_enter.append('line').attr({
        y1: 0,
        y2: height
      }).call(createDrag(function (d) {
        //drag the line shifts both point in parallel
        const dx = (<any>d3event).dx;
        const nx = clamp(normal2pixel(d.n) + dx, 0, width);
        const rx = clamp(raw2pixel(d.r) + dx, 0, width);
        d.n = normal2pixel.invert(nx);
        d.r = raw2pixel.invert(rx);
        select(this).attr('x1', nx).attr('x2', rx);
        select(this.parentElement).select('circle.normalized').attr('cx', nx);
        select(this.parentElement).select('circle.raw').attr('cx', rx);

        updateScale();
      }));
      $mapping_enter.append('circle').classed('normalized', true).attr('r', options.radius).call(createDrag(function (d) {
        //drag normalized
        const x = clamp((<DragEvent>d3event).x, 0, width);
        d.n = normal2pixel.invert(x);
        select(this).attr('cx', x);
        select(this.parentElement).select('line').attr('x1', x);

        updateScale();
      }));
      $mapping_enter.append('circle').classed('raw', true).attr('r', options.radius).attr('cy', height).call(createDrag(function (d) {
        //drag raw
        const x = clamp((<DragEvent>d3event).x, 0, width);
        d.r = raw2pixel.invert(x);
        select(this).attr('cx', x);
        select(this.parentElement).select('line').attr('x2', x);

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
      if (!(that.scale instanceof ScriptMappingFunction)) {
        $root.select('div.script').style('display', 'none');
        return;
      }
      $root.select('div.script').style('display', null);

      let sscale = <ScriptMappingFunction>that.scale;
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

    {
      let min_filter = (isFinite(this.old_filter.min) ? raw2pixel(this.old_filter.min) : 0);
      let max_filter = (isFinite(this.old_filter.max) ? raw2pixel(this.old_filter.max) : width);
      let toFilterString = (d: number, i: number) => isFinite(d) ? ((i===0?'>':'<')+d.toFixed(1)) : 'any';
      $root.selectAll('g.left_filter, g.right_filter')
        .data([this.old_filter.min, this.old_filter.max])
        .attr('transform', (d,i) => `translate(${i===0?min_filter:max_filter},0)`).call(createDrag(function (d,i) {

          //drag normalized
          const x = clamp((<DragEvent>d3event).x, 0, width);
          const v = raw2pixel.invert(x);
          const filter = (x <= 0 && i === 0 ? -Infinity : (x>=width && i===1 ? Infinity : v));
          select(this).datum(filter)
            .attr('transform',`translate(${x},0)`)
            .select('text').text(toFilterString(filter,i));
        }))
        .select('text').text(toFilterString);
    }

    this.computeFilter = function () {
      return {
        min: parseFloat($root.select('g.left_filter').datum()),
        max: parseFloat($root.select('g.right_filter').datum()),
        filterMissing: $root.select('input[type="checkbox"]').property('checked')
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

    $root.select('select').on('change', function () {
      const v = this.value;
      if (v === 'linear_invert') {
        that.scale_ = new ScaleMappingFunction(raw2pixel.domain(), 'linear', [1, 0]);
      } else if (v === 'linear_abs') {
        let d = raw2pixel.domain();
        that.scale_ = new ScaleMappingFunction([d[0], (d[1] - d[0]) / 2, d[1]], 'linear', [1, 0, 1]);
      } else if (v === 'script') {
        that.scale_ = new ScriptMappingFunction(raw2pixel.domain());
      } else {
        that.scale_ = new ScaleMappingFunction(raw2pixel.domain(), v);
      }
      updateDataLines();
      renderMappingLines();
      renderScript();
      triggerUpdate();
    }).property('selectedIndex', function () {
      var name = 'script';
      if (that.scale_ instanceof ScaleMappingFunction) {
        name = (<ScaleMappingFunction>that.scale).scaleType;
      }
      const types = ['linear', 'linear_invert', 'linear_abs', 'log', 'pow1.1', 'pow2', 'pow3', 'sqrt', 'script'];
      return types.indexOf(name);
    });
  }
}
