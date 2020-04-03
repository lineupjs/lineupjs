import {withLineUp, waitReady, LineUpJSType, Taggle} from './_lineup';
import {generateData} from './_data';

describe('builder', () => {
  let lineup: Taggle;
  let LineUpJS: LineUpJSType;
  before(withLineUp((l, document) => {
    LineUpJS = l;
    const arr = generateData();

    lineup = LineUpJS.asTaggle(document.body, arr);
    waitReady(lineup);
  }));

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
    cy.get('.lu-stats span').should('not.contain', '1 selected');
  });
});
