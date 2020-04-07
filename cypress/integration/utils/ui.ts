export function aggregateAll() {
  cy.get('.lu-summary .lu-agg-expand').first().click();
}

export function closeDialog(action: 'cancel' | 'confirm' = 'confirm') {
  cy.get(`.lu-dialog .lu-dialog-button[type=${action === 'cancel' ? 'button' : 'submit'}]`).click();
  cy.get('.lu-backdrop').click();
}

export function resetDialog() {
  cy.get(`.lu-dialog .lu-dialog-button[type=reset]`).click();
}

export function openMoreDialog(column: string) {
  // open more menu
  cy.get(`.le-th${column} .lu-action-more`).first().click();
}
