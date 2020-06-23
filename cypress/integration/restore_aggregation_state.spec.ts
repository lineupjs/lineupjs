import {withLineUp, waitReady, LineUpJSType, LineUp} from './utils/lineup';
import {generateData} from './utils/data';
import {groupByString} from './utils/ui';

describe('restore_aggregation_state', () => {
  let lineup: LineUp;
  let lineUpJS: LineUpJSType;

  before(withLineUp((l, document) => {
    lineUpJS = l;
    const arr = generateData();

    lineup = lineUpJS.asLineUp(document.body, arr);
    waitReady(lineup);
  }));

  it('build and restore', () => {
    const data = lineup.data;
    const log: {
      ranking: number,
      group: string | string[],
      topN: any;
    }[] = [];
    data.on('aggregate', (r, g, value, state) => {
      console.log(r, g, value, state);
      log.push({
        ranking: data.getRankings().indexOf(r),
        group: Array.isArray(g) ? g.map((g) => g.name) : g.name,
        topN: state,
      });
    })
    groupByString();
    cy.get('.lu-renderer-string.lu-group').first().should('contain', 'Row 0, Row 3');
    cy.get('.lu-renderer-string.lu-group').last().should('contain', 'Row 2, Row 20');

    let old: any[];
    cy.get('.lu').wait(200).then(() => {
      const r = data.getFirstRanking();
      old = r.getGroups().map((g) => data.getAggregationState(r, g));

      lineup.data.clearRankings();
      lineup.data.deriveDefault();
    });
    groupByString(false); // don't aggregate
  
    cy.get('.lu').wait(200).then(() => {
      log.forEach((l) => {
        const r = lineup.data.getRankings()[l.ranking];
        if (Array.isArray(l.group)) {
          const groups = r.getGroups().filter((g) => l.group.includes(g.name));
          console.log(groups);
          for (const g of groups) {
            lineup.data.setTopNAggregated(r, g, l.topN);
          }
        } else {
          const group = r.getGroups().find((g) => g.name == l.group);
          if (group) {
            lineup.data.setTopNAggregated(r, group, l.topN);
          }
        }
      });
      const r = data.getFirstRanking();
      expect(r.getGroups().map((g) => data.getAggregationState(r, g))).to.members(old);      
    })
    cy.get('.lu-renderer-string.lu-group').first().should('contain', 'Row 0, Row 3');
    cy.get('.lu-renderer-string.lu-group').last().should('contain', 'Row 2, Row 20');
  });
});
