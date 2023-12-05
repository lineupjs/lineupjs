import { EventColumn } from '../../model';
import { ADialog, type IDialogContext } from '.';
import { select } from 'd3-selection';

export default class EventSettingsDialog extends ADialog {
  private readonly before;
  // private readonly viewModel: ViewModel;

  private static readonly BOXPLOT_REFERENCE_HEADER_TEXT = 'Boxplot Reference Column';
  private static readonly EVENT_DISPLAY_COLUMN_HEADER_TEXT = 'Show Events';
  private static readonly EVENT_DISPLAY_COLUMN_OVERVIEW_HEADER_TEXT = 'Show Events in Overview';
  private static readonly BOXPLOT_REFERENCE_COLUMN_NAME = 'boxplotReferenceColumn';
  private static readonly EVENT_DISPLAY_COLUMN_NAME = 'eventDisplayColumn';
  private static readonly EVENT_DISPLAY_COLUMN_OVERVIEW_NAME = 'eventDisplayColumnOverview';
  private static readonly SHOW_BOXPLOT_HEADER_TEXT = 'Show Boxplot';
  private static readonly SHOW_BOXPLOT_NAME: string = 'showBoxplot';
  private static readonly REFERENCE_COLUMN_HEADER_TEXT: string = 'Reference Column';
  private static readonly REFERENCE_COLUMN_NAME: string = 'referenceColumn';

  constructor(
    private readonly column: EventColumn,
    dialog: IDialogContext //,    private readonly ctx: IRankingHeaderContext //, viewModel: ViewModel
  ) {
    super(dialog, {
      livePreview: 'dataMapping',
    });
    this.before = {
      boxplotReferenceColumn: column.getBoxplotReferenceColumn(),
      displayEventList: column.getDisplayEventList(),
      displayEventListOverview: column.getDisplayEventList(true),
      showBoxplot: column.getShowBoxplot(),
    };
    // this.viewModel = viewModel;
  }

