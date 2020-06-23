import {withLineUp, waitReady, LineUpJSType} from './utils/lineup';
import {generateData} from './utils/data';
import {groupByString} from './utils/ui';

describe('restore_ranking', () => {
  let lineUpJS: LineUpJSType;
  const arr = generateData();
  let doc: Document;
  before(withLineUp((l, document) => {
    lineUpJS = l;
    doc = document;
  }));

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
