declare type LineUpJSType = typeof import('../..');

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
  return () => setupLineUp().then(({LineUpJS, document}) => test(LineUpJS, document));
}
