import {withLineUp, waitReady} from "./_lineup";

it('builder2', withLineUp((LineUpJS, document) => {
  const arr = [];
  const cats = ['c1', 'c2', 'c3'];
  const cat2 = ['a1', 'a2'];
  const size = 10000;
  for (let i = 0; i < size; ++i) {
    arr.push({
      label: 'Row ' + i,
      number: Math.random() * 10,
      number2: Math.random() * 10,
      cat: cats[Math.floor(Math.random() * cats.length)],
      cat2: cat2[Math.floor(Math.random() * cat2.length)],
      date: new Date(Date.now() - Math.floor(Math.random() * 1000000000000))
    })
  }
  cy.log('generated');

  const desc = [{
    label: 'Label',
    type: 'string',
    column: 'label'
  },
  {
    label: 'Number',
    type: 'number',
    column: 'number',
    domain: [0, 10]
  },
  {
    label: 'Number2',
    type: 'number',
    column: 'number2',
    domain: [0, 10]
  },
  {
    label: 'Cat',
    type: 'categorical',
    column: 'cat',
    categories: ['c1', 'c2', 'c3']
  },
  {
    label: 'Cat2',
    type: 'categorical',
    column: 'cat2',
    categories: [{
      name: 'a1',
      label: 'A1',
      color: 'green'
    }, {
      name: 'a2',
      label: 'A2',
      color: 'blue'
    }]
  },
  {
    label: 'Date',
    type: 'date',
    column: 'date'
  },
  ];
  LineUpJS.deriveColors(desc);

  const p = new LineUpJS.LocalDataProvider(arr, desc, {
    // taskExecutor: 'direct',
    taskExecutor: 'scheduled'
  });
  p.deriveDefault();

  const instance = new LineUpJS.Taggle(document.body, p, {
    animated: false
  });
  waitReady(instance);

  cy.get('.lu-stats strong').should('contain', '10,000');
}));
