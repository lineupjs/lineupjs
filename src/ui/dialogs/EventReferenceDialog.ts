import { EventColumn } from '../../model';
import { ADialog, type IDialogContext } from '.';
import { select } from 'd3-selection';

export default class EventReferenceDialog extends ADialog {
  private readonly before;

  private static readonly BOXPLOT_REFERENCE_HEADER_TEXT = 'Boxplot Reference Column';
  private static readonly BOXPLOT_REFERENCE_COLUMN_NAME = 'boxplotReferenceColumn';
  private static readonly REFERENCE_COLUMN_HEADER_TEXT: string = 'Reference Column';
  private static readonly REFERENCE_COLUMN_NAME: string = 'referenceColumn';

  constructor(
    private readonly column: EventColumn,
    dialog: IDialogContext
  ) {
    super(dialog, {
      livePreview: 'dataMapping',
    });
    this.before = {
      boxplotReferenceColumn: column.getBoxplotReferenceColumn(),
      referenceColumn: column.getReferenceColumn(),
    };
  }

  protected build(node: HTMLElement): boolean | void {
    this.referenceColumnSettings(node);
    if (this.column.getBoxplotPossible()) {
      this.boxplotReferenceSettings(node);
    }
    this.livePreviews(node);
  }

  private livePreviews(node: HTMLElement) {
    select(node)
      .selectAll('.lu-checkbox')
      .on('click', () => {
        if (this.showLivePreviews) {
          this.submit();
        }
      });
    this.enableLivePreviews('input');
  }

  private boxplotReferenceSettings(node: HTMLElement) {
    const columns = [EventColumn.CURRENT_DATE_REFERENCE];
    const currentReference = this.column.getBoxplotReferenceColumn();
    columns.push(...this.column.getEventList());
    node.insertAdjacentHTML(
      'beforeend',
      `
      <strong>${EventReferenceDialog.BOXPLOT_REFERENCE_HEADER_TEXT}</strong>
      ${columns
        .map(
          (d) => ` <label class="lu-checkbox boxplot-reference-checkbox"><input type="radio" name="${
            EventReferenceDialog.BOXPLOT_REFERENCE_COLUMN_NAME
          }" value="${d}" 
      ${currentReference === d ? 'checked' : ''}><span>${d}</span></label>`
        )
        .join('')}
       `
    );
  }

  private referenceColumnSettings(node: HTMLElement) {
    const columns = [EventColumn.CURRENT_DATE_REFERENCE];
    const currentReference = this.column.getReferenceColumn();
    columns.push(...this.column.getEventList());
    node.insertAdjacentHTML(
      'beforeend',
      `
      <strong>${EventReferenceDialog.REFERENCE_COLUMN_HEADER_TEXT}</strong>
      ${columns
        .map(
          (d) => ` <label class="lu-checkbox boxplot-reference-checkbox"><input type="radio" name="${
            EventReferenceDialog.REFERENCE_COLUMN_NAME
          }" value="${d}" 
      ${currentReference === d ? 'checked' : ''}><span>${d}</span></label>`
        )
        .join('')}
       `
    );
  }

  protected reset(): void {
    if (this.column.getBoxplotPossible()) {
      this.findInput('input[name=' + EventReferenceDialog.BOXPLOT_REFERENCE_COLUMN_NAME + ']:checked').checked = false;

      this.findInput(
        'input[name=' +
          EventReferenceDialog.BOXPLOT_REFERENCE_COLUMN_NAME +
          '][value="' +
          this.before.boxplotReferenceColumn +
          '"]'
      ).checked = true;
    }
    this.findInput('input[name=' + EventReferenceDialog.REFERENCE_COLUMN_NAME + ']:checked').checked = false;

    this.findInput(
      'input[name=' + EventReferenceDialog.REFERENCE_COLUMN_NAME + '][value="' + this.before.referenceColumn + '"]'
    ).checked = true;

    this.submit();
  }

  protected submit(): boolean | undefined {
    if (this.column.getBoxplotPossible()) {
      const boxplotReferenceColumn = this.findInput(
        'input[name=' + EventReferenceDialog.BOXPLOT_REFERENCE_COLUMN_NAME + ']:checked'
      ).value;
      this.column.setBoxplotReferenceColumn(boxplotReferenceColumn);
    }

    const referenceColumn = this.findInput(
      'input[name=' + EventReferenceDialog.REFERENCE_COLUMN_NAME + ']:checked'
    ).value;
    this.column.setReferenceColumn(referenceColumn);

    this.column.markDirty('values');
    return true;
  }
  protected cancel(): void {
    this.column.setReferenceColumn(this.before.referenceColumn);
    this.column.setBoxplotReferenceColumn(this.before.boxplotReferenceColumn);
  }
}
