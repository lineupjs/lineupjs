/**
 * Created by bikramkawan on 19/12/2016.
 */
import * as d3 from 'd3';
import Column, {IColumnDesc, IStatistics} from './Column';
import ValueColumn from './ValueColumn';


export default class SmileColumn extends ValueColumn<number[] > {


  constructor(id: string, desc: any) {
    super(id, desc);

  }

  compare(a: any, b: any, aIndex: number, bIndex: number) {

    return (a - b);

  }



}
