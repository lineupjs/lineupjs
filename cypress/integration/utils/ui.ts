export function aggregateAll() {
  cy.wait(200).get('.lu-summary .lu-agg-expand').first().wait(200).click();
}

export function closeDialog(action: 'cancel' | 'confirm' = 'confirm') {
  cy.get(`.lu-dialog-button[type=${action === 'cancel' ? 'button' : 'submit'}]`).click();
  // cy.get('.lu-backdrop').click();
}

export function resetDialog() {
  cy.get(`.lu-dialog-button[type=reset]`).click();
}

export function openMoreDialog(column: string, action?: string) {
  // open more menu
  cy.get(`.le-th${column} .lu-action-more`).first().click();
  if (action) {
    cy.get(`.lu-more-options .lu-action-${action}`).click();
  }
  return cy.get('.lu-dialog').last().as('dialog');
}

export function groupByString(aggregate = true) {
  // open more menu
  openMoreDialog('[data-type=string]');
  // open group by dialog
  cy.get('.lu-more-options .lu-action-group').click();

  cy.get('.lu-dialog input[name=grouped][value=true]').click();
  cy.get('.lu-dialog textarea').type('Row 1\nRow 2');
  closeDialog();
  if (aggregate) {
    aggregateAll();
  }
}
