import {withLineUp, waitReady, LineUpJSType, LineUp} from './utils/lineup';
import {generateData} from './utils/data';
import {openMoreDialog, closeDialog, groupByString} from './utils/ui';

describe('pr275_sort_group', () => {
  let lineup: LineUp;
  let lineUpJS: LineUpJSType;
  before(withLineUp((l, document) => {
    lineUpJS = l;
    const arr = generateData();

    lineup = lineUpJS.asLineUp(document.body, arr);
    waitReady(lineup);
  }));

  it('has sort by', () => {
    groupByString();
    // open more menu
    openMoreDialog('[data-type=string]');

    cy.get('.lu-more-options .lu-action-sort-groups').click();

    // sort groups by
    cy.get('.lu-dialog input[name=sortorder][value=asc]').click();

    closeDialog();

    cy.get('.lu-renderer-string.lu-group').first().should('contain', 'Row 0, Row 3');
    cy.get('.lu-renderer-string.lu-group').last().should('contain', 'Row 2, Row 20');
  });
});
