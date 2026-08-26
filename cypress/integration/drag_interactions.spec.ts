import { withLineUp, waitReady, LineUpJSType, LineUp } from './utils/lineup';
import { generateData } from './utils/data';
import { openMoreDialog, closeDialog } from './utils/ui';

/**
 * Simulate a pointer drag using the Pointer Events API.
 *
 * Fires `pointerdown` on the target element, then a sequence of `pointermove`
 * events and finally `pointerup` on the AUT document — matching the
 * capture-phase document listeners used by `dragHandle` (drag.ts) and
 * `dragWidth` (header.ts).
 *
 * The AUT window's own `PointerEvent` constructor is used (retrieved via
 * `cy.window()`) to avoid cross-frame prototype issues.  `pointerType: 'touch'`
 * is used so that `dragHandle`'s mouse-only filter guard is bypassed.
 */
function pointerDrag(selector: string, deltaX: number, deltaY = 0): void {
  // Capture the AUT window before querying any elements.
  let win: Cypress.AUTWindow;
  cy.window().then((w) => {
    win = w;
  });

  cy.get(selector)
    .first()
    .then(($el) => {
      const el = $el[0];
      const rect = el.getBoundingClientRect();
      const startX = rect.left + rect.width / 2;
      const startY = rect.top + rect.height / 2;

      const pointerId = 1;
      // Use 'touch' pointer type so dragHandle skips the mouse-only filter.
      const pointerOpts = {
        pointerId,
        pointerType: 'touch',
        button: 0,
        buttons: 1,
        bubbles: true,
        cancelable: true,
        isPrimary: true,
      };

      // Use the AUT frame's PointerEvent constructor to avoid cross-frame issues.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const PE = (win as any).PointerEvent as typeof PointerEvent;

      // pointerdown on the handle itself
      el.dispatchEvent(new PE('pointerdown', { ...pointerOpts, clientX: startX, clientY: startY }));

      // pointermove on the document (capture-phase listener)
      const steps = 5;
      for (let i = 1; i <= steps; i++) {
        el.ownerDocument!.dispatchEvent(
          new PE('pointermove', {
            ...pointerOpts,
            clientX: startX + (deltaX * i) / steps,
            clientY: startY + (deltaY * i) / steps,
          })
        );
      }

      // pointerup on the document (capture-phase listener)
      el.ownerDocument!.dispatchEvent(
        new PE('pointerup', { ...pointerOpts, clientX: startX + deltaX, clientY: startY + deltaY })
      );
    });
}

// -------------------------------------------------------------------------
// Column-width resize handle
// Each group uses its own `before(withLineUp(...))` for an isolated page so
// that state changes in one group cannot affect another.
// -------------------------------------------------------------------------
describe('drag_interactions - column width resize', () => {
  let lineup: LineUp;
  let lineUpJS: LineUpJSType;

  before(
    withLineUp((l, document) => {
      lineUpJS = l;
      const arr = generateData({ number: 1, string: 0, cat: 0 });
      lineup = lineUpJS.asLineUp(document.body, arr);
      waitReady(lineup);
    })
  );

  it('increases column width when dragging handle to the right', () => {
    let initialWidth = 0;
    // Read width from the column model — style.width is cleared on pointerup
    // so getBoundingClientRect() can transiently return 0 in headless CI.
    cy.then(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const numCol = (lineup.data.getFirstRanking() as any).flatColumns.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (c: any) => c.desc.type === 'number'
      );
      initialWidth = numCol.getWidth() as number;
    });
    pointerDrag('.le-th[data-type=number] .lu-handle', 60);
    cy.then(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const numCol = (lineup.data.getFirstRanking() as any).flatColumns.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (c: any) => c.desc.type === 'number'
      );
      expect(numCol.getWidth()).to.be.greaterThan(initialWidth);
    });
  });

  it('decreases column width when dragging handle to the left', () => {
    let initialWidth = 0;
    cy.then(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const numCol = (lineup.data.getFirstRanking() as any).flatColumns.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (c: any) => c.desc.type === 'number'
      );
      initialWidth = numCol.getWidth() as number;
    });
    pointerDrag('.le-th[data-type=number] .lu-handle', -40);
    cy.then(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const numCol = (lineup.data.getFirstRanking() as any).flatColumns.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (c: any) => c.desc.type === 'number'
      );
      expect(numCol.getWidth()).to.be.lessThan(initialWidth);
    });
  });
});

