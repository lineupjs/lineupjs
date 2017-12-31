import {ISummaryRenderer} from '../interfaces';
import aggregate from './aggregation';
import summaryCategorical from './categorical';
import hierarchy from './hierarchy';
import summaryNumerical from './number';
import selection from './selection';
/**
 * Created by Samuel Gratzl on 25.07.2017.
 */
import summaryString from './string';

export const defaultSummaries: { [key: string]: ISummaryRenderer<any> } = {
  stringLike: summaryString,
  categoricalLike: summaryCategorical,
  numberLike: summaryNumerical,
  selection,
  hierarchy,
  aggregate
};
