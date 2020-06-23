export function aggregateAll() {
  cy.get('.lu-summary .lu-agg-expand').first().click().wait(200);
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
