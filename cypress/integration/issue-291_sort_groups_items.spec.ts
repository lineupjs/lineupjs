import {withLineUp, waitReady, LineUpJSType, LineUp} from './utils/lineup';
import {generateData} from './utils/data';

describe('issue #291', () => {
  let lineup: LineUp;
  let lineUpJS: LineUpJSType;
  before(withLineUp((l, document) => {
    lineUpJS = l;
    const arr = generateData({
      cat: 2
    });

    const builder = lineUpJS.builder(arr).deriveColumns().deriveColors();

    const ranking = lineUpJS.buildRanking()
      .aggregate()
      .allColumns() // add all columns
      .groupBy('cat')
      .groupBy('cat1')
      .sortBy('number', 'desc')
      .groupSortBy('cat', 'desc')
      .groupSortBy('cat1', 'desc');
    builder.ranking(ranking);

    lineup = builder.build(document.body);

    waitReady(lineup);
  }));

  it('item sorting influences group sorting', () => {
    cy.get('.le-tr[data-index="0"] > .lu-renderer-categorical').should('contain', 'c3');
    cy.get('.le-tr[data-index="0"] > .lu-renderer-string').should('contain', 'Row 62');

    // sort items ascending
    cy.get('.lu-header[data-type=number] .lu-action-sort').click();
    waitReady(lineup);

    // still c3,c3 group the first one but item order changed
    cy.get('.le-tr[data-index="0"] > .lu-renderer-categorical').should('contain', 'c3');
    cy.get('.le-tr[data-index="0"] > .lu-renderer-string').should('contain', 'Row 97');
  });
});
