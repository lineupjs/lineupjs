import { withLineUp, waitReady, LineUpJSType, LineUp } from './utils/lineup';
import { generateData } from './utils/data';
import { openMoreDialog, closeDialog, resetDialog } from './utils/ui';

describe('pr275_sort_group', () => {
  let lineup: LineUp;
  let lineUpJS: LineUpJSType;
  beforeEach(
    withLineUp((l, document) => {
      lineUpJS = l;
      const arr = generateData({
        string: 0,
        number: 1,
        date: 0,
        cat: 0,
      });
      lineup = lineUpJS.asLineUp(document.body, arr);
      waitReady(lineup);
    })
  );

  function openColorMappingDialog() {
    return openMoreDialog('[data-type=number]', 'color-mapping');
  }

  it('reset color mapping', () => {
    openColorMappingDialog().within(() => {
      // select another color
      cy.get('.lu-color-line:last .lu-checkbox-color:last').click();
    });
    closeDialog();

    openColorMappingDialog().within(() => {
      cy.get('.lu-color-line:last .lu-checkbox-color > input').last().should('be.checked');
      resetDialog();
      cy.get('.lu-color-line:first .lu-checkbox-color > input').first().should('be.checked');
    });
    closeDialog();
  });

  it('choose divergent color mapping', () => {
    openColorMappingDialog().within(() => {
      // select another color
      cy.get('[data-toggle]').contains('Diverging Color').click();
      cy.get('input[value="interpolateBrBG"]').check();
    });
    closeDialog();

    openColorMappingDialog().within(() => {
      cy.get('input[value="interpolateBrBG"]').should('be.checked');
      resetDialog();
    });
    closeDialog();
  });
});
