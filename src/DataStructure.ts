/**
 * Created by Samuel Gratzl on 06.08.2015.
 */
///<reference path='../typings/tsd.d.ts' />

function fixCSS(id) {
  return  id.replace(/[\s!\'#$%&'\(\)\*\+,\.\/:;<=>\?\@\[\\\]\^`\{\|\}~]/g, '_'); //replace non css stuff to _
}

function numberCompare(a: number, b: number) {
  if (a === b || (isNaN(a) && isNaN(b))) {
    return 0;
  }
  return a - b;
}

class AEventDispatcher {
  private listeners = d3.dispatch.apply(d3, this.createEventList());

  on(type: string): (...args: any[]) => void;
  on(type: string, listener: (...args: any[]) => any): Column;
  on(type: string, listener?: (...args: any[]) => any) : any {
    if (listener) {
      this.listeners.on(type, listener);
      return this;
    }
    return this.listeners.on(type);
  }

  createEventList(): string[] {
    return [];
  }

  fire(type: string, ...args: any[]) {
    this.listeners[type].apply(this.listeners, args);
  }
}

class Column extends AEventDispatcher {
  public id: string;
  private width_: number = 100;

  constructor(id: string, public desc: any) {
    super();
    this.id = fixCSS(id);
  }

  createEventList() {
    return super.createEventList().concat(['widthChanged','dirtySorting','dirtyFilter']);
  }

  getWidth() {
    return this.width_;
  }

  setWidth(value: number) {
    if (this.width_ === value) {
      return
    }
    this.fire('widthChanged',this, this.width_, this.width_ = value);
  }

  get label() {
    return this.desc.label || this.id;
  }
  get color() {
    return this.desc.color || 'gray';
  }

  getLabel(row: any): string {
    return ''+this.getValue(row);
  }
  getValue(row: any): any {
    return ''; //no value
  }
  compare(a: any[], b: any[]) {
    return 0; //can't compare
  }

  isFiltered() {
    return false;
  }

  filter(row: any) {
    return row !== null;
  }
}

interface IRenderContext {
  rowScale(index: number) : number;
  rowX(index: number): number;
  rowHeight(index: number) : number;
  rowKey(d: any, i: number): string;

  renderer(col: Column): ICellRenderer;

  showStacked(col: StackColumn): boolean;

  idPrefix: string;
}

interface ICellRenderer {
  render($col: d3.Selection<any>, col: Column, rows: any[], context: IRenderContext);
  mouseEnter($col: d3.Selection<any>, $row: d3.Selection<any>, col: Column, row: any, index: number, context: IRenderContext);
  mouseLeave($col: d3.Selection<any>, $row: d3.Selection<any>, col: Column, row: any, index: number, context: IRenderContext);
}

/**
 * default renderer instance rendering the value as a text
 */
class DefaultCellRenderer implements ICellRenderer {
  textClass = 'text';
  render($col: d3.Selection<any>, col: StringColumn, rows: any[], context: IRenderContext) {
    var $rows = $col.datum(col).selectAll('text.'+this.textClass).data(rows, context.rowKey);
    $rows.enter().append('text').attr({
      'class': this.textClass,
      'clip-path': 'url(#'+context.idPrefix+'clipCol'+col.id+')'
    });
    $rows.attr({
      x: (d, i) => context.rowX(i),
      y : (d, i) => context.rowScale(i)
    }).text((d) => col.getLabel(d));
    $rows.exit().remove();
  }
  findRow($col: d3.Selection<any>, row: any) {
    return $col.selectAll('text.'+this.textClass).filter((d) => d === row);
  }
  mouseEnter($col: d3.Selection<any>, $row: d3.Selection<any>, col: Column, row: any, index: number, context: IRenderContext) {
    var rowNode = <Node>$row.node();
    //find the right one and
    var n = <Node>this.findRow($col, row).node();
    if (n) {
      rowNode.appendChild(n);
    }
  }
  mouseLeave($col: d3.Selection<any>, $row: d3.Selection<any>, col: Column, row: any, index: number, context: IRenderContext) {
    var colNode = <Node>$col.node();
    var rowNode = <Node>$row.node();
    //move back
    if (rowNode.hasChildNodes()) {
      colNode.appendChild(rowNode.firstChild);
    }
    $row.selectAll('*').remove();
  }
}

/**
 * simple derived one where individual elements can be overriden
 */
class DerivedCellRenderer extends DefaultCellRenderer {
  constructor(extraFuncs: any) {
    super();
    Object.keys(extraFuncs).forEach((key) => {
      this[key] = extraFuncs[key];
    });
  }
}

var defaultRendererInstance = new DefaultCellRenderer();

/**
 * creates a new instance with optional overidden methods
 * @param extraFuncs
 * @return {DefaultCellRenderer}
 */
function defaultRenderer(extraFuncs?: any) {
  if (!extraFuncs) {
    return defaultRendererInstance;
  }
  return new DerivedCellRenderer(extraFuncs);
}

class ValueColumn<T> extends Column {
  accessor: (row: any, id: string, desc: any) => T;
  constructor(id: string, desc: any) {
    super(id, desc);
    this.accessor = desc.accessor || ((row: any, id: string, desc: any) => null);
  }
  getLabel(row: any){
    return ''+this.getValue(row);
  }
  getValue(row: any) {
    return this.accessor(row, this.id, this.desc);
  }

  compare(a: any[], b: any[]) {
    return 0; //can't compare
  }
}

class NumberColumn extends ValueColumn<number> {
  public missingValue = NaN;
  public scale = d3.scale.linear().domain([NaN, NaN]).range([0, 1]);
  private filter_ = { min: -Infinity, max: Infinity };

  static renderer = defaultRenderer({
    render: ($col: d3.Selection<any>, col: NumberColumn, rows: any[], context: IRenderContext) => {
      var $rows = $col.datum(col).selectAll('rect.bar').data(rows, context.rowKey);
      $rows.enter().append('rect').attr({
        'class': 'bar',
        fill : col.color
      });
      $rows.attr({
        x: (d, i) => context.rowX(i),
        y : (d, i) => context.rowScale(i)+1,
        height: (d, i) => context.rowHeight(i)-2,
        width: (d) => col.getWidth() * col.getValue(d)
      });
      $rows.exit().remove();
    },
    findRow: ($col: d3.Selection<any>, row: any) => {
      return $col.selectAll('rect.bar').filter((d) => d === row);
    },
    mouseEnter: function($col: d3.Selection<any>, $row: d3.Selection<any>, col: Column, row: any, index: number, context: IRenderContext) {
      var rowNode = this.findRow($col, row);
      if (!rowNode.empty()) {
        (<Node>$row.node()).appendChild(rowNode.node());
        $row.append('text').datum(row).attr({
          'class': 'number',
          'clip-path': 'url(#' + context.idPrefix + 'clipCol' + col.id + ')',
          x: context.rowX(index),
          y: context.rowScale(index)
        }).text((d) => col.getLabel(d));
      }
    }
  });

  constructor(id: string, desc: any) {
    super(id, desc);
    if (desc.domain) {
      this.scale.domain(desc.domain);
    }
    if (desc.range) {
      this.scale.range(desc.range);
    }
  }

  getLabel(row: any) {
    return ''+super.getValue(row);
  }

  getRawValue(row: any) {
    var v : any= super.getValue(row);
    if (typeof(v) === 'undefined' || v == null || isNaN(v) || v === '' || v === 'NA' || (typeof(v) === 'string' && (v.toLowerCase() === 'na'))) {
      return this.missingValue;
    }
    return +v;
  }

  getValue(row: any) {
    var v = this.getRawValue(row);
    if (isNaN(v)) {
      return v;
    }
    return this.scale(v);
  }

  compare(a: any[], b: any[]) {
    return numberCompare(this.getValue(a), this.getValue(b));
  }

  isFiltered() {
    return isFinite(this.filter_.min) || isFinite(this.filter_.max);
  }

  get filterMin() {
    return this.filter_.min;
  }
  get filterMax() {
    return this.filter_.max;
  }
  getFilter() {
    return this.filter_;
  }
  set filterMin(min: number) {
    var bak = { min: this.filter_.min, max: this.filter_.max };
    this.filter_.min = isNaN(min) ? -Infinity : min;
    this.fire('dirtyFilter', this, bak, this.filter_);
  }
  set filterMax(max: number) {
    var bak = { min: this.filter_.min, max: this.filter_.max };
    this.filter_.max = isNaN(max) ? Infinity : max;
    this.fire('dirtyFilter', this, bak, this.filter_);
  }
  setFilter(min: number = -Infinity, max: number = +Infinity) {
    var bak = { min: this.filter_.min, max: this.filter_.max };
    this.filter_.min = isNaN(min) ? -Infinity : min;
    this.filter_.max = isNaN(max) ? Infinity : max;
    this.fire('dirtyFilter', this, bak, this.filter_);
  }

  filter(row: any) {
    if (!this.isFiltered()) {
      return true;
    }
    var v = this.getRawValue(row);
    if (isNaN(v)) {
      return true;
    }
    if (isFinite(this.filter_.min) && v < this.filter_.min) {
      return false;
    }
    if (isFinite(this.filter_.max) && v < this.filter_.max) {
      return false;
    }
    return true;
  }
}

class StringColumn extends ValueColumn<string> {
  static renderer = defaultRenderer();

  constructor(id: string, desc: any) {
    super(id, desc);
  }

  getValue(row: any) {
    var v : any= super.getValue(row);
    if (typeof(v) === 'undefined' || v == null) {
      return '';
    }
    return v;
  }

  compare(a: any[], b: any[]) {
    return d3.ascending(this.getValue(a), this.getValue(b));
  }
}

class LinkColumn extends StringColumn {
  static renderer = defaultRenderer({
    render: ($col: d3.Selection<any>, col: StringColumn, rows: any[], context: IRenderContext) => {
      var $rows = $col.datum(col).selectAll('a.link').data(rows, context.rowKey);
      $rows.enter().append('a').attr({
        'class': 'link',
        'target': '_blank'
      }).append('text').attr({
        'class': 'text',
        'clip-path': 'url(#clipCol'+col.id+')'
      });
      $rows.attr({
        'xlink:href': (d) => col.getValue(d),
      }).select('text').attr({
        x: (d, i) => context.rowX(i),
        y : (d, i) => context.rowScale(i)
      }).text((d) => col.getLabel(d));
      $rows.exit().remove();
    },
    findRow: ($col: d3.Selection<any>, row: any) => {
      return $col.selectAll('a.link').filter((d) => d === row);
    }
  });

  constructor(id: string, desc: any) {
    super(id, desc);
  }

  getLabel(row: any){
    var v : any = super.getValue(row);
    if (v.alt) {
      return v.alt;
    }
    return ''+v;
  }
  getValue(row: any) {
    var v : any= super.getValue(row);
    if (v.href) {
      return v.href;
    }
    return v;
  }
}

interface StackChild {
  col: Column;
  weight: number;
}

class StackColumn extends Column {
  static renderer = defaultRenderer({
    renderImpl: function($col: d3.Selection<any>, col: StackColumn, context: IRenderContext, perChild: ($child: d3.Selection<Column>, col: Column, context: IRenderContext) => void, rowGetter: (index: number) => any) {
      var $group = $col.datum(col),
        children = col.children,
        offset = 0,
        shifts = children.map((d) => {
          var r = offset;
          offset += d.getWidth();
          return r;
        });

      var bak = context.rowX;
      if (!context.showStacked(col)) {
        context.rowX = () => 0;
      }

      var $children = $group.selectAll('g.child').data(children);
      $children.enter().append('g').attr({
        'class': 'child'
      });
      $children.attr({
        transform: (d,i) => 'translate('+shifts[i]+',0)',
        'class': (d) => 'child '+d.desc.type
      }).each(function (d, i) {
        if (context.showStacked(col)) {
          var preChildren = children.slice(0,i);
          context.rowX = (index) => {
            //shift by all the empty space left from the previous columns
            return -preChildren.reduce((prev, child) => prev + child.getWidth() * (1-child.getValue(rowGetter(index))), 0);
          };
        }
        perChild(d3.select(this), d, context);
      });
      $children.exit().remove();

      context.rowX = bak;
    },
    render: function($col: d3.Selection<any>, col: StackColumn, rows: any[], context: IRenderContext) {
      this.renderImpl($col, col, context, ($child, d, ccontext) => {
        ccontext.renderer(d).render($child, d, rows, ccontext);
      }, (index) => rows[index]);
    },
    mouseEnter: function($col: d3.Selection<any>, $row: d3.Selection<any>, col: Column, row: any, index: number, context: IRenderContext) {
      var d = $col.datum();
      if (d.rows) { //we have the data
        this.renderImpl($row, col, context, ($child, d, ccontext) => {
          ccontext.renderer(d).mouseEnter($child, d, row, index, ccontext);
        }, (index) => d.rows[index]);
      } else {
        //not yet there
      }
    },
    mouseLeave: function($col: d3.Selection<any>, $row: d3.Selection<any>, col: Column, row: any, index: number, context: IRenderContext) {
      this.renderImpl($row, col, context, ($child, d, ccontext) => {
        ccontext.renderer(d).mouseLeave($child, d, row, index, ccontext);
      }, (index) => row);
      $row.selectAll('*').remove();
    }
  });

  public missingValue = NaN;
  private children_ : StackChild[] = [];

  private triggerResort = () => this.fire('dirtySorting', this);
  private forwardFilter = (source, old, new_) => this.fire('dirtyFilter', source, old, new_);

  constructor(id: string, desc: any) {
    super(id, desc);
  }

  get children() {
    return this.children_.map((d) => d.col);
  }

  get weights() {
    return this.children_.map((d) => d.weight);
  }

  push(col: Column, weight: number) {
    this.children_.push({ col: col, weight: weight});
    col.on('dirtyFilter.stack', this.forwardFilter);
    col.on('dirtySorting.stack', this.triggerResort);
    col.on('widthChanged.stack', this.triggerResort);
    this.setWidth(this.getWidth() + col.getWidth()); //increase my width
    this.fire('dirtySorting', this);
  }

  changeWeight(child: Column, weight: number, autoNormalize = false) {
    var changed = this.children_.some((c) => {
      if (c.col === child) {
        c.weight = weight;
        return true;
      }
      return false;
    });
    if (changed && autoNormalize) {
      this.normalizeWeights();
    } else if (changed) {
      this.fire('dirtySorting', this);
    }
    return changed;
  }

  remove(child: Column) {
    return this.children_.some((c, i, arr) => {
      if (c.col === child) {
        arr.splice(i, 1);
        child.on('dirtyFilter.stack', null);
        child.on('dirtySorting.stack', null);
        child.on('widthChanged.stack', null);
        this.fire('dirtySorting', this);
        return true;
      }
      return false;
    });
  }

  normalizeWeights() {
    var sum = this.children_.reduce((acc, child) => acc += child.weight, 0);
    this.children_.forEach((child) => {
      child.weight = child.weight / sum;
      child.col.on('widthChanged.stack', null);
      child.col.setWidth(this.getWidth() * child.weight);
      child.col.on('widthChanged.stack', this.triggerResort);
    });
    this.fire('dirtySorting', this);
  }

  setWidth(value: number) {
    this.children_.forEach((child) => {
      //disable since we change it
      child.col.on('widthChanged.stack', null);
      child.col.setWidth(value * child.weight);
      child.col.on('widthChanged.stack', this.triggerResort);
    });
    super.setWidth(value);
  }

  getValue(row: any) {
    var v = this.children_.reduce((acc, d) => acc + d.col.getValue(row) * d.weight, 0);
    if (typeof(v) === 'undefined' || v == null || isNaN(v)) {
      return this.missingValue;
    }
    return v;
  }

  compare(a: any[], b: any[]) {
    return numberCompare(this.getValue(a), this.getValue(b));
  }
}

class RankColumn extends ValueColumn<number> {
  static renderer = defaultRenderer({
    textClass : 'rank'
  });

  private sortBy_ : Column = null;
  private ascending = false;
  private columns_ : Column[] = [];
  extra : any = {};

  private triggerResort = () => this.fire('dirtySorting', this);
  private forwardFilter = (source, old, new_) => this.fire('dirtyFilter', source, old, new_);

  comparator = (a: any[], b: any[]) => {
    if (this.sortBy_ === null) {
      return 0;
    }
    var r = this.sortBy_.compare(a,b);
    return this.ascending ? r : -r;
  };

  constructor(id: string, desc: any) {
    super(id, desc);
  }

  createEventList() {
    return super.createEventList().concat(['sortCriteriaChanged']);
  }

  sortCriteria() {
    return {
      col: this.sortBy_,
      asc : this.ascending
    };
  }

  sortBy(col: Column, ascending = false) {
    if (col.on('dirtyFilter.ranking') !== this.forwardFilter) {
      return false; //not one of mine
    }
    if (this.sortBy_ === col && this.ascending === ascending) {
      return true; //already in this order
    }
    if (this.sortBy_) {
      this.sortBy_.on('dirtySorting.ranking', null);
    }
    var bak = this.sortCriteria();
    this.sortBy_ = col;
    if (this.sortBy_) {
      this.sortBy_.on('dirtySorting.ranking', this.triggerResort);
    }
    this.ascending = ascending;
    this.fire('sortCriteriaChanged', this, bak, this.sortCriteria());
    this.triggerResort();
    return true;
  }

  get children() {
    return this.columns_.slice();
  }

  push(col: Column) {
    this.columns_.push(col);
    col.on('dirtyFilter.ranking', this.forwardFilter);

    if(this.sortBy_ === null) {
      this.sortBy_ = col;
      this.sortBy_.on('dirtySorting.ranking', this.triggerResort);
      this.triggerResort();
    }
  }
  remove(col: Column) {
    return this.columns_.some((c, i, arr) => {
      if (c === col) {
        col.on('dirtyFilter.ranking', null);
        arr.splice(i, 1);
        if (this.sortBy_ === c) {
          this.sortBy(arr.length > 0 ? arr[0] : null);
        }
        return true;
      }
      return false;
    });
  }

  toSortingDesc(toId : (desc:any) => string) {
    //TODO describe also all the filter settings
    var resolve = (s: Column): any => {
      if (s === null) {
        return null;
      }
      if (s instanceof StackColumn) {
        var w = s.weights;
        return s.children.map((child, i) => {
          return {
            weight: w[i],
            id: resolve(child)
          }
        });
      }
      return toId(s.desc);
    };
    var id = resolve(this.sortBy_);
    if (id === null) {
      return null;
    }
    return {
      id: id,
      asc: this.ascending
    }
  }
}

class IColumnDesc {
  label: string;
  type: string;
}

class DataProvider extends AEventDispatcher {
  private rankings_ : RankColumn[] = [];
  private uid = 0;

  columnTypes : any = {
    number: NumberColumn,
    string: StringColumn,
    link: LinkColumn,
    stack: StackColumn,
    rank: RankColumn
  };

  pushRanking(existing?: RankColumn) {
    var r = this.cloneRanking(existing);
    this.rankings_.push(r);
    return r;
  }

  removeRanking(ranking: RankColumn) {
    var i = this.rankings_.indexOf(ranking);
    if (i < 0 ){
      return false;
    }
    this.rankings_.splice(i, 1);
    this.cleanUpRanking(ranking);
    return true;
  }

  getRankings() {
    return this.rankings_.slice();
  }

  cleanUpRanking(ranking: RankColumn) {

  }

  cloneRanking(existing? : RankColumn) {
    return null; //implement me
  }

  push(ranking: RankColumn, desc: IColumnDesc) {
    var type = this.columnTypes[desc.type];
    if (type) {
      ranking.push(new type('col'+(this.uid++),desc));
      return true;
    }
    return false;
  }

  sort(ranking: RankColumn) : Promise<number[]> {
    return Promise.reject('not implemented');
  }

  view(argsort: number[]) : Promise<any[]> {
    return Promise.reject('not implemented');
  }

  rowKey(row: any, i: number) {
    return row._index;
  }
}

class LocalDataProvider extends DataProvider {
  private rankingIndex = 0;
  private rowGetter = (row: any, id: string, desc: any) => row[desc.column];

  constructor(private data: any[], private columns : IColumnDesc[] = []) {
    super();
    //enhance with a magic attribute storing ranking information
    data.forEach((d, i) => {
      d._rankings = {};
      d._index = i
    });

    //generate the accessor
    columns.forEach((d: any) => d.accessor = this.rowGetter);
  }

  cloneRanking(existing?: RankColumn) {
    var id = 'rank'+(this.rankingIndex++);
    var rankDesc = {
      label: 'Rank',
      type: 'rank',
      accessor: (row, id) => row._rankings[id] || 0
    };
    if (existing) { //copy the ranking of the other one
      this.data.forEach((row) => {
        var r = row._rankings;
        r[id] = r[existing.id];
      });
    }
    return new RankColumn(id, rankDesc);
  }

  cleanUpRanking(ranking: RankColumn) {
    //delete all stored information
    this.data.forEach((d) => delete d._rankings[ranking.id]);
  }

  sort(ranking: RankColumn) : Promise<number[]> {
    //wrap in a helper and store the initial index
    var helper = this.data.map((r, i) => ({ row: r, i: i, prev : r._rankings[ranking.id] || 0}));
    //sort by the ranking column
    helper.sort((a, b) => ranking.comparator(a.row, b.row));

    //store the ranking index and create an argsort version, i.e. rank 0 -> index i
    var argsort = helper.map((r, i) => {
      r.row._rankings[ranking.id] = i;
      return r.i;
    });
    return Promise.resolve(argsort);
  }

  view(argsort: number[]) {
    var slice = argsort.map((index) => this.data[index]);
    return Promise.resolve(slice);
  }
}

interface IServerData {
  sort(desc: any) : Promise<number[]>;
  view(indices: number[]): Promise<any[]>;
}

class RemoteDataProvider extends DataProvider {
  private rankingIndex = 0;
  private rowGetter = (row: any, id: string, desc: any) => row[desc.column];

  private ranks : any = {};

  constructor(private server: IServerData, private columns : IColumnDesc[] = []) {
    super();
    //generate the accessor
    columns.forEach((d: any) => d.accessor = this.rowGetter);
  }

  cloneRanking(existing?: RankColumn) {
    var id = 'rank'+(this.rankingIndex++);
    var rankDesc = {
      label: 'Rank',
      type: 'rank',
      accessor: (row, id) => this.ranks[id][row._index] || 0
    };
    if (existing) { //copy the ranking of the other one
      //copy the ranking
      this.ranks[id] = this.ranks[existing.id];
    }
    return new RankColumn(id, rankDesc);
  }

  cleanUpRanking(ranking: RankColumn) {
    //delete all stored information
    delete this.ranks[ranking.id];
  }

  sort(ranking: RankColumn) : Promise<number[]> {
    //generate a description of what to sort
    var desc = ranking.toSortingDesc((desc) => desc.column);
    return this.server.sort(desc).then((argsort) => {
      this.ranks[ranking.id] = argsort;
      return argsort;
    });
  }

  view(argsort: number[]) {
    return this.server.view(argsort).then((view) => {
      //enhance with the data index
      view.forEach((d, i) => d._index = argsort[i]);
      return view;
    });
  }
}

class LineUpBody {
  private mouseOverItem : (dataIndex: number, hover : boolean) => void;

  constructor(private $root: d3.Selection<any>, private data: DataProvider, private argsortGetter : (ranking: RankColumn) => number[]) {

  }

  createContext(rankings: RankColumn[]) : IRenderContext{
    var data = this.data;
    return {
      rowKey : this.data.rowKey,
      rowScale(index: number) {
        return index * 21
      },
      rowX(index: number) {
        return 0;
      },
      rowHeight(index: number) {
        return 20;
      },
      showValue(index: number) {
        return false;
      },
      renderer(col: Column) {
        return data.columnTypes[col.desc.type].renderer;
      },
      showStacked(col: StackColumn) {
        return false;
      },
      idPrefix: ''
    }
  }

  renderRankings(r: RankColumn[], shifts: any[], context: IRenderContext) {
    var data = this.data;
    var dataPromises = r.map((ranking) => this.data.view(this.argsortGetter(ranking)));

    var $rankings = this.$root.selectAll('g.ranking').data(r, (d) => d.id);
    var $rankings_enter = $rankings.enter().append('g').attr({
      'class': 'ranking'
    });
    $rankings_enter.append('g').attr('class','rows');
    $rankings_enter.append('g').attr('class','cols');


    $rankings.attr({
      transform: (d, i) => 'translate('+shifts[i].shift+',0)'
    });

    var $cols = $rankings.select('g.cols').selectAll('g.child').data((d) => [<Column>d].concat(d.children), (d) => d.id);
    $cols.enter().append('g').attr({
      'class': 'child'
    });
    $cols.attr({
      'data-index': (d, i) => i,
      transform: (d, i, j?) => {
        return 'translate('+shifts[j].shifts[i]+',0)'
      }
    }).each(function(d, i, j?) {
      dataPromises[j].then((data) => {
        context.renderer(d).render(d3.select(this), d, data, context);
      })
    });
    $cols.exit().remove();

    function mouseOverRow($row: d3.Selection<number>, $cols: d3.Selection<RankColumn>, index: number, ranking: RankColumn, rankingIndex: number) {
      $row.classed('hover', true);
      var $value_cols = $row.select('g.values').selectAll('g.child').data([<Column>ranking].concat(ranking.children));
      $value_cols.enter().append('g').attr({
        'class': 'child'
      });
      $value_cols.attr({
        transform: (d, i) => {
          return 'translate('+shifts[rankingIndex].shifts[i]+',0)'
        }
      }).each(function(d: Column, i) {
        dataPromises[rankingIndex].then((data) => {
          context.renderer(d).mouseEnter($cols.selectAll('g.child[data-index="'+i+'"]'), d3.select(this), d, data[index], index, context);
        });
      });
      $value_cols.exit().remove();
      //data.mouseOver(d, i);
    }

    function mouseLeaveRow($row: d3.Selection<number>, $cols: d3.Selection<RankColumn>, index: number, ranking: RankColumn, rankingIndex: number) {
      $row.classed('hover', false);
      $row.select('g.values').selectAll('g.child').each(function(d: Column, i) {
        dataPromises[rankingIndex].then((data) => {
          context.renderer(d).mouseLeave($cols.selectAll('g.child[data-index="'+i+'"]'), d3.select(this), d, data[index], index, context);
        });
      }).remove();
      //data.mouseLeave(d, i);
    }

    this.mouseOverItem = function(data_index: number, hover = true) {
      $rankings.each(function(ranking, rankingIndex) {
        var $ranking = d3.select(this);
        var $row = $ranking.selectAll('g.row[data-index="'+data_index+'"]');
        var $cols = $ranking.select('g.cols');
        if (!$row.empty()) {
          var index = $row.datum().i;
          if (hover) {
            mouseOverRow($row, $cols, index, ranking, rankingIndex);
          } else {
            mouseLeaveRow($row, $cols, index, ranking, rankingIndex);
          }
        }
      });
    };

    var $rows = $rankings.select('g.rows').selectAll('g.row').data((d) => this.argsortGetter(d).map((d,i) => ({ d: d, i: i}) ));
    var $rows_enter = $rows.enter().append('g').attr({
      'class' : 'row'
    });
    $rows_enter.append('rect').attr({
      'class': 'bg',
      width: (d, i, j?) => shifts[j].width
    });
    $rows_enter.append('g').attr({ 'class' : 'values' });
    $rows_enter.on('mouseenter', (data_index) => {
      console.log(data_index);
      this.mouseOver(data_index.d, true);
    }).on('mouseleave', (data_index) => {
      console.log(data_index);
      this.mouseOver(data_index.d, false);
    });
    $rows.attr({
      'data-index': (d) => d.d,
    });
    $rows.select('rect').attr({
      y : (data_index) => context.rowScale(data_index.i),
      height: (data_index) => context.rowHeight(data_index.i)
    });
    $rows.exit().remove();

    $rankings.exit().remove();
  }

  mouseOver(dataIndex: number, hover = true) {
    this.mouseOverItem(dataIndex, hover);
    //update the slope graph
    this.$root.selectAll('line.slope[data-index="'+dataIndex+'"').classed('hover',hover);
  }

  renderSlopeGraphs(rankings: RankColumn[], shifts: any[], context: IRenderContext) {

    var slopes = rankings.slice(1).map((d, i) => ({ left: rankings[i], right: d }));
    var $slopes = this.$root.selectAll('g.slopegraph').data(slopes);
    $slopes.enter().append('g').attr({
      'class' : 'slopegraph'
    });
    $slopes.attr({
      transform: (d, i) => 'translate('+(shifts[i+1].shift-200)+',0)'
    });
    var $lines = $slopes.selectAll('line.slope').data((d) => {
      var cache = {};
      this.argsortGetter(d.right).forEach((data_index, pos) => {
        cache[data_index] = pos
      });
      return this.argsortGetter(d.left).map((data_index, pos) => ({
          data_index: data_index,
          lpos: pos,
          rpos: cache[data_index]
        }));
    });
    $lines.enter().append('line').attr({
      'class': 'slope',
      x2: 200
    }).on('mouseenter', (d) => {
      this.mouseOver(d.data_index, true);
    }).on('mouseleave', (d) => {
      this.mouseOver(d.data_index, false);
    });
    $lines.attr({
      'data-index': (d) => d.data_index,
      y1: (d: any) => context.rowHeight(d.lpos)*0.5 + context.rowScale(d.lpos),
      y2: (d: any) => context.rowHeight(d.rpos)*0.5 + context.rowScale(d.rpos),
    });
    $lines.exit().remove();
    $slopes.exit().remove();
  }

  render() {
    var r = this.data.getRankings();
    var context = this.createContext(r);
    var offset = 0,
      shifts = r.map((d,i) => {
        var r = offset;
        offset += 200; //TODO separator width
        var o2 = 0,
          shift2 = [<Column>d].concat(d.children).map((o) => {
            var r = o2;
            o2 += o.getWidth();
            return r;
          });
        offset += o2;
        return {
          shift: r,
          shifts: shift2,
          width: o2
        };
      });

    this.renderRankings(r, shifts, context);
    this.renderSlopeGraphs(r, shifts, context);
  }
}
