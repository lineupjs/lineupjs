/**
 * Created by bikramkawan on 24/11/2016.
 */

import {scale, format} from 'd3';
import Column, {IColumnDesc, IStatistics} from './Column';
import ValueColumn from './ValueColumn';

/**
 * a string column in which the label is a text but the value a link
 */
export default class ThresholdColumn  extends ValueColumn<number[] > {

  constructor(id: string, desc: any) {
    super(id, desc);

  }

}
