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

class Column {
  public parent: Column = null;
  public id: string;
  private width_: number = 100;

  constructor(id: string, public desc: any) {
    this.id = fixCSS(id);
  }

  getWidth() {
    return this.width_;
  }

  setWidth(value: number) {
    this.width_ = value;
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

  triggerResort(triggeredBy : Column = this) {
    if (this.parent !== null) {
      this.parent.triggerResort(triggeredBy);
    }
  }

  findRanker(): RankColumn {
    if (this.parent !== null) {
      return this.parent.findRanker();
    }
    return null;
  }

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
    this.filter_.min = isNaN(min) ? -Infinity : min;
    this.triggerResort();
  }
  set filterMax(max: number) {
    this.filter_.max = isNaN(max) ? Infinity : max;
    this.triggerResort();
  }
  setFilter(min: number = -Infinity, max: number = +Infinity) {
    this.filter_.min = isNaN(min) ? -Infinity : min;
    this.filter_.max = isNaN(max) ? Infinity : max;
    this.triggerResort();
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

interface StackChild {
  col: Column;
  weight: number;
}

class StackColumn extends Column {
  public missingValue = NaN;
  private children_ : StackChild[] = [];

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
    col.parent = this;
    this.triggerResort(this);
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
      this.triggerResort();
    }
    return changed;
  }

  remove(child: Column) {
    return this.children_.some((c, i, arr) => {
      if (c.col === child) {
        arr.splice(i, 1);
        child.parent = null;
        this.triggerResort();
        return true;
      }
      return false;
    });
  }

  normalizeWeights() {
    var sum = this.children_.reduce((acc, child) => acc += child.weight, 0);
    this.children_.forEach((child) => {
      child.weight = child.weight / sum;
      child.col.setWidth(this.getWidth() * child.weight);
    });
    this.triggerResort();
  }

  setWidth(value: number) {
    super.setWidth(value);
    this.children_.forEach((child) => {
      child.col.setWidth(value * child.weight);
    });
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

  triggerResort(triggeredBy: Column = this) {
    super.triggerResort(this); //override it if called by children call with me
  }
}

class RankColumn extends ValueColumn<number> {
  private sortBy_ : Column = null;
  private ascending = false;
  private columns_ : Column[] = [];
  extra : any = {};

  comparator = (a: any[], b: any[]) => {
    if (this.sortBy_ === null) {
      return 0;
    }
    var r = this.sortBy_.compare(a,b);
    return this.ascending ? r : -r;
  };

  constructor(id: string, desc: any, private resortMe: (rank: RankColumn) => void) {
    super(id, desc);
  }

  sortCriteria() {
    return {
      col: this.sortBy_,
      asc : this.ascending
    };
  }

  triggerResort(triggeredBy: Column) {
    if (triggeredBy === this.sortBy_) {
      this.resortMe(this);
    }
  }

  sortBy(col: Column, ascending = true) {
    if (col.findRanker() !== this) {
      return false; //not one of mine
    }
    if (this.sortBy_ === col && this.ascending === ascending) {
      return true; //already in this order
    }
    this.sortBy_ = col;
    this.ascending = ascending;
    this.triggerResort(col);
    return true;
  }

  get children() {
    return this.columns_.slice();
  }

  push(col: Column) {
    this.columns_.push(col);

    if(this.sortBy_ === null) {
      this.sortBy_ = col;
      this.triggerResort(col);
    }
  }
  remove(col: Column) {
    return this.columns_.some((c, i, arr) => {
      if (c === col) {
        arr.splice(i, 1);
        if (this.sortBy_ === c) {
          this.sortBy_ = arr.length > 0 ? arr[0] : null;
          this.triggerResort(this.sortBy_);
        }
        return true;
      }
      return false;
    });
  }

  findRanker() {
    return this;
  }

