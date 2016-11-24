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


  sum() {
    return (d3.sum(this.a_val) - d3.sum(this.b_val));
  }

  min() {
    return (d3.min(this.a_val) - d3.min(this.b_val));

  }


  max() {
    return (d3.max(this.a_val) - d3.max(this.b_val));
  }

  mean() {

    return (d3.mean(this.a_val) - d3.mean(this.b_val));
  }

  median() {
    this.a_val.sort(numberCompare);
    this.b_val.sort(numberCompare);
    return (getPercentile(this.a_val, 50)) - (getPercentile(this.b_val, 50));

  }


  q1() {

    return (getPercentile(this.a_val, 25)) - (getPercentile(this.b_val, 25));

  }

  q3() {

    return (getPercentile(this.a_val, 75)) - (getPercentile(this.b_val, 75));

  }

  countcategory() {

    const a_cat = this.a_val.filter((x)=> x === 1).length;

    const b_cat = this.b_val.filter((x)=> x === 1).length;

    return (a_cat - b_cat);

  }

}

export default class VerticalColumn  extends ValueColumn<number[] > {
 private sortCriteria;
  constructor(id: string, desc: any) {
    super(id, desc);
     this.sortCriteria = (<any>desc).sort || 'min';
  }

   compare(a: any, b: any, aIndex: number, bIndex: number) {
     this.sortCriteria = (<any>this.desc).sort;
     const a_val =this.getValue(a, aIndex);
     const b_val = this.getValue(b, bIndex);
      var sort: any = new CustomSortCalculation(a_val, b_val);
    const f = sort[this.sortCriteria].bind(sort);
    return f();
  }

}
