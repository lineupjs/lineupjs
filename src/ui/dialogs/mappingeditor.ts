/**
 * Created by Samuel Gratzl on 14.08.2015.
 */

import {D3DragEvent, drag} from 'd3-drag';
import {scaleLinear} from 'd3-scale';
import {event as d3event, mouse, select, selectAll, Selection} from 'd3-selection';
import {INumberFilter} from '../../model/INumberColumn';
import {IMappingFunction, ScaleMappingFunction, ScriptMappingFunction} from '../../model/MappingFunction';
import {filterMissingText} from '../missing';


function clamp(v: number, min: number, max: number) {
  return Math.max(Math.min(v, max), min);
}

function unique(data: number[]) {
  return Array.from(new Set(data));
}

export interface IMappingEditorOptions {
  idPrefix: string;
  width: number;
  height: number;
  padding_hor: number;
  padding_ver: number;
  filter_height: number;
  radius: number;

  callback(newscale: IMappingFunction, filter: { min: number, max: number }): void;

  callbackThisArg: any;
  triggerCallback: string;
}

interface IMappingLine {
  r: number;
  n: number;
}

export default class MappingEditor {
  private readonly options: IMappingEditorOptions = {
    idPrefix: '',
    width: 370,
    height: 150,
    padding_hor: 7,
    padding_ver: 7,
    filter_height: 20,
    radius: 5,
    callback: () => undefined,
    callbackThisArg: null,
    triggerCallback: 'change' //change, dragend
  };

  private computeFilter: () => INumberFilter;
  private _filter: { min: number, max: number };

  constructor(parent: HTMLElement, public scale: IMappingFunction, private readonly original: IMappingFunction, private readonly oldFilter: INumberFilter, private readonly dataPromise: Promise<number[]>, options: Partial<IMappingEditorOptions>) {
    Object.assign(this.options, options);
    //work on a local copy
    this.scale = scale.clone();

    this._filter = {
      min: this.oldFilter.min,
      max: this.oldFilter.max
    };

    this.build(select(parent));
  }

  get filter(): INumberFilter {
    return this.computeFilter();
  }

