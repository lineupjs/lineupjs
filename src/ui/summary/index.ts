/**
 * Created by Samuel Gratzl on 25.07.2017.
 */
import {ISummaryFunction} from '../interfaces';
import summaryString from './string';
import summaryCategorical from './categorical';
import summaryNumerical from './number';
import summarySelection from './selection';
import summaryAggregation from './aggregation';

export const defaultSummaries: {[key: string]: ISummaryFunction} = {
  stringLike: summaryString,
  categoricalLike: summaryCategorical,
  numberLike: summaryNumerical,
  selection: summarySelection,
  aggregate: summaryAggregation
};
