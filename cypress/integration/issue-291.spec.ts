import {setupLineUp, waitReady} from './utils/lineup';
import {generateData, DEFAULT_CATEGORIES} from './utils/data';

describe('issue #291', () => {
  it('item sorting influences group sorting', async () => {
    // LineUpJS
    const {LineUpJS, document} = await setupLineUp();

    const arr = generateData({
      cat: 2
    });

    const builder = LineUpJS.builder(arr);

    // manually define columns
    builder
      .column(LineUpJS.buildStringColumn('string').width(100))
      .column(LineUpJS.buildCategoricalColumn('cat', DEFAULT_CATEGORIES))
      .column(LineUpJS.buildCategoricalColumn('cat1', DEFAULT_CATEGORIES))
      .column(LineUpJS.buildNumberColumn('number', [0, 10]));

    // and two rankings
    const ranking = LineUpJS.buildRanking()
      .supportTypes()
      .allColumns() // add all columns
      .groupBy('cat')
      .groupBy('cat1')
      .sortBy('number', 'desc')
      .groupSortBy('cat', 'desc')
      .groupSortBy('cat1', 'desc');

    builder.ranking(ranking);

    const l = builder.build(document.body);
    waitReady(l);

    // sort items ascending
    cy.get('section[data-type="number"] > .lu-toolbar > i.lu-action.lu-action-sort').click();
    waitReady(l);

    // get first item of ranking
    cy.get('.le-tr[data-index="0"] > [data-renderer="string"]').should('contain', 'Row 97');
  });
});
