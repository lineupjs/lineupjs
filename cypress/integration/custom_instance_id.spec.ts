import { withLineUp, waitReady, LineUpJSType, Taggle } from './utils/lineup';

describe('builder', () => {
  let lineup: Taggle;
  let lineUpJS: LineUpJSType;
  before(
    withLineUp((l, document) => {
      lineUpJS = l;
      const b = lineUpJS.builder([]);
      b.instanceId('custom-instance-id');
      b.build(document.body);
      waitReady(lineup);
    })
  );

  it('default', () => {
    cy.get('#lu-custom-instance-id'); // note the `lu-` prefix
  });
});
