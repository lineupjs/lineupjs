import {withLineUp, waitReady} from "./_lineup";
import {generateData, DEFAULT_CATEGORIES} from './_data';

it('builder2', withLineUp((LineUpJS, document) => {
  const arr = generateData({
    count: 10000,
    number: 2,
    cat: 1
  });
  cy.log('generated');

  const desc = [{
    label: 'Label',
    type: 'string',
    column: 'string'
  },
  {
    label: 'Number',
    type: 'number',
    column: 'number',
    domain: [0, 10]
  },
  {
    label: 'Number1',
    type: 'number',
    column: 'number1',
    domain: [0, 10]
  },
  {
    label: 'Cat',
    type: 'categorical',
    column: 'cat',
    categories: DEFAULT_CATEGORIES
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
  waitReady(instance).then(() => {
    expect(instance.data.getFirstRanking().getOrderLength()).to.eq(10000);
    expect(instance.data.getTotalNumberOfRows()).to.eq(10000);
  });
  cy.get('.lu-stats strong').should('contain', '10,000');
  cy.get('.lu-stats').should('contain', 'of 10,000 item');
}));
