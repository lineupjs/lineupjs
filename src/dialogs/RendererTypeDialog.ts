import Column from '../model/Column';
import ADialog from './ADialog';
import * as d3 from 'd3';


export default class RedererTypeDialog extends ADialog {
  constructor(private readonly column: Column, $header: d3.Selection<Column>, title: string = 'Change Visualization') {
    super($header, title);
  }

  openDialog() {
    const bak = this.column.getRendererType();
    const rendererTypeList = this.column.getRendererList();

    const popup = this.makeSortPopup(rendererTypeList.map((d) => {
      return `<input type="radio" name="renderertype" value=${d.type}  ${(bak === d.type) ? 'checked' : ''}> ${d.label}<br>`;
    }).join('\n'));


    const rendererContent = d3.selectAll('input[name="renderertype"]');

    rendererContent.on('change', () => {
      const target = (<MouseEvent>d3.event).target;
      const value = (<HTMLInputElement>target).value;
      this.column.setRendererType(value);
    });

    this.hidePopupOnClickOutside(popup, rendererContent);
  }
}
