/**
 * Tests for the text filter/search field added to CategoricalFilterDialog.
 *
 * The dialog's build() method is protected, so we invoke it via `(dialog as any).build(node)`.
 * We provide minimal mocks for the column and context objects so that no real
 * LineUp data-provider or ranking is required.
 */
import CategoricalFilterDialog from '../../../src/ui/dialogs/CategoricalFilterDialog';
import type { IDialogContext } from '../../../src/ui/dialogs/ADialog';
import type { ICategory } from '../../../src/model/ICategoricalColumn';

// CSS prefix used by cssClass() – defaults to 'lu' in tests (no custom style var)
const P = 'lu';
const cls = (suffix: string) => `${P}-${suffix}`;

/** Minimal fake ICategory */
function cat(name: string, label: string): ICategory {
  return { name, label, color: '#aabbcc', value: 0 };
}

/** Build a minimal mock column with the given categories and no active filter. */
function makeColumn(categories: ICategory[]) {
  return {
    categories,
    getFilter: () => null,
    setFilter: jest.fn(),
    findMyRanker: () => null,
    // instanceof checks inside the dialog use the prototype chain; returning a plain
    // object is fine because neither SetColumn nor CategoricalsColumn instanceof checks
    // will be true for a plain object.
  } as any;
}

/** Build a minimal mock IRankingHeaderContext. */
function makeCtx() {
  return {
    sanitize: (v: string) => v,
    provider: {
      getTaskExecutor: () => ({
        // Returning null skips the async stats update branch
        summaryCategoricalStats: () => null,
      }),
    },
    dialogManager: {
      removeLike: () => false,
    },
  } as any;
}

/** Build a minimal IDialogContext whose attachment lives in a real jsdom document. */
function makeDialogContext(): IDialogContext {
  const attachment = document.createElement('div');
  document.body.appendChild(attachment);
  return {
    attachment,
    level: 0,
    manager: { removeLike: () => false } as any,
    idPrefix: 'test',
    sanitize: (v: string) => v,
  };
}

/** Create the dialog and invoke build(), returning the dialog instance and its root node. */
function buildDialog(categories: ICategory[]) {
  const column = makeColumn(categories);
  const ctx = makeCtx();
  const dialogCtx = makeDialogContext();
  const dialog = new CategoricalFilterDialog(column, dialogCtx, ctx);
  // build() is protected – bypass TypeScript's access check for testing
  (dialog as any).build(dialog.node);
  return { dialog, node: dialog.node, column };
}

// ---------------------------------------------------------------------------
// Helpers to query the dialog DOM
// ---------------------------------------------------------------------------

function getSearchInput(node: HTMLElement) {
  return node.querySelector<HTMLInputElement>(`.${cls('dialog-filter-cat-search')}`);
}

function getCatLabels(node: HTMLElement) {
  return Array.from(node.querySelectorAll<HTMLElement>(`label[data-cat]`));
}

function getSelectAll(node: HTMLElement) {
  return node.querySelector<HTMLInputElement>(`input[type=checkbox]:not([data-cat]):not([data-missing])`);
}

