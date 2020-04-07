import {withLineUp, waitReady, LineUpJSType, LineUp} from './utils/lineup';
import {generateData} from './utils/data';
import {openMoreDialog, closeDialog, resetDialog} from './utils/ui';

describe('pr275_sort_group', () => {
  let lineup: LineUp;
  let lineUpJS: LineUpJSType;
  before(withLineUp((l, document) => {
    lineUpJS = l;
    const arr = generateData({
      string: 0,
      number: 1,
      date: 0,
      cat: 0
    });
    lineup = lineUpJS.asLineUp(document.body, arr);
    waitReady(lineup);
  }));

  function openColorMappingDialog() {
    // open more menu
    openMoreDialog('[data-type=number]');
    // open group by dialog
    cy.get('.lu-more-options .lu-action-color-mapping').click();
    cy.get('.lu-dialog').last().as('dialog');
  }

  it('reset color mapping', () => {
    openColorMappingDialog();
    // select another color
    cy.get('@dialog').get('.lu-color-line:last .lu-checkbox-color:last').click();
    closeDialog();

    openColorMappingDialog();
    cy.get('@dialog').get('.lu-color-line:last .lu-checkbox-color > input').last().should('be.checked');
    resetDialog();
    cy.get('@dialog').get('.lu-color-line:first .lu-checkbox-color > input').first().should('be.checked');
    closeDialog();
  });

  it('choose divergent color mapping', () => {
    openColorMappingDialog();
    // select another color
    cy.get('@dialog').contains('Diverging Color').click();
    cy.get('@dialog').get('input[value="interpolateBrBG"]').check();
    closeDialog();

    openColorMappingDialog();
    cy.get('@dialog').get('input[value="interpolateBrBG"]').should('be.checked');
    resetDialog();
    closeDialog();
  });
});
