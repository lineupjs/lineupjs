import {build, buildString, buildCategorical, buildNumber, buildHierarchy, buildDate} from './column';
import {} from './lineup';
import {equal, isTypeInstance} from './utils';
import {} from './ranking';

export {} from './column';
export {} from './lineup';
export {} from './ranking';

export const builderAdapter = {
  columnDefault: build,
  columnString: buildString,
  columnCategorical: buildCategorical,
  columnNumber: buildNumber,
  columnHierarchy: buildHierarchy,
  columnDate: buildDate,
  equal,
  isTypeInstance,

};
