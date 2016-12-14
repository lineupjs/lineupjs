/**
 * Created by bikramkawan on 24/11/2016.
 */
import * as d3 from 'd3';
import Column, {IColumnDesc, IStatistics} from './Column';
import ValueColumn from './ValueColumn';


export function numberCompare(a: number, b: number) {
  if (isNaN(a)) { //NaN are bigger
    return isNaN(b) ? 0 : +1;
  }
  if (isNaN(b)) {
    return -1;
  }
  return a - b;
}

// Calculate Median, Q1 and Q1)
export function getPercentile(data, percentile) {

  var index = (percentile / 100) * data.length;
  var result;
  if (Math.floor(index) === index) {
    result = (data[(index - 1)] + data[index]) / 2;
  } else {
    result = data[Math.floor(index)];
  }
  return result;
}

export class CustomSortCalculation {

  constructor(private a_val: number[], private b_val: number []) {
    this.b_val = b_val;
    this.a_val = a_val;
  }

  countcategory() {

    const a_cat = this.a_val.filter((x)=> x === 1).length;

    const b_cat = this.b_val.filter((x)=> x === 1).length;

    return (a_cat - b_cat);

  }

}

export default class UpsetColumn extends ValueColumn<number[] > {
  private sortCriteria;
  private datalength;

  constructor(id: string, desc: any) {
    super(id, desc);
    this.sortCriteria = (<any>desc).sort || 'min';
    this.datalength = (<any>desc.dataLength);

  }

  compare(a: any, b: any, aIndex: number, bIndex: number) {
    this.sortCriteria = (<any>this.desc).sort;
    const a_val = this.getValue(a, aIndex);
    const b_val = this.getValue(b, bIndex);
    var sort: any = new CustomSortCalculation(a_val, b_val);
    const f = sort[this.sortCriteria].bind(sort);
    return f();
  }


  cellDimension() {

    return (this.getWidth() / this.datalength);
  }

  calculatePath(data) {

    var catindexes = [];
    catindexes.push(data.reduce(function (b, e, i) {
      if (e === 1) {
        b.push(i);
      }
      return b;
    }, []));

    const left_x = ((d3.min(catindexes[0]) * this.cellDimension()) + (this.cellDimension() / 2));
    const right_x = ((d3.max(catindexes[0]) * this.cellDimension()) + (this.cellDimension() / 2));

    const pathdata = {left: left_x, right: right_x};

    return pathdata;


  }


}
