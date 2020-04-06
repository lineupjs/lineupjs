import {setupLineUp, waitReady} from './utils/lineup';
import {generateData, DEFAULT_CATEGORIES} from './utils/data';

it('builder2', async () => {
  // LineUpJS
  const {LineUpJS, document} = await setupLineUp();

  const arr = generateData({
    cat: 2
  });
  const builder = LineUpJS.builder(arr);

  // manually define columns
  builder
    .sidePanel(true, true)
    .column(LineUpJS.buildStringColumn('d').label('Label').alignment(LineUpJS.EAlignment.right).width(100))
    .column(LineUpJS.buildCategoricalColumn('cat', DEFAULT_CATEGORIES).color('green'))
    .column(LineUpJS.buildCategoricalColumn('cat2', DEFAULT_CATEGORIES).color('blue'))
    .column(LineUpJS.buildNumberColumn('a', [0, 10]).color('blue'));

  // and two rankings
  const ranking = LineUpJS.buildRanking()
    .supportTypes()
    .allColumns() // add all columns
    .groupBy('cat')
    .sortBy('a', 'desc')
    .impose('number', 'a', 'cat2'); // create composite column

  builder
    .defaultRanking()
    .ranking(ranking);

  const l = builder.build(document.body);
  waitReady(l);
});