// -------------------------------------------------------------------------
// Histogram min/max filter handles
// -------------------------------------------------------------------------
describe('drag_interactions - histogram filter handles', () => {
  let lineup: LineUp;
  let lineUpJS: LineUpJSType;

  before(
    withLineUp((l, document) => {
      lineUpJS = l;
      const arr = generateData({ number: 1, string: 0, cat: 0 });
      lineup = lineUpJS.asLineUp(document.body, arr);
      waitReady(lineup);
    })
  );

  // Open and close the filter dialog within each test so that test isolation
  // is guaranteed regardless of column-width state from a prior describe block.

  it('moves the min filter handle when dragged to the right', () => {
    openMoreDialog('[data-type=number]', 'filter');
    let initialWidth = '';
    cy.get('.lu-histogram-min').first().then(($el) => {
      initialWidth = ($el[0] as HTMLElement).style.width;
    });
    pointerDrag('.lu-histogram-min', 30);
    // Use .should() so Cypress retries until the style is updated.
    cy.get('.lu-histogram-min').first().should(($el) => {
      expect(($el[0] as HTMLElement).style.width).to.not.equal(initialWidth);
    });
    closeDialog('cancel');
  });

  it('moves the max filter handle when dragged to the left', () => {
    openMoreDialog('[data-type=number]', 'filter');
    let initialWidth = '';
    cy.get('.lu-histogram-max').first().then(($el) => {
      initialWidth = ($el[0] as HTMLElement).style.width;
    });
    pointerDrag('.lu-histogram-max', -30);
    cy.get('.lu-histogram-max').first().should(($el) => {
      expect(($el[0] as HTMLElement).style.width).to.not.equal(initialWidth);
    });
    closeDialog('cancel');
  });
});

// -------------------------------------------------------------------------
// Data mapping dialog — line, domain circle, and range circle drags
// -------------------------------------------------------------------------
describe('drag_interactions - data mapping dialog', () => {
  let lineup: LineUp;
  let lineUpJS: LineUpJSType;

  before(
    withLineUp((l, document) => {
      lineUpJS = l;
      const arr = generateData({ number: 1, string: 0, cat: 0 });
      lineup = lineUpJS.asLineUp(document.body, arr);
      waitReady(lineup);
    })
  );

  // Open a fresh dialog before each test and cancel it after, so every test
  // starts from the same default mapping state.
  beforeEach(() => {
    openMoreDialog('[data-type=number]', 'data-mapping');
  });

  afterEach(() => {
    closeDialog('cancel');
  });

  it('moves the mapping line when dragged horizontally', () => {
    let originalTransform = '';
    cy.get('.lu-dialog-mapper-details > g > g.lu-dialog-mapper-mapping').first().then(($g) => {
      originalTransform = $g[0].getAttribute('transform') ?? '';
    });
    pointerDrag('.lu-dialog-mapper-details > g > g.lu-dialog-mapper-mapping > line:first-of-type', 20);
    cy.get('.lu-dialog-mapper-details > g > g.lu-dialog-mapper-mapping').first().should(($el) => {
      expect($el[0].getAttribute('transform')).to.not.equal(originalTransform);
    });
  });

  it('moves the domain circle when dragged', () => {
    let originalTransform = '';
    cy.get('.lu-dialog-mapper-details > g > g.lu-dialog-mapper-mapping').first().then(($g) => {
      originalTransform = $g[0].getAttribute('transform') ?? '';
    });
    pointerDrag('.lu-dialog-mapper-details > g > g.lu-dialog-mapper-mapping > circle:first-of-type', 15);
    cy.get('.lu-dialog-mapper-details > g > g.lu-dialog-mapper-mapping').first().should(($el) => {
      expect($el[0].getAttribute('transform')).to.not.equal(originalTransform);
    });
  });

  it('moves the range circle when dragged', () => {
    let originalCx = '';
    cy.get('.lu-dialog-mapper-details > g > g.lu-dialog-mapper-mapping > circle:last-of-type').first().then(($circle) => {
      originalCx = $circle[0].getAttribute('cx') ?? '';
    });
    pointerDrag('.lu-dialog-mapper-details > g > g.lu-dialog-mapper-mapping > circle:last-of-type', 15);
    cy.get('.lu-dialog-mapper-details > g > g.lu-dialog-mapper-mapping > circle:last-of-type').first().should(($el) => {
      expect($el[0].getAttribute('cx')).to.not.equal(originalCx);
    });
  });
});
