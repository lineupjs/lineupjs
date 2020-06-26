import {withLineUp, waitReady, LineUpJSType, LineUp} from './utils/lineup';
import {generateData} from './utils/data';
import {groupByString} from './utils/ui';
// import {aggregateAll} from './utils/ui';

describe('restore_aggregation_state', () => {
  let lineup: LineUp;
  let lineUpJS: LineUpJSType;
  let logs: {
    ranking: number,
    group: string | string[],
    previous: number | number[],
    current: number;
  }[] = [];

  function restoreLogs() {
    const data = lineup.data;
    logs.forEach((log) => {
      const ranking = data.getRankings()[log.ranking];
      if (Array.isArray(log.group)) {
        const groups = ranking.getFlatGroups().filter((d) => log.group.includes(d.name));
        data.setTopNAggregated(ranking, groups, log.current);
      } else {
        const group = ranking.getFlatGroups().find((d) => d.name === log.group);
        if (group) {
          data.setTopNAggregated(ranking, group, log.current);
        }
      }
    });
  }

  before(withLineUp((l, document) => {
    lineUpJS = l;
    const arr = generateData({
      cat: 2,
      categories: ['c1', 'c2'],
      count: 25,
      missingString: 0.1,
    });

    lineup = lineUpJS.builder(arr).deriveColumns().deriveColors().animated(false).build(document.body);

    // persist aggregation state in logs
    lineup.data.on('aggregate', (r, g, previous, current) => {
      console.log('on aggregate', r, g, previous, current);
      logs.push({
        ranking: lineup.data.getRankings().indexOf(r),
        group: Array.isArray(g) ? g.map((g) => g.name) : g.name,
        previous,
        current,
      });
    });
    waitReady(lineup);
  }));
  beforeEach(() => {
    logs = [];
  });
  afterEach(() => {
    lineup.data.clearRankings();
    lineup.data.deriveDefault();
  })

  it('build and restore', () => {
    const data = lineup.data;
    groupByString();

    cy.get('.lu-renderer-string.lu-group').first().should('be', '');
    cy.get('.lu-renderer-string.lu-group').eq(1).should('contain', 'Row 0, Row 3');
    cy.get('.lu-renderer-string.lu-group').last().should('contain', 'Row 2, Row 20');

    // store current aggregation state (to test correct restore)
    let old: any[];
    cy.get('.lu').wait(200).then(() => {
      const r = data.getFirstRanking();
      old = r.getFlatGroups().map((g) => data.getAggregationState(r, g));

      data.clearRankings();
      data.deriveDefault();
    });

    groupByString(false); // don't aggregate

    // restore aggregation state from logs
    cy.get('.lu').wait(200).then(() => {
      console.log('logs', logs);
      restoreLogs();

      // test aggregation state after restore
      const r = data.getFirstRanking();
      expect(r.getFlatGroups().map((g) => data.getAggregationState(r, g))).to.members(old);
    });

    cy.get('.lu-renderer-string.lu-group').first().should('be', '');
    cy.get('.lu-renderer-string.lu-group').eq(1).should('contain', 'Row 0, Row 3');
    cy.get('.lu-renderer-string.lu-group').last().should('contain', 'Row 2, Row 20');
  });


  it('build and restore multi', () => {
    // const data = lineup.data;
    cy.get('[data-type=categorical] .lu-action-group').first().click();
    cy.get('body').type('{ctrl}', {release: false});
    cy.get('[data-type=categorical] .lu-action-group').last().click({});
    cy.get('body').type('{ctrl}');

    // click top level of group 1
    cy.wait(100).get('.lu-agg-level.lu-agg-expand').first().click();
    cy.get('.lu-renderer-string.lu-group').first().should('contain', 'Row 8, Row 13');
    // click 2nd level of group 2
    cy.wait(100).get('.lu-agg-level.lu-agg-expand[data-level="0"]').eq(1).click();
    cy.get('.lu-renderer-string.lu-group').eq(1).should('contain', 'Row 0, Row 1');

    const data = lineup.data;
    // store current aggregation state (to test correct restore)
    let old: any[];
    cy.get('.lu').then(() => {
      const r = data.getFirstRanking();
      old = r.getFlatGroups().map((g) => data.getAggregationState(r, g));

      // clear and rebuild
      data.clearRankings();
      data.deriveDefault();
    });

    cy.wait(100).get('[data-type=categorical] .lu-action-group').first().click();
    cy.get('body').type('{ctrl}', {release: false});
    cy.get('[data-type=categorical] .lu-action-group').last().click({});
    cy.get('body').type('{ctrl}');

    cy.get('.lu').then(() => {
      restoreLogs();
      // test aggregation state after restore
      const r = data.getFirstRanking();
      expect(r.getFlatGroups().map((g) => data.getAggregationState(r, g))).to.members(old);
    });
    cy.wait(100).get('.lu-renderer-string.lu-group').first().should('contain', 'Row 8, Row 13');
    cy.get('.lu-renderer-string.lu-group').eq(1).should('contain', 'Row 0, Row 1');
  });
});
