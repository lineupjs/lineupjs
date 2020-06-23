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
    const logs: {
      ranking: number,
      group: string | string[],
      topN: any;
    }[] = [];

    // persist aggregation state in logs
    data.on('aggregate', (r, g, value, state) => {
      console.log('on aggregate', r, g, value, state);
      logs.push({
        ranking: data.getRankings().indexOf(r),
        group: Array.isArray(g) ? g.map((g) => g.name) : g.name,
        topN: state,
      });
    });

    groupByString();

    cy.get('.lu-renderer-string.lu-group').first().should('contain', 'Row 0, Row 3');
    cy.get('.lu-renderer-string.lu-group').last().should('contain', 'Row 2, Row 20');

    // store current aggregation state (to test correct restore)
    let old: any[];
    cy.get('.lu').wait(200).then(() => {
      const r = data.getFirstRanking();
      old = r.getGroups().map((g) => data.getAggregationState(r, g));

      data.clearRankings();
      data.deriveDefault();
    });

    groupByString(false); // don't aggregate
  
    // restore aggregation state from logs
    cy.get('.lu').wait(200).then(() => {
      console.log('logs', logs);
      logs.forEach((log) => {
        const ranking = data.getRankings()[log.ranking];
        if (Array.isArray(log.group)) {
          const groups = ranking.getGroups().filter((g) => log.group.includes(g.name));
          console.log('groups', groups);
          for (const group of groups) {
            data.setTopNAggregated(ranking, group, log.topN);
          }
        } else {
          const group = ranking.getGroups().find((g) => g.name == log.group);
          if (group) {
            data.setTopNAggregated(ranking, group, log.topN);
          }
        }
      });

      // test aggregation state after restore
      const r = data.getFirstRanking();
      expect(r.getGroups().map((g) => data.getAggregationState(r, g))).to.members(old);
    });

    cy.get('.lu-renderer-string.lu-group').first().should('contain', 'Row 0, Row 3');
    cy.get('.lu-renderer-string.lu-group').last().should('contain', 'Row 2, Row 20');
  });
});
