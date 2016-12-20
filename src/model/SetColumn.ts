/**
 * Created by bikramkawan on 24/11/2016.
 */
import * as d3 from 'd3';
import Column, {IColumnDesc, IStatistics} from './Column';
import ValueColumn from './ValueColumn';


export default class SetColumn extends ValueColumn<number[] > {
  private datalength;
  private Constant;

  constructor(id: string, desc: any) {
    super(id, desc);
    this.datalength = (<any>desc.dataLength);
    this.Constant = 1;

  }

  compare(a: any, b: any, aIndex: number, bIndex: number) {

    const a_val = this.getValue(a, aIndex);
    const b_val = this.getValue(b, bIndex);
    const a_cat = a_val.filter((x)=> x === 1).length;
    const b_cat = b_val.filter((x)=> x === 1).length;
    return (a_cat - b_cat);

  }


  cellDimension() {

    return (this.getWidth() / this.datalength);
  }

  calculatePath(data) {


    var catindexes = [];
    data.forEach((d, i) => (d === this.Constant) ? catindexes.push(i) : -1);


    const left_x = ((d3.min(catindexes) * this.cellDimension()) + (this.cellDimension() / 2));
    const right_x = ((d3.max(catindexes) * this.cellDimension()) + (this.cellDimension() / 2));

    const pathdata = {left: left_x, right: right_x};

    return pathdata;


  }

  getConstantValue() {
    return this.Constant;

  }


}
