declare type LineUpJSType = typeof import('../..');
import {LineUp, Taggle} from '../../';

export function setupLineUp() {
  // LineUpJS
  return new Promise<{LineUpJS: LineUpJSType, document: Document}>((resolve) => {
    cy.visit('/cypress/index.html').then((win) => {
      const LineUpJS: LineUpJSType = (win as any).LineUpJS;
      const doc = win.document;
      resolve({LineUpJS, document: doc});

    });
  });
}

export function withLineUp(test: (LineUpJS: LineUpJSType, document: Document) => any) {
  return () => {
    setupLineUp().then(({LineUpJS, document}) => test(LineUpJS, document))
  };
}

export function waitReady(lineup: LineUp | Taggle) {
  lineup.data.on('busy', (busy) => {
    setTimeout(() => {
      if (!busy) {
        lineup.node.dataset.ready = '';
      } else {
        delete lineup.node.dataset.ready;
      }
    });
  })
  cy.get('.lu[data-ready]').should('have.class', 'lu');
}
