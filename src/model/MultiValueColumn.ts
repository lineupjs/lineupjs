/**
 * Created by bikramkawan on 24/11/2016.
 */
import * as d3 from 'd3';
import Column, {IColumnDesc, IStatistics} from './Column';
import ValueColumn from './ValueColumn';


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
    return (d3.median(this.a_val)) - (d3.median(this.b_val));

  }

  q1() {

    return (d3.quantile(this.a_val, 0.25)) - (d3.quantile(this.b_val, 0.25));

  }

  q3() {

    return (d3.quantile(this.a_val, 0.75)) - (d3.quantile(this.b_val, 0.75));

  }
}

export default class MultiValueColumn extends ValueColumn<number[] > {
  private sortCriteria;

  constructor(id: string, desc: any) {
    super(id, desc);
    this.sortCriteria = (<any>desc).sort || 'min';
  }

  compare(a: any, b: any, aIndex: number, bIndex: number) {
    this.sortCriteria = (<any>this.desc).sort;
    const a_val = this.getValue(a, aIndex);
    const b_val = this.getValue(b, bIndex);
    var sort: any = new CustomSortCalculation(a_val, b_val);
    const f = sort[this.sortCriteria].bind(sort);
    return f();
  }

}
