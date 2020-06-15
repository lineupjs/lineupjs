import {withLineUp, waitReady, LineUpJSType, LineUp} from './utils/lineup';
import {generateData} from './utils/data';
import {openMoreDialog, closeDialog, aggregateAll} from './utils/ui';

describe('pr275_sort_group', () => {
  let lineup: LineUp;
  let lineUpJS: LineUpJSType;
  before(withLineUp((l, document) => {
    lineUpJS = l;
    const arr = generateData();

    lineup = lineUpJS.asLineUp(document.body, arr);
    waitReady(lineup);
  }));

  function groupByString() {
    // open more menu
    openMoreDialog('[data-type=string]');
    // open group by dialog
    cy.get('.lu-more-options .lu-action-group').click();

    cy.get('.lu-dialog input[name=grouped][value=true]').click();
    cy.get('.lu-dialog textarea').type('Row 1\nRow2');
    closeDialog();
    aggregateAll();
  }

  it('has sort by', () => {
    groupByString();
    // open more menu
    openMoreDialog('[data-type=string]');

    cy.get('.lu-more-options .lu-action-sort-groups').click();

    // sort groups by
    cy.get('.lu-dialog input[name=sortorder][value=asc]').click();

    closeDialog();

    cy.get('.lu-renderer-string.lu-group').first().should('contain', 'Row 0, Row 2');
    cy.get('.lu-renderer-string.lu-group').last().should('contain', 'Row 1, Row 10');
  });
});
