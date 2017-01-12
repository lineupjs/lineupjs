import Column from '../model/Column';
import ADialog from './ADialog';
import DataProvider from '../provider/ADataProvider';
import * as d3 from 'd3';


export default class SearchDialog extends ADialog {

  /**
   * opens a search dialog for the given column
   * @param column the column to rename
   * @param $header the visual header element of this column
   * @param provider the data provider for the actual search
   * @param title optional title
   */
  constructor(private readonly column: Column, $header: d3.Selection<Column>, private readonly provider: DataProvider, title: string = 'Search') {
    super($header, title);
  }

  openDialog() {
    const popup = this.makePopup('<input type="text" size="15" value="" required="required" autofocus="autofocus"><br><label><input type="checkbox">RegExp</label><br>');

    popup.select('input[type="text"]').on('input', () => {
      const target = (<Event>d3.event).target;
      let search: any = (<HTMLInputElement>target).value;
      if (search.length >= 3) {
        const isRegex = popup.select('input[type="checkbox"]').property('checked');
        if (isRegex) {
          search = new RegExp(search);
        }
        this.provider.searchAndJump(search, this.column);
      }
    });

    const updateImpl = () => {
      let search = popup.select('input[type="text"]').property('value');
      const isRegex = popup.select('input[type="text"]').property('checked');
      if (search.length > 0) {
        if (isRegex) {
          search = new RegExp(search);
        }
        this.provider.searchAndJump(search, this.column);
      }
      popup.remove();
    };

    popup.select('input[type="checkbox"]').on('change', updateImpl);
    popup.select('.ok').on('click', updateImpl);

    popup.select('.cancel').on('click', function () {
      popup.remove();
    });
  }
}
