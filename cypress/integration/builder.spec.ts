import { withLineUp, waitReady, LineUpJSType, Taggle } from './utils/lineup';
import { generateData } from './utils/data';

describe('builder', () => {
  let lineup: Taggle;
  let lineUpJS: LineUpJSType;
  before(
    withLineUp((l, document) => {
      lineUpJS = l;
      const arr = generateData();

      lineup = lineUpJS.asTaggle(document.body, arr);
      waitReady(lineup);
    })
  );

  it('default', () => {
    cy.get('.lu-stats strong').should('contain', '100');
  });

  it('filter', () => {
    cy.get('.lu-histogram-bin[data-cat=c1]').first().click();
    waitReady(lineup).then(() => {
      expect(lineup.data.getFirstRanking().getOrderLength()).to.eq(59);
    });
    cy.get('.lu-stats strong').should('contain', '59');
    cy.get('.lu-stats-reset').click();
    waitReady(lineup).then(() => {
      expect(lineup.data.getFirstRanking().getOrderLength()).to.eq(100);
    });
    cy.get('.lu-stats strong').should('contain', '100');
  });

  it('select1', () => {
    cy.get('.le-tr[data-i="0"]').first().click();
    cy.get('.lu-stats span').should('contain', '1 selected');
    cy.get('.le-tr[data-i="0"]').first().click();
    cy.get('.lu-stats').should('not.contain', '1 selected');
  });
});