  private build($root: Selection<any, any, any, any>) {
    const options = this.options,
      that = this;
    $root = $root.append('div').classed('lu-mapping-editor', true);


    const width = options.width - options.padding_hor * 2;
    const height = options.height - options.padding_ver * 2 - options.filter_height;

    (<HTMLElement>$root.node()).innerHTML = `<form onsubmit="return false">
      <div class="filter_part"><span class="title">Mapping:</span></div>
      <div class="mapping_area">
        <svg width="${options.width}" height="${options.height + 35}">
          <text x="${width / 2}" y="10">Normalized Input</text>
          <text x="${width / 2}" y="${options.height - options.filter_height + 5}">Raw Input</text>
          <line y1="${options.padding_ver}" y2="${options.padding_ver}" x1="${options.padding_hor}" x2="${width + options.padding_hor}" stroke="black"></line>
          <rect class="adder" x="${options.padding_hor}" width="${width}" height="10"></rect>
          <line y1="${options.height - options.filter_height - options.padding_ver}" y2="${options.height - options.filter_height - options.padding_ver}" x1="${options.padding_hor}" x2="${width + options.padding_hor}" stroke="black"></line>
          <rect class="adder" x="${options.padding_hor}" width="${width}" height="10" y="${options.height - options.filter_height - 10}"></rect>
          <g transform="translate(${options.padding_hor},${options.padding_ver})">
            <g class="samples"></g>
            <g class="mappings"></g>
            <g class="filter" transform="translate(0,${options.height - options.filter_height - options.padding_ver - 10 + 35})">
               <g class="left_filter" transform="translate(0,0)">
                  <path d="M0,0L4,7L-4,7z"></path>
                  <rect x="-4" y="7" width="40" height="13" rx="2" ry="2"></rect>
                  <text y="14" x="15" text-anchor="middle">Min</text>
                </g>
              <g class="right_filter" transform="translate(${width},0)">
                  <path d="M0,0L4,7L-4,7z"></path>
                  <rect x="-36" y="7" width="40" height="13" rx="2" ry="2"></rect>
                  <text y="14" x="-15" text-anchor="middle">Max</text>
              </g>
            </g>
          </g>
        </svg>
      </div>
    </form>`;


    const raw2pixel = scaleLinear().domain([Math.min(this.scale.domain[0], this.original.domain[0]), Math.max(this.scale.domain[this.scale.domain.length - 1], this.original.domain[this.original.domain.length - 1])])
      .range([0, width]);
    const normal2pixel = scaleLinear().domain([0, 1])
      .range([0, width]);

    const inputDomain = raw2pixel.domain();
    const outputDomain = normal2pixel.domain();

    $root.select('input.raw_min')
      .property('value', raw2pixel.domain()[0])
      .on('blur', function (this: HTMLInputElement) {
        const d = raw2pixel.domain();
        d[0] = parseFloat(this.value);
        raw2pixel.domain(d);
        const old = that.scale.domain;
        old[0] = d[0];
        that.scale.domain = old;
        updateRaw();
        triggerUpdate();
      });
    $root.select('input.raw_max')
      .property('value', raw2pixel.domain()[1])
      .on('blur', function (this: HTMLInputElement) {
        const d = raw2pixel.domain();
        d[1] = parseFloat(this.value);
        raw2pixel.domain(d);
        const old = that.scale.domain;
        old[old.length - 1] = d[1];
        that.scale.domain = old;
        updateRaw();
        triggerUpdate();
      });
    $root.select('input[type="checkbox"]').on('change', () => {
      triggerUpdate();
    });

    //lines that show mapping of individual data items
    let datalines = $root.select('g.samples').selectAll('line').data(<number[]>[]);
    let datalinesUpdate = datalines;
    this.dataPromise.then((data) => {
      //to unique values
      data = unique(data);

      datalines = datalines.data(data);
      datalinesUpdate = datalines.merge(datalines.enter()
        .append('line')
        .attr('x1', (d) => normal2pixel(that.scale.apply(d)))
        .attr('y1', 0)
        .attr('x2', raw2pixel)
        .attr('y2', height)
        .style('visibility', (d) => {
          const domain = that.scale.domain;
          return (d < domain[0] || d > domain[domain.length - 1]) ? 'hidden' : null!;
        }));
    });

    function updateDataLines() {
      datalinesUpdate
        .attr('x1', (d) => normal2pixel(that.scale.apply(d)))
        .attr('x2', raw2pixel)
        .style('visibility', (d) => {
          const domain = that.scale.domain;
          return (d < domain[0] || d > domain[domain.length - 1]) ? 'hidden' : null!;
        });
    }

    function createDrag<T>(move: (d: T, index: number) => void) {
      return drag<HTMLElement, T>()
        .on('start', function (this: HTMLElement) {
          select(this)
            .classed('dragging', true)
            .attr('r', options.radius * 1.1);
          select(`#me${options.idPrefix}mapping-overlay`).classed('hide', true);
        })
        .on('drag', move)
        .on('end', function (this: HTMLElement) {
          select(this)
            .classed('dragging', false)
            .attr('r', options.radius);
          select(`#me${options.idPrefix}mapping-overlay`).classed('hide', false);
          triggerUpdate(true);
        });
    }

    let mappingLines: IMappingLine[] = [];

    function renderMappingLines() {
      if (!(that.scale instanceof ScaleMappingFunction)) {
        return;
      }

      {
        const sscale = <ScaleMappingFunction>that.scale;
        const domain = sscale.domain;
        const range = sscale.range;

        mappingLines = domain.map((d, i) => ({r: d, n: range[i]}));
      }

      function updateScale() {
        //sort by raw value
        mappingLines.sort((a, b) => a.r - b.r);
        //update the scale
        const scale = <ScaleMappingFunction>that.scale;
        scale.domain = mappingLines.map((d) => d.r);
        scale.range = mappingLines.map((d) => d.n);

        //console.log(sscale.domain, sscale.range);
        updateDataLines();
      }

      function removePoint(i: number) {
        if (mappingLines.length <= 2) {
          return; //can't remove have to have at least two
        }
        mappingLines.splice(i, 1);
        updateScale();
        renderMappingLines();
      }

      function addPoint(x: number) {
        const px = clamp(x, 0, width);
        mappingLines.push({
          n: normal2pixel.invert(px),
          r: raw2pixel.invert(px)
        });
        updateScale();
        renderMappingLines();
      }

      $root.on('click', function () {
        $root.select(`#me${options.idPrefix}mapping-overlay`).remove();
      });

      $root.selectAll('rect.adder').on('click', () => {
        addPoint(mouse($root.select<SVGGElement>('svg > g').node()!)[0]);
      });

      function createOverlay(this: SVGGElement, d: { n: number, r: number }) {
        $root.select(`#me${options.idPrefix}mapping-overlay`).remove();

        const overlayOptions = [{
          label: 'Normalized Input',
          value: d.n,
          domain: outputDomain,
          type: 'normalized'
        },
          {
            label: 'Raw Input',
            value: d.r,
            domain: inputDomain,
            type: 'raw'
          }];

        const overlay = $root.append('div');

        overlay.attr('id', `me${options.idPrefix}mapping-overlay`)
          .attr('style', `left: ${(<MouseEvent>d3event).layerX + options.padding_hor + 50}px; top: ${(<MouseEvent>d3event).layerY + options.padding_ver}px`)
          .on('click', () => (<MouseEvent>d3event).stopPropagation());

        const $overlays = overlay.selectAll('div').data(overlayOptions);
        const $overlaysEnter = $overlays.enter().append('div');
        $overlaysEnter
          .append('label')
          .attr('for', (datum) => `me${options.idPrefix}${datum.type}-input`)
          .text((datum) => `${datum.label}: `);
        $overlaysEnter
          .append('input')
          .attr('id', (datum) => `me${options.idPrefix}${datum.type}-input`)
          .attr('type', 'number')
          .attr('min', (datum) => datum.domain[0])
          .attr('max', (datum) => datum.domain[1])
          .attr('step', 0.01)
          .attr('data-type', (datum) => datum.type)
          .attr('value', (datum) => parseFloat(datum.value.toFixed(2)))
          .on('change', (datum) => {
            // this is bound to the enclosing context, which is a mapping (<g class="mapping>)
            const element = <HTMLInputElement>(<MouseEvent>d3event).target;
            const type = datum.type;

            let position = 0;
            switch (type) {
              case 'normalized':
                d.n = parseFloat(element.value);
                position = normal2pixel(parseFloat(element.value));
                select(this).select('line').attr('x1', position);
                break;
              case 'raw':
                d.r = parseFloat(element.value);
                position = raw2pixel(parseFloat(element.value));
                select(this).select('line').attr('x2', position);
                break;
            }

            select(this).select(`circle.${type}`).attr('cx', position);
            updateScale();
            options.callback.call(options.callbackThisArg, that.scale.clone(), that.filter);
          });

        (<Event>d3event).stopPropagation();
      }

      function updateOverlayInput(value: number, type: string) {
        const overlay = document.querySelector(`#me${options.idPrefix}mapping-overlay`);
        if (overlay) {
          const input = <HTMLInputElement>document.querySelector(`#me${options.idPrefix}${type}-input`);
          input.value = value.toFixed(2);
        }
      }

      const $mapping = $root.select('g.mappings').selectAll('g.mapping').data(mappingLines);
      $mapping.on('click', createOverlay);
      const $mappingEnter = $mapping.enter().append('g').classed('mapping', true).on('contextmenu', (_d, i) => {
        (<MouseEvent>d3event).preventDefault();
        (<MouseEvent>d3event).stopPropagation();
        removePoint(i);
      });
      $mappingEnter.append('line')
        .attr('y1', 0).attr('y2', height).call(createDrag<IMappingLine>(function (this: SVGLineElement, d) {
        //drag the line shifts both point in parallel
        const dx = (<any>d3event).dx;
        const nx = clamp(normal2pixel(d.n) + dx, 0, width);
        const rx = clamp(raw2pixel(d.r) + dx, 0, width);
        d.n = normal2pixel.invert(nx);
        d.r = raw2pixel.invert(rx);
        select(this).attr('x1', nx).attr('x2', rx);
        select(this.parentElement!).select('circle.normalized').attr('cx', nx);
        select(this.parentElement!).select('circle.raw').attr('cx', rx);

        updateOverlayInput(d.r, 'raw');
        updateOverlayInput(d.n, 'normalized');

        updateScale();
      }));
      $mappingEnter.append('circle').classed('normalized', true).attr('r', options.radius).call(createDrag<IMappingLine>(function (this: SVGCircleElement, d) {
        //drag normalized
        const px = clamp((<DragEvent>d3event).x, 0, width);
        d.n = normal2pixel.invert(px);
        select(this).attr('cx', px);
        select(this.parentElement!).select('line').attr('x1', px);

        updateOverlayInput(d.n, 'normalized');

        updateScale();
      }));
      $mappingEnter.append('circle').classed('raw', true).attr('r', options.radius).attr('cy', height).call(createDrag<IMappingLine>(function (this: SVGCircleElement, d) {
        //drag raw
        const px = clamp((<DragEvent>d3event).x, 0, width);
        d.r = raw2pixel.invert(px);
        select(this).attr('cx', px);
        select(this.parentElement!).select('line').attr('x2', px);

        updateOverlayInput(d.r, 'raw');

        updateScale();
      }));

      const $mappingUpdate = $mapping.merge($mappingEnter);
      $mappingUpdate.select('line')
        .attr('x1', (d) => normal2pixel(d.n))
        .attr('x2', (d) => raw2pixel(d.r));
      $mappingUpdate.select('circle.normalized').attr('cx', (d) => normal2pixel(d.n));
      $mappingUpdate.select('circle.raw').attr('cx', (d) => raw2pixel(d.r));
      $mapping.exit().remove();
    }


    renderMappingLines();

    function triggerUpdate(isDragEnd = false) {
      if (isDragEnd && (options.triggerCallback !== 'dragend')) {
        return;
      }
      options.callback.call(options.callbackThisArg, that.scale.clone(), that.filter);
    }
  }
}