/** Fire an 'input' event on the search field with the given value. */
function filterBy(searchInput: HTMLInputElement, value: string) {
  searchInput.value = value;
  searchInput.dispatchEvent(new Event('input'));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CategoricalFilterDialog – text filter field', () => {
  const categories = [
    cat('apple', 'Apple'),
    cat('banana', 'Banana'),
    cat('cherry', 'Cherry'),
    cat('apricot', 'Apricot'),
  ];

  it('renders a search input above the category list', () => {
    const { node } = buildDialog(categories);
    const search = getSearchInput(node);
    expect(search).not.toBeNull();
    expect(search!.tagName).toBe('INPUT');
    expect(search!.type).toBe('text');
  });

  it('all category rows are visible before any search text is entered', () => {
    const { node } = buildDialog(categories);
    const labels = getCatLabels(node);
    expect(labels).toHaveLength(categories.length);
    labels.forEach((label) => {
      expect(label.classList.contains(cls('hidden'))).toBe(false);
    });
  });

  it('typing a query hides non-matching category rows', () => {
    const { node } = buildDialog(categories);
    const search = getSearchInput(node)!;
    filterBy(search, 'ap');

    const labels = getCatLabels(node);
    // 'Apple' and 'Apricot' match; 'Banana' and 'Cherry' do not
    const visible = labels.filter((l) => !l.classList.contains(cls('hidden')));
    const hidden = labels.filter((l) => l.classList.contains(cls('hidden')));
    expect(visible).toHaveLength(2);
    expect(hidden).toHaveLength(2);
  });

  it('matching is case-insensitive', () => {
    const { node } = buildDialog(categories);
    const search = getSearchInput(node)!;
    filterBy(search, 'AP');

    const visible = getCatLabels(node).filter((l) => !l.classList.contains(cls('hidden')));
    expect(visible).toHaveLength(2); // Apple, Apricot
  });

  it('clearing the search restores all rows', () => {
    const { node } = buildDialog(categories);
    const search = getSearchInput(node)!;
    filterBy(search, 'ap');
    filterBy(search, '');

    getCatLabels(node).forEach((label) => {
      expect(label.classList.contains(cls('hidden'))).toBe(false);
    });
  });

  it('hidden rows preserve their checked state while filtered', () => {
    const { node } = buildDialog(categories);

    // Uncheck the Banana checkbox before filtering
    const bananaInput = node.querySelector<HTMLInputElement>('input[data-cat="banana"]')!;
    bananaInput.checked = false;

    // Filter to show only "Apple" / "Apricot"
    filterBy(getSearchInput(node)!, 'ap');

    // Banana is now hidden but must still be unchecked
    expect(bananaInput.checked).toBe(false);

    // Restore filter
    filterBy(getSearchInput(node)!, '');

    // Banana is visible again – state must be preserved
    expect(bananaInput.checked).toBe(false);
  });

  it('"Un/Select All" only toggles visible rows when a filter is active', () => {
    const { node } = buildDialog(categories);

    // Filter to show only apple/apricot
    filterBy(getSearchInput(node)!, 'ap');

    // Uncheck all visible rows first
    node
      .querySelectorAll<HTMLInputElement>(`label[data-cat]:not(.${cls('hidden')}) input[data-cat]`)
      .forEach((i) => (i.checked = false));

    // Now click "Select All"
    const selectAll = getSelectAll(node)!;
    selectAll.checked = true;
    selectAll.dispatchEvent(new Event('change'));

    // Visible rows should now be checked
    node
      .querySelectorAll<HTMLInputElement>(`label[data-cat]:not(.${cls('hidden')}) input[data-cat]`)
      .forEach((i) => expect(i.checked).toBe(true));

    // Hidden rows (Banana, Cherry) must remain at their previous state (all checked by default)
    node
      .querySelectorAll<HTMLInputElement>(`label[data-cat].${cls('hidden')} input[data-cat]`)
      .forEach((i) => expect(i.checked).toBe(true));
  });

  it('"Un/Select All" checkbox becomes indeterminate when only some visible rows are checked', () => {
    const { node } = buildDialog(categories);
    const search = getSearchInput(node)!;

    // Show only apple/apricot
    filterBy(search, 'ap');

    // Uncheck one of the two visible rows
    const appleInput = node.querySelector<HTMLInputElement>('input[data-cat="apple"]')!;
    appleInput.checked = false;
    appleInput.dispatchEvent(new Event('change'));

    const selectAll = getSelectAll(node)!;
    expect(selectAll.indeterminate).toBe(true);
    expect(selectAll.checked).toBe(false);
  });

  it('"Un/Select All" checkbox is checked when all visible rows are checked', () => {
    const { node } = buildDialog(categories);
    const search = getSearchInput(node)!;

    // Show only apple/apricot, both already checked by default
    filterBy(search, 'ap');

    const selectAll = getSelectAll(node)!;
    expect(selectAll.indeterminate).toBe(false);
    expect(selectAll.checked).toBe(true);
  });

  it('"Un/Select All" checkbox is unchecked when no visible rows are checked', () => {
    const { node } = buildDialog(categories);
    const search = getSearchInput(node)!;

    // Show only apple/apricot, then uncheck both
    filterBy(search, 'ap');
    node.querySelectorAll<HTMLInputElement>(`label[data-cat]:not(.${cls('hidden')}) input[data-cat]`).forEach((i) => {
      i.checked = false;
      i.dispatchEvent(new Event('change'));
    });

    const selectAll = getSelectAll(node)!;
    expect(selectAll.indeterminate).toBe(false);
    expect(selectAll.checked).toBe(false);
  });

  it('reset() clears the search field and makes all rows visible again', () => {
    const { dialog, node } = buildDialog(categories);
    const search = getSearchInput(node)!;
    filterBy(search, 'ap');

    // Verify some rows are hidden before reset
    const hiddenBefore = getCatLabels(node).filter((l) => l.classList.contains(cls('hidden')));
    expect(hiddenBefore.length).toBeGreaterThan(0);

    (dialog as any).reset();

    expect(search.value).toBe('');
    getCatLabels(node).forEach((label) => {
      expect(label.classList.contains(cls('hidden'))).toBe(false);
    });
  });

  it('missing value row is never hidden by the text filter', () => {
    const { node } = buildDialog(categories);
    filterBy(getSearchInput(node)!, 'zzz'); // matches nothing

    const missingLabel = node.querySelector<HTMLElement>('label[data-missing]')!;
    expect(missingLabel).not.toBeNull();
    expect(missingLabel.classList.contains(cls('hidden'))).toBe(false);
  });
});
