import {withLineUp, waitReady, LineUpJSType, LineUp} from './utils/lineup';
import {generateData} from './utils/data';
import {openMoreDialog, closeDialog, resetDialog} from './utils/ui';

describe('pr292_data_mapping', () => {
  let lineup: LineUp;
  let lineUpJS: LineUpJSType;
  before(withLineUp((l, document) => {
    lineUpJS = l;
    const arr = generateData({
      number: 1,
      string: 0,
      date: 0,
      cat: 0
    });

    lineup = lineUpJS.asLineUp(document.body, arr);
    waitReady(lineup);
  }));

  function openDataMappingDialog() {
    // open more menu
    return openMoreDialog('[data-type=number]', 'data-mapping');
  }

  it('reset domain value', () => {
    openDataMappingDialog().within(() => {
      cy.get('input[type=number]:first').invoke('val', '0.2');
      resetDialog();
      cy.get('input[type=number]:first').should('not.have.value', '0.2');
    });
    closeDialog('cancel');
  });
});
