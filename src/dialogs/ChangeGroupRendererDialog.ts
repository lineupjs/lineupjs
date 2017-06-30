import Column from '../model/Column';
import ADialog from './ADialog';
import * as d3 from 'd3';


export default class ChangeGroupRendererDialog extends ADialog {
  constructor(private readonly column: Column, $header: d3.Selection<Column>, title: string = 'Change Group Visualization') {
    super($header, title);
  }

  openDialog() {
    const current = this.column.getGroupRenderer();
    const possible = this.column.getGroupRenderers();

    this.makeChoosePopup(possible.map((d) => {
      return `<input type="radio" name="renderertype" value=${d.type}  ${(current === d.type) ? 'checked' : ''}> ${d.label}<br>`;
    }).join('\n'));

    const that = this;
    d3.selectAll('input[name="renderertype"]').on('change', function(this: HTMLInputElement) {
      that.column.setGroupRenderer(this.value);
    });
  }
}
