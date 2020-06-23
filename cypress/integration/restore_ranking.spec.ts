import {withLineUp, waitReady, LineUpJSType} from './utils/lineup';
import {generateData} from './utils/data';
import {openMoreDialog, closeDialog, aggregateAll} from './utils/ui';

describe('restore_ranking', () => {
  let lineUpJS: LineUpJSType;
  const arr = generateData();
  let doc: Document;
  before(withLineUp((l, document) => {
    lineUpJS = l;
    doc = document;
  }));

  function groupByString() {
    // open more menu
    openMoreDialog('[data-type=string]');
    // open group by dialog
    cy.get('.lu-more-options .lu-action-group').click();

    cy.get('.lu-dialog input[name=grouped][value=true]').click();
    cy.get('.lu-dialog textarea').type('Row 1\nRow 2');
    closeDialog();
    aggregateAll();
  }

  it('build and restore', () => {
    const lineup = lineUpJS.asLineUp(doc.body, arr);
    waitReady(lineup);
    groupByString()

    cy.get('.lu').then(() => {
      const dump = lineup.dump();

      lineup.destroy();
      const restored = lineUpJS.builder(arr).deriveColumns().restore(dump).build(doc.body);
      waitReady(restored);
    });


    cy.get('.lu-renderer-string.lu-group').first().should('contain', 'Row 0, Row 3');
    cy.get('.lu-renderer-string.lu-group').last().should('contain', 'Row 2, Row 20');
  });
});
