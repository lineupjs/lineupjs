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

export default class DataValueSizeColumn extends ValueColumn<number> {

  constructor(id: string, desc: any) {
    super(id, desc);

  }

  compare(a: any, b: any, aIndex: number, bIndex: number) {
    return numberCompare(this.getValue(a, aIndex), this.getValue(b, bIndex));
  }

}
