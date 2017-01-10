import Column from '../model/Column';
import ADialog from '../ui_dialogs';
import DataProvider from '../provider/ADataProvider';



export default class SearchDialog extends ADialog {
  private readonly provider;

  /**
   * opens a search dialog for the given column
   * @param column the column to rename
   * @param $header the visual header element of this column
   * @param provider the data provider for the actual search
   * @param title optional title
   */
  constructor(column: Column, $header: d3.Selection<Column>, provider: DataProvider, title: string = 'Search') {
    super(column, $header, title);

    this.provider = provider;

    this.openDialog();
  }

  openDialog() {
    const popup = this.makePopup('<input type="text" size="15" value="" required="required" autofocus="autofocus"><br><label><input type="checkbox">RegExp</label><br>');

    const that = this;

    popup.select('input[type="text"]').on('input', function () {
      let search: any = (<HTMLInputElement>this).value;
      if (search.length >= 3) {
        const isRegex = popup.select('input[type="checkbox"]').property('checked');
        if (isRegex) {
          search = new RegExp(search);
        }
        that.provider.searchAndJump(search, that.getColumn());
      }
    });

    function updateImpl() {
      let search = popup.select('input[type="text"]').property('value');
      const isRegex = popup.select('input[type="text"]').property('checked');
      if (search.length > 0) {
        if (isRegex) {
          search = new RegExp(search);
        }
        that.provider.searchAndJump(search, that.getColumn());
      }
      popup.remove();
    }

    popup.select('input[type="checkbox"]').on('change', updateImpl);
    popup.select('.ok').on('click', updateImpl);

    popup.select('.cancel').on('click', function () {
      popup.remove();
    });
  }
}
