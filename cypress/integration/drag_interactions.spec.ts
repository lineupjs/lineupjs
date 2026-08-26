import { withLineUp, waitReady, LineUpJSType, LineUp } from './utils/lineup';
import { generateData } from './utils/data';
import { openMoreDialog, closeDialog } from './utils/ui';

/**
 * Helper: simulate a pointer drag using Pointer Events API.
 *
 * Triggers `pointerdown` on the source element, then fires a sequence of
 * `pointermove` events on the document, followed by a `pointerup` on the
 * document. This mirrors the capture-phase document listeners used by both
 * `dragHandle` (src/internal/drag.ts) and `dragWidth` (src/ui/header.ts).
 */
function pointerDrag(selector: string, deltaX: number, deltaY = 0) {
  return cy
    .get(selector)
    .first()
    .then(($el) => {
      const el = $el[0];
      const rect = el.getBoundingClientRect();
      const startX = rect.left + rect.width / 2;
      const startY = rect.top + rect.height / 2;

      const pointerId = 1;
      const pointerOpts = {
        pointerId,
        pointerType: 'mouse' as const,
        button: 0,
        buttons: 1,
        bubbles: true,
        cancelable: true,
      };

      // pointerdown on the handle itself
      el.dispatchEvent(new PointerEvent('pointerdown', { ...pointerOpts, clientX: startX, clientY: startY }));

      // pointermove on the document (capture phase listener)
      const steps = 5;
      for (let i = 1; i <= steps; i++) {
        el.ownerDocument!.dispatchEvent(
          new PointerEvent('pointermove', {
            ...pointerOpts,
            clientX: startX + (deltaX * i) / steps,
            clientY: startY + (deltaY * i) / steps,
          })
        );
      }

      // pointerup on the document (capture phase listener)
      el.ownerDocument!.dispatchEvent(
        new PointerEvent('pointerup', { ...pointerOpts, clientX: startX + deltaX, clientY: startY + deltaY })
      );
    });
}

describe('drag_interactions', () => {
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

  // -------------------------------------------------------------------------
  // Column-width resize handle
  // -------------------------------------------------------------------------
  describe('column width resize', () => {
    it('increases column width when dragging handle to the right', () => {
      cy.get('.le-th[data-type=number]')
        .first()
        .then(($th) => {
          const originalWidth = $th[0].getBoundingClientRect().width;

          pointerDrag('.le-th[data-type=number] .lu-handle', 60).then(() => {
            cy.get('.le-th[data-type=number]')
              .first()
              .should(($el) => {
                expect($el[0].getBoundingClientRect().width).to.be.greaterThan(originalWidth);
              });
          });
        });
    });

    it('decreases column width when dragging handle to the left', () => {
      cy.get('.le-th[data-type=number]')
        .first()
        .then(($th) => {
          const originalWidth = $th[0].getBoundingClientRect().width;

          pointerDrag('.le-th[data-type=number] .lu-handle', -40).then(() => {
            cy.get('.le-th[data-type=number]')
              .first()
              .should(($el) => {
                expect($el[0].getBoundingClientRect().width).to.be.lessThan(originalWidth);
              });
          });
        });
    });
  });

  // -------------------------------------------------------------------------
  // Histogram min/max filter handles
  // -------------------------------------------------------------------------
  describe('histogram filter handles', () => {
    before(() => {
      // Open the filter dialog for the number column to make handles visible
      openMoreDialog('[data-type=number]', 'filter');
    });

    after(() => {
      closeDialog('cancel');
    });

    it('moves the min filter handle when dragged to the right', () => {
      cy.get('.lu-histogram-min')
        .first()
        .then(($handle) => {
          const originalLeft = $handle[0].getBoundingClientRect().left;

          pointerDrag('.lu-histogram-min', 30).then(() => {
            cy.get('.lu-histogram-min')
              .first()
              .should(($el) => {
                const newLeft = $el[0].getBoundingClientRect().left;
                expect(newLeft).to.be.greaterThan(originalLeft);
              });
          });
        });
    });

    it('moves the max filter handle when dragged to the left', () => {
      cy.get('.lu-histogram-max')
        .first()
        .then(($handle) => {
          const originalRight = $handle[0].getBoundingClientRect().right;

          pointerDrag('.lu-histogram-max', -30).then(() => {
            cy.get('.lu-histogram-max')
              .first()
              .should(($el) => {
                const newRight = $el[0].getBoundingClientRect().right;
                expect(newRight).to.be.lessThan(originalRight);
              });
          });
        });
    });
  });

  // -------------------------------------------------------------------------
  // Data mapping dialog — line, domain circle, and range circle drags
  // -------------------------------------------------------------------------
  describe('data mapping dialog', () => {
    before(() => {
      openMoreDialog('[data-type=number]', 'data-mapping');
    });

    after(() => {
      closeDialog('cancel');
    });

    it('moves the mapping line when dragged horizontally', () => {
      cy.get('.lu-dialog-mapper-details > g > g.lu-dialog-mapper-mapping')
        .first()
        .then(($g) => {
          const originalTransform = $g[0].getAttribute('transform') ?? '';

          pointerDrag('.lu-dialog-mapper-details > g > g.lu-dialog-mapper-mapping > line:first-of-type', 20).then(
            () => {
              cy.get('.lu-dialog-mapper-details > g > g.lu-dialog-mapper-mapping')
                .first()
                .should(($el) => {
                  expect($el[0].getAttribute('transform')).to.not.equal(originalTransform);
                });
            }
          );
        });
    });

    it('moves the domain circle when dragged', () => {
      cy.get('.lu-dialog-mapper-details > g > g.lu-dialog-mapper-mapping > circle:first-of-type')
        .first()
        .then(($circle) => {
          const originalTransform = $circle.closest('g.lu-dialog-mapper-mapping')[0].getAttribute('transform') ?? '';

          pointerDrag('.lu-dialog-mapper-details > g > g.lu-dialog-mapper-mapping > circle:first-of-type', 15).then(
            () => {
              cy.get('.lu-dialog-mapper-details > g > g.lu-dialog-mapper-mapping')
                .first()
                .should(($el) => {
                  expect($el[0].getAttribute('transform')).to.not.equal(originalTransform);
                });
            }
          );
        });
    });

    it('moves the range circle when dragged', () => {
      cy.get('.lu-dialog-mapper-details > g > g.lu-dialog-mapper-mapping > circle:last-of-type')
        .first()
        .then(($circle) => {
          const originalCx = $circle[0].getAttribute('cx') ?? '';

          pointerDrag('.lu-dialog-mapper-details > g > g.lu-dialog-mapper-mapping > circle:last-of-type', 15).then(
            () => {
              cy.get('.lu-dialog-mapper-details > g > g.lu-dialog-mapper-mapping > circle:last-of-type')
                .first()
                .should(($el) => {
                  expect($el[0].getAttribute('cx')).to.not.equal(originalCx);
                });
            }
          );
        });
    });
  });
});
