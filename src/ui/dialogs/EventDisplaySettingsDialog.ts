import { EventColumn } from '../../model';
import { ADialog, type IDialogContext } from '.';
import { select } from 'd3-selection';

export default class EventDisplaySettingsDialog extends ADialog {
  private readonly before;

  private static readonly EVENT_DISPLAY_COLUMN_HEADER_TEXT = 'Show Events';
  private static readonly EVENT_DISPLAY_COLUMN_OVERVIEW_HEADER_TEXT = 'Show Events in Overview';
  private static readonly EVENT_DISPLAY_COLUMN_NAME = 'eventDisplayColumn';
  private static readonly EVENT_DISPLAY_COLUMN_OVERVIEW_NAME = 'eventDisplayColumnOverview';
  private static readonly SHOW_BOXPLOT_HEADER_TEXT = 'Show Boxplot';
  private static readonly SHOW_BOXPLOT_NAME: string = 'showBoxplot';
  private static readonly REFERENCE_COLUMN_NAME: string = 'referenceColumn';

  constructor(
    private readonly column: EventColumn,
    dialog: IDialogContext
  ) {
    super(dialog, {
      livePreview: 'dataMapping',
    });
    this.before = {
      displayEventList: column.getDisplayEventList(),
      displayEventListOverview: column.getDisplayEventList(true),
      showBoxplot: column.getShowBoxplot(),
    };
  }

  protected build(node: HTMLElement): boolean | void {
    this.eventDisplaySettings(
      node,
      EventDisplaySettingsDialog.EVENT_DISPLAY_COLUMN_HEADER_TEXT,
      this.column.getEventList(),
      EventDisplaySettingsDialog.EVENT_DISPLAY_COLUMN_NAME,
      this.column.getDisplayEventList()
    );
    this.eventDisplaySettings(
      node,
      EventDisplaySettingsDialog.EVENT_DISPLAY_COLUMN_OVERVIEW_HEADER_TEXT,
      this.column.getEventList(true),
      EventDisplaySettingsDialog.EVENT_DISPLAY_COLUMN_OVERVIEW_NAME,
      this.column.getDisplayEventList(true)
    );
    if (this.column.getBoxplotPossible()) {
      this.showBoxplotSetting(node);
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
      <label class="lu-checkbox "><input type="checkbox" name="${EventDisplaySettingsDialog.SHOW_BOXPLOT_NAME}" 
      ${this.column.getShowBoxplot() ? 'checked' : ''}><strong>${
        EventDisplaySettingsDialog.SHOW_BOXPLOT_HEADER_TEXT
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

  protected reset(): void {
    if (this.column.getBoxplotPossible()) {
      this.findInput('input[name=' + EventDisplaySettingsDialog.SHOW_BOXPLOT_NAME + ']').checked =
        this.before.showBoxplot;
    }
    this.findInput('input[name=' + EventDisplaySettingsDialog.REFERENCE_COLUMN_NAME + ']:checked').checked = false;

    select(this.node)
      .selectAll(`input[name=${EventDisplaySettingsDialog.EVENT_DISPLAY_COLUMN_NAME}]`)
      .nodes()
      .forEach((d: HTMLInputElement) => {
        d.checked = this.before.displayEventList.includes(d.value);
      });

    select(this.node)
      .selectAll(`input[name=${EventDisplaySettingsDialog.EVENT_DISPLAY_COLUMN_OVERVIEW_NAME}]`)
      .nodes()
      .forEach((d: HTMLInputElement) => {
        d.checked = this.before.displayEventListOverview.includes(d.value);
      });

    this.submit();
  }

  protected submit(): boolean | undefined {
    if (this.column.getBoxplotPossible()) {
      const showBoxplot = this.findInput('input[name=' + EventDisplaySettingsDialog.SHOW_BOXPLOT_NAME + ']').checked;
      this.column.setShowBoxplot(showBoxplot);
    }
    const selectedEventsList = select(this.node)
      .selectAll(`input[name=${EventDisplaySettingsDialog.EVENT_DISPLAY_COLUMN_NAME}]:checked`)
      .nodes()
      .map((d: HTMLInputElement) => d.value);
    this.column.setDisplayEventList(selectedEventsList);
    const selectedEventsListOverview = select(this.node)
      .selectAll(`input[name=${EventDisplaySettingsDialog.EVENT_DISPLAY_COLUMN_OVERVIEW_NAME}]:checked`)
      .nodes()
      .map((d: HTMLInputElement) => d.value);
    this.column.setDisplayEventList(selectedEventsListOverview, true);

    this.column.markDirty('values');
    return true;
  }
  protected cancel(): void {
    this.column.setDisplayEventList(this.before.displayEventList);
    this.column.setDisplayEventList(this.before.displayEventListOverview, true);
    this.column.setShowBoxplot(this.before.showBoxplot);
  }
}