/**
 * Created by Samuel Gratzl on 25.07.2017.
 */
import summaryString from './string';
import summaryCategorical from './categorical';
import summaryNumerical from './number';
import selection from './selection';
import aggregate from './aggregation';
import hierarchy from './hierarchy';
import { ISummaryRenderer } from './interfaces';

export const defaultSummaries: {[key: string]: ISummaryRenderer<any>} = {
  stringLike: summaryString,
  categoricalLike: summaryCategorical,
  numberLike: summaryNumerical,
  selection,
  hierarchy,
  aggregate
};
