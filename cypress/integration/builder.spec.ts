import {withLineUp, waitReady} from "./_lineup";

it('builder', withLineUp((LineUpJS, document) => {
  const arr = [];
  const cats = ['c1', 'c2', 'c3'];
  for (let i = 0; i < 100; ++i) {
    arr.push({
      s: 'Row ' + i,
      a: Math.random() * 10,
      cat: cats[Math.floor(Math.random() * 3)],
      // d: new Date(Date.now() - Math.floor(Math.random() * 1000000000000))
    });
  }
  // just JSON serializable?
  const lineup = LineUpJS.asTaggle(document.body, arr);
  waitReady(lineup);

  cy.get('.lu-stats strong').should('contain', '100');
}))
