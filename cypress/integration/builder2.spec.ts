import { LineUpJSType, waitReady, withLineUp, LineUp } from './utils/lineup';
import { generateData, DEFAULT_CATEGORIES } from './utils/data';

describe('builder2', () => {
  let lineup: LineUp;
  let lineUpJS: LineUpJSType;
  before(
    withLineUp((l, document) => {
      lineUpJS = l;
      const arr = generateData();

      const builder = lineUpJS.builder(arr);

      // manually define columns
      builder
        // .sidePanel(true, true)
        .column(lineUpJS.buildStringColumn('d').label('Label').alignment(lineUpJS.EAlignment.right).width(100))
        .column(lineUpJS.buildCategoricalColumn('cat', DEFAULT_CATEGORIES).color('green'))
        .column(lineUpJS.buildCategoricalColumn('cat2', DEFAULT_CATEGORIES).color('blue'))
        .column(lineUpJS.buildNumberColumn('a', [0, 10]).color('blue'));

      // and two rankings
      const ranking = lineUpJS
        .buildRanking()
        .supportTypes()
        .allColumns() // add all columns
        .groupBy('cat')
        .sortBy('a', 'desc')
        .impose('number', 'a', 'cat2'); // create composite column

      builder.defaultRanking().ranking(ranking);

      lineup = builder.build(document.body);
      waitReady(lineup);
    })
  );

  it('builder2', () => {
    cy.get('.lu-stats strong').should('contain', '100');
  });
});
