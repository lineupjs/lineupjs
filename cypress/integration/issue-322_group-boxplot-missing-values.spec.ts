import { withLineUp, waitReady, LineUpJSType, LineUp } from './utils/lineup';
import { aggregateAll } from './utils/ui';
// import {generateData} from './utils/data';

describe('issue 322', () => {
  let lineup: LineUp;
  let lineUpJS: LineUpJSType;
  before(
    withLineUp((l, document) => {
      lineUpJS = l;

      const arr = [
        { string: 'Row 0', number: NaN, cat: 'c1' }, // missing value for number column
      ];

      const builder = lineUpJS.builder(arr).deriveColumns().deriveColors();

      const ranking = lineUpJS
        .buildRanking()
        .aggregate()
        .allColumns() // add all columns
        .groupBy('cat')
        .groupSortBy('cat', 'desc');

      builder.ranking(ranking);

      lineup = builder.build(document.body);

      waitReady(lineup);
    })
  );

  it('Check for .lu-missing in boxplot renderer', () => {
    aggregateAll();

    cy.wait(200)
      .get('.le-tr[data-index="0"] > .lu-renderer-boxplot[data-group="g"]')
      .wait(200)
      .should('have.class', 'lu-missing');
  });
});