  toSortingDesc(toId : (desc:any) => string) {
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

class DataProvider {
  private rankings_ : RankColumn[] = [];
  private uid = 0;

  columnTypes : any = {
    number: NumberColumn,
    string: StringColumn,
    link: StringColumn,
    stack: StackColumn
  };

  renderers = {
    rank: new RankCellRenderer(),
    string: new StringCellRenderer(),
    number: new NumberCellRenderer(),
    stack : new StackedCellRenderer(),
    link: new LinkCellRenderer()
  };

  pushRanking(existing?: RankColumn) {
    var r = this.cloneRanking(existing)
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
  private sortHelper = (ranking: RankColumn) => {
    this.sort(ranking);
  };
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
    return new RankColumn(id, rankDesc, this.sortHelper);
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
  private sortHelper = (ranking: RankColumn) => {
    this.sort(ranking);
  };
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
    return new RankColumn(id, rankDesc, this.sortHelper);
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

interface ICellRenderer {
  render($col: d3.Selection<any>, col: Column, rows: any[], context: IRenderContext);
}

interface IRenderContext {
  rowScale(index: number) : number;
  rowX(index: number): number;
  rowHeight(index: number) : number;
  showValue(index: number): boolean;
  rowKey(d: any, i: number): string;

  renderer(col: Column): ICellRenderer;

  showStacked(col: StackColumn): boolean;
}

class StringCellRenderer implements ICellRenderer {
  render($col: d3.Selection<any>, col: StringColumn, rows: any[], context: IRenderContext) {
    var $rows = $col.datum(col).selectAll('text.text').data(rows, context.rowKey);
    $rows.enter().append('text').attr({
      'class': 'text',
      'clip-path': 'url(#clipCol'+col.id+')'
    });
    $rows.attr({
      x: (d, i) => context.rowX(i),
      y : (d, i) => context.rowScale(i)
    }).text((d) => col.getLabel(d));
    $rows.exit().remove();
  }
}
class RankCellRenderer implements ICellRenderer {
  render($col: d3.Selection<any>, col: StringColumn, rows: any[], context: IRenderContext) {
    var $rows = $col.datum(col).selectAll('text.rank').data(rows, context.rowKey);
    $rows.enter().append('text').attr({
      'class': 'rank'
    });
    $rows.attr({
      x: (d, i) => context.rowX(i),
      y : (d, i) => context.rowScale(i)
    }).text((d) => col.getLabel(d));
    $rows.exit().remove();
  }
}

class LinkCellRenderer extends StringCellRenderer {
  render($col: d3.Selection<any>, col: StringColumn, rows: any[], context: IRenderContext) {
    var $rows = $col.datum(col).selectAll('a.link').data(rows, context.rowKey);
    $rows.enter().append('a').attr({
      'class': 'link',
      'target': '_blank'
    }).append('text').attr({
      'class': 'text',
      'clip-path': 'url(#clipCol'+col.id+')'
    });
    $rows.attr({
      'xlink:href': (d) => d.desc.link,
    }).select('text').attr({
      x: (d, i) => context.rowX(i),
      y : (d, i) => context.rowScale(i)
    }).text((d) => col.getLabel(d));
    $rows.exit().remove();
  }
}

class NumberCellRenderer implements ICellRenderer {
  render($col: d3.Selection<any>, col: NumberColumn, rows: any[], context: IRenderContext) {
    var $rows = $col.datum(col).selectAll('rect.bar').data(rows, context.rowKey);
    $rows.enter().append('rect').attr({
      'class': 'bar',
      fill : col.color
    }).append('title');
    $rows.attr({
      x: (d, i) => context.rowX(i),
      y : (d, i) => context.rowScale(i),
      height: (d, i) => context.rowHeight(i),
      width: (d) => col.getWidth() * col.getValue(d)
    }).select('title').text((d) => col.getLabel(d));
    $rows.exit().remove();
  }
}

class StackedCellRenderer implements ICellRenderer {
  render($col: d3.Selection<any>, col: StackColumn, rows: any[], context: IRenderContext) {
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

    var $children = $group.selectAll('g.child').data(col.children);
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
          return -preChildren.reduce((prev, child) => prev + child.getWidth() * (1-child.getValue(rows[index])), 0);
        };
      }
      context.renderer(d).render(d3.select(this), d, rows, context);
    });
    $children.exit().remove();

    context.rowX = bak;
  }
}

class LineUpBody {
  constructor(private $root: d3.Selection<any>, private data: DataProvider, private argsortGetter : (ranking: RankColumn) => number[]) {

  }

  createContext(rankings: RankColumn[]) : IRenderContext{
    var data = this.data;
    return {
      rowKey : this.data.rowKey,
      rowScale(index: number) {
        return index * 20
      },
      rowX(index: number) {
        return 0;
      },
      rowHeight(index: number) {
        return 20
      },
      showValue(index: number) {
        return false;
      },
      renderer(col: Column) {
        return data.renderers[col.desc.type];
      },
      showStacked(col: StackColumn) {
        return false;
      }
    }
  }

  renderRankings(r: RankColumn[], shifts: any[], context: IRenderContext) {
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

    var $rows = $rankings.select('g.rows').selectAll('rect.row').data((d) => this.argsortGetter(d));
    $rows.enter().append('rect').attr({
      'class' : 'row',
      width: (d, i, j?) => shifts[j].width
    });
    $rows.attr({
      y : (data_index, i) => context.rowScale(i),
      height: (data_index, i) => context.rowHeight(i)
    });
    $rows.exit().remove();

    var $cols = $rankings.select('g.cols').selectAll('g.child').data((d) => [d].concat(d.children), (d) => d.id);
    $cols.enter().append('g').attr({
      'class': 'child'
    });
    $cols.attr({
      transform: (d, i, j?) => {
        return 'translate('+shifts[j].shifts[i]+',0)'
      }
    }).each(function(d, i, j?) {
      dataPromises[j].then((data) => {
        context.renderer(d).render(d3.select(this), d, data, context);
      })
    });
    $cols.exit().remove();


    $rankings.exit().remove();
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
    });
    $lines.attr({
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
          shift2 = [d].concat(d.children).map((o) => {
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
