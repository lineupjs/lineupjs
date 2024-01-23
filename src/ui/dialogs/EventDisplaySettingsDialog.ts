import { EventColumn } from '../../model';
import { ADialog, type IDialogContext } from '.';

export default class EventDisplaySettingsDialog extends ADialog {
  private readonly before: {
    displayEventList: string[];
    displayEventListOverview: string[];
    showBoxplot: boolean;
    displayZeroLine: boolean;
  };

  private static readonly EVENT_DISPLAY_COLUMN_HEADER_TEXT = 'Show Events';
  private static readonly EVENT_DISPLAY_COLUMN_OVERVIEW_HEADER_TEXT = 'Show Events in Overview';
  private static readonly EVENT_DISPLAY_COLUMN_NAME = 'eventDisplayColumn';
  private static readonly EVENT_DISPLAY_COLUMN_OVERVIEW_NAME = 'eventDisplayColumnOverview';
  private static readonly SHOW_BOXPLOT_HEADER_TEXT = 'Show Boxplot';
  private static readonly SHOW_BOXPLOT_NAME: string = 'showBoxplot';
  private static readonly SHOW_ZERO_LINE_HEADER_TEXT = 'Show Zero Line';
  private static readonly SHOW_ZERO_LINE_NAME: string = 'showZeroLine';

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
      displayZeroLine: column.getDisplayZeroLine(),
    };
  }

  protected build(node: HTMLElement): void {
    this.buildEventDisplaySettings(
      node,
      EventDisplaySettingsDialog.EVENT_DISPLAY_COLUMN_HEADER_TEXT,
      this.column.getEventList(),
      EventDisplaySettingsDialog.EVENT_DISPLAY_COLUMN_NAME,
      this.column.getDisplayEventList()
    );
    this.buildEventDisplaySettings(
      node,
      EventDisplaySettingsDialog.EVENT_DISPLAY_COLUMN_OVERVIEW_HEADER_TEXT,
      this.column.getEventList(true),
      EventDisplaySettingsDialog.EVENT_DISPLAY_COLUMN_OVERVIEW_NAME,
      this.column.getDisplayEventList(true)
    );
    if (this.column.getBoxplotPossible()) {
      this.buildEventCheckboxSettings(
        node,
        EventDisplaySettingsDialog.SHOW_BOXPLOT_NAME,
        EventDisplaySettingsDialog.SHOW_BOXPLOT_HEADER_TEXT,
        this.column.getShowBoxplot()
      );
    }

    this.buildEventCheckboxSettings(
      node,
      EventDisplaySettingsDialog.SHOW_ZERO_LINE_NAME,
      EventDisplaySettingsDialog.SHOW_ZERO_LINE_HEADER_TEXT,
      this.column.getDisplayZeroLine()
    );
    this.livePreviews(node);
  }

  private buildEventCheckboxSettings(node: HTMLElement, name: string, headerText: string, checked: boolean = false) {
    node.insertAdjacentHTML(
      'beforeend',
      `
      <label class="lu-checkbox "><input type="checkbox" name="${name}" 
      ${checked ? 'checked' : ''}><strong>${headerText}</strong></label>
       `
    );
  }

  private livePreviews(node: HTMLElement) {
    node.querySelectorAll('.lu-checkbox').forEach((d) =>
      d.addEventListener('click', () => {
        if (this.showLivePreviews) {
          this.submit();
        }
      })
    );

    this.enableLivePreviews('input');
  }

  private buildEventDisplaySettings(
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

    this.findInput('input[name=' + EventDisplaySettingsDialog.SHOW_ZERO_LINE_NAME + ']').checked =
      this.before.displayZeroLine;

    this.node
      .querySelectorAll(`input[name=${EventDisplaySettingsDialog.EVENT_DISPLAY_COLUMN_NAME}]`)
      .forEach((d: HTMLInputElement) => {
        d.checked = this.before.displayEventList.includes(d.value);
      });

    this.node
      .querySelectorAll(`input[name=${EventDisplaySettingsDialog.EVENT_DISPLAY_COLUMN_OVERVIEW_NAME}]`)
      .forEach((d: HTMLInputElement) => {
        d.checked = this.before.displayEventListOverview.includes(d.value);
      });

    this.submit();
  }

  protected submit(): boolean {
    if (this.column.getBoxplotPossible()) {
      const showBoxplot = this.findInput('input[name=' + EventDisplaySettingsDialog.SHOW_BOXPLOT_NAME + ']').checked;
      this.column.setShowBoxplot(showBoxplot);
    }

    const displayZeroLine = this.findInput(
      'input[name=' + EventDisplaySettingsDialog.SHOW_ZERO_LINE_NAME + ']'
    ).checked;
    this.column.setDisplayZeroLine(displayZeroLine);
    const selectedEventsList = [];
    this.node
      .querySelectorAll(`input[name=${EventDisplaySettingsDialog.EVENT_DISPLAY_COLUMN_NAME}]:checked`)
      .forEach((d: HTMLInputElement) => {
        selectedEventsList.push(d.value);
      });
    this.column.setDisplayEventList(selectedEventsList);
    const selectedEventsListOverview = [];
    this.node
      .querySelectorAll(`input[name=${EventDisplaySettingsDialog.EVENT_DISPLAY_COLUMN_OVERVIEW_NAME}]:checked`)
      .forEach((d: HTMLInputElement) => {
        selectedEventsListOverview.push(d.value);
      });
    this.column.setDisplayEventList(selectedEventsListOverview, true);
    this.column.markDirty('values');
    return true;
  }
  protected cancel(): void {
    this.column.setDisplayEventList(this.before.displayEventList);
    this.column.setDisplayEventList(this.before.displayEventListOverview, true);
    this.column.setShowBoxplot(this.before.showBoxplot);
    this.column.setDisplayZeroLine(this.before.displayZeroLine);
  }
}
