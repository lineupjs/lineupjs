import {withLineUp, waitReady, LineUpJSType, LineUp} from './utils/lineup';
import {generateData} from './utils/data';
import {openMoreDialog, closeDialog} from './utils/ui';

describe('issue373', () => {
  let lineup: LineUp;
  let lineUpJS: LineUpJSType;
  before(withLineUp((l, document) => {
    lineUpJS = l;
    const arr = generateData({
      cat: 4,
    });

    const b = lineUpJS.builder(arr).deriveColumns();
    b.ranking(lineUpJS.buildRanking().column('_*').column('cat2').groupBy('cat', 'cat1'));
    lineup = b.build(document.body);
    waitReady(lineup);
  }));

  it('has proper width', () => {
    cy.get('.lu-header[data-type=aggregate]').then((d) => d.width()).should('be', 40);

    openMoreDialog('[data-type=categorical]', 'group');
    cy.get('.lu-dialog input[name=grouped][value=true]').click();
    closeDialog();

    cy.get('.lu-header[data-type=aggregate]').then((d) => d.width()).should('be', 60);

    openMoreDialog('[data-type=categorical]', 'group');
    cy.get('.lu-dialog input[name=grouped][value=false]').click();
    closeDialog();

    cy.get('.lu-header[data-type=aggregate]').then((d) => d.width()).should('be', 60);
  });
});