  protected build(node: HTMLElement): boolean | void {
    this.eventDisplaySettings(
      node,
      EventSettingsDialog.EVENT_DISPLAY_COLUMN_HEADER_TEXT,
      this.column.getEventList(),
      EventSettingsDialog.EVENT_DISPLAY_COLUMN_NAME,
      this.column.getDisplayEventList()
    );
    this.eventDisplaySettings(
      node,
      EventSettingsDialog.EVENT_DISPLAY_COLUMN_OVERVIEW_HEADER_TEXT,
      this.column.getEventList(true),
      EventSettingsDialog.EVENT_DISPLAY_COLUMN_OVERVIEW_NAME,
      this.column.getDisplayEventList(true)
    );
    this.referenceColumnSettings(node);
    if (this.column.getBoxplotPossible()) {
      this.showBoxplotSetting(node);
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

  private showBoxplotSetting(node: HTMLElement) {
    node.insertAdjacentHTML(
      'beforeend',
      `
      <label class="lu-checkbox "><input type="checkbox" name="${EventSettingsDialog.SHOW_BOXPLOT_NAME}" value="${
        EventSettingsDialog.SHOW_BOXPLOT_NAME
      }" 
      ${this.column.getShowBoxplot() ? 'checked' : ''}><strong>${
        EventSettingsDialog.SHOW_BOXPLOT_HEADER_TEXT
      }</strong></label>
       `
    );
  }

  private eventDisplaySettings(
    node: HTMLElement,
    headerText: string,
    allEventsList: string[],
    inputName: string,
    displayEventList: string[]
  ) {
    node.insertAdjacentHTML(
      'beforeend',
      `
      <strong>${headerText}</strong>
      ${allEventsList
        .map(
          (d) => ` <label class="lu-checkbox "><input type="checkbox" name="${inputName}" value="${d}" 
      ${displayEventList.includes(d) ? 'checked' : ''}><span>${d}</span></label>`
        )
        .join('')}
       `
    );
  }

  private boxplotReferenceSettings(node: HTMLElement) {
    const columns = [EventColumn.CURRENT_DATE_REFERENCE];
    const currentReference = this.column.getBoxplotReferenceColumn();
    columns.push(...this.column.getEventList());
    node.insertAdjacentHTML(
      'beforeend',
      `
      <strong>${EventSettingsDialog.BOXPLOT_REFERENCE_HEADER_TEXT}</strong>
      ${columns
        .map(
          (d) => ` <label class="lu-checkbox boxplot-reference-checkbox"><input type="radio" name="${
            EventSettingsDialog.BOXPLOT_REFERENCE_COLUMN_NAME
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
      <strong>${EventSettingsDialog.REFERENCE_COLUMN_HEADER_TEXT}</strong>
      ${columns
        .map(
          (d) => ` <label class="lu-checkbox boxplot-reference-checkbox"><input type="radio" name="${
            EventSettingsDialog.REFERENCE_COLUMN_NAME
          }" value="${d}" 
      ${currentReference === d ? 'checked' : ''}><span>${d}</span></label>`
        )
        .join('')}
       `
    );
  }

  protected reset(): void {
    if (this.column.getBoxplotPossible()) {
      this.findInput('input[name=' + EventSettingsDialog.BOXPLOT_REFERENCE_COLUMN_NAME + ']:checked').checked = false;

      this.findInput(
        'input[name=' +
          EventSettingsDialog.BOXPLOT_REFERENCE_COLUMN_NAME +
          '][value="' +
          this.before.boxplotReferenceColumn +
          '"]'
      ).checked = true;
      this.findInput('input[name=' + EventSettingsDialog.SHOW_BOXPLOT_NAME + ']').checked = this.before.showBoxplot;
    }
    this.findInput('input[name=' + EventSettingsDialog.REFERENCE_COLUMN_NAME + ']:checked').checked = false;

    this.findInput(
      'input[name=' +
        EventSettingsDialog.REFERENCE_COLUMN_NAME +
        '][value="' +
        this.before.boxplotReferenceColumn +
        '"]'
    ).checked = true;

    select(this.node)
      .selectAll(`input[name=${EventSettingsDialog.EVENT_DISPLAY_COLUMN_NAME}]`)
      .nodes()
      .forEach((d: HTMLInputElement) => {
        d.checked = this.before.displayEventList.includes(d.value);
      });

    select(this.node)
      .selectAll(`input[name=${EventSettingsDialog.EVENT_DISPLAY_COLUMN_OVERVIEW_NAME}]`)
      .nodes()
      .forEach((d: HTMLInputElement) => {
        d.checked = this.before.displayEventListOverview.includes(d.value);
      });

    this.submit();
  }

  protected submit(): boolean | undefined {
    if (this.column.getBoxplotPossible()) {
      const boxplotReferenceColumn = this.findInput(
        'input[name=' + EventSettingsDialog.BOXPLOT_REFERENCE_COLUMN_NAME + ']:checked'
      ).value;
      const showBoxplot = this.findInput('input[name=' + EventSettingsDialog.SHOW_BOXPLOT_NAME + ']').checked;
      this.column.setShowBoxplot(showBoxplot);
      this.column.setBoxplotReferenceColumn(boxplotReferenceColumn);
    }
    const selectedEventsList = select(this.node)
      .selectAll(`input[name=${EventSettingsDialog.EVENT_DISPLAY_COLUMN_NAME}]:checked`)
      .nodes()
      .map((d: HTMLInputElement) => d.value);
    this.column.setDisplayEventList(selectedEventsList);
    const selectedEventsListOverview = select(this.node)
      .selectAll(`input[name=${EventSettingsDialog.EVENT_DISPLAY_COLUMN_OVERVIEW_NAME}]:checked`)
      .nodes()
      .map((d: HTMLInputElement) => d.value);
    const referenceColumn = this.findInput(
      'input[name=' + EventSettingsDialog.REFERENCE_COLUMN_NAME + ']:checked'
    ).value;
    this.column.setReferenceColumn(referenceColumn);

    this.column.setDisplayEventList(selectedEventsListOverview, true);

    this.column.markDirty('values');
    return true;
  }
  protected cancel(): void {
    this.column.setReferenceColumn(this.before.referenceColumn);
    this.column.setBoxplotReferenceColumn(this.before.boxplotReferenceColumn);
    this.column.setDisplayEventList(this.before.displayEventList);
    this.column.setDisplayEventList(this.before.displayEventListOverview, true);
    this.column.setShowBoxplot(this.before.showBoxplot);
  }
}
