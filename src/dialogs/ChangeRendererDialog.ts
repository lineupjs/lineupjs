import Column from '../model/Column';
import ADialog from './ADialog';
import * as d3 from 'd3';


export default class ChangeRendererDialog extends ADialog {
  constructor(private readonly column: Column, $header: d3.Selection<Column>, title: string = 'Change Visualization') {
    super($header, title);
  }

  openDialog() {
    const current = this.column.getRendererType();
    const possible = this.column.getRendererList();

    const currentGroup = this.column.getGroupRenderer();
    const possibleGroup = this.column.getGroupRenderers();

    console.assert(possible.length > 1 || possibleGroup.length > 1); // otherwise no need to show this

    let html = '';

    html += possible.map((d) => {
      return `<input type="radio" name="renderertype" value=${d.type}  ${(current === d.type) ? 'checked' : ''}> ${d.label}<br>`;
    }).join('\n');

    if (currentGroup.length > 1) {
      html += '<strong>Group Visualization</strong><br>';
      html += possibleGroup.map((d) => {
        return `<input type="radio" name="grouptype" value=${d.type}  ${(currentGroup === d.type) ? 'checked' : ''}> ${d.label}<br>`;
      }).join('\n');
    }

    this.makeChoosePopup(html);

    const that = this;
    d3.selectAll('input[name="renderertype"]').on('change', function (this: HTMLInputElement) {
      that.column.setRendererType(this.value);
    });
    d3.selectAll('input[name="grouptype"]').on('change', function (this: HTMLInputElement) {
      that.column.setGroupRenderer(this.value);
    });
  }
}
