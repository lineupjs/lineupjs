import Column from '../model/Column';
import StackColumn from '../model/StackColumn';
import ADialog from './ADialog';
import {scale as d3scale} from 'd3';


export default class WeightsEditDialog extends ADialog {
  /**
   * opens a dialog for editing the weights of a stack column
   * @param column the column to filter
   * @param $header the visual header element of this column
   * @param title optional title
   */
  constructor(private readonly column: StackColumn, $header: d3.Selection<Column>, title: string = 'Edit Weights') {
    super($header, title);
  }

  openDialog() {
    const weights = this.column.getWeights(),
      children = this.column.children.map((d, i) => ({col: d, weight: weights[i] * 100} ));

    //map weights to pixels
    const scale = d3scale.linear().domain([0, 100]).range([0, 120]);

    const $popup = this.makePopup('<table></table>');

    //show as a table with inputs and bars
    const $rows = $popup.select('table').selectAll('tr').data(children);
    const $rowsEnter = $rows.enter().append('tr');
    $rowsEnter.append('td')
      .append('input').attr({
      type: 'number',
      value: (d) => d.weight,
      min: 0,
      max: 100,
      size: 5
    }).on('input', function (d) {
      d.weight = +this.value;
      redraw();
    });

    $rowsEnter.append('td').append('div')
      .attr('class', (d) => 'bar ' + d.col.cssClass)
      .style('background-color', (d) => d.col.color);

    $rowsEnter.append('td').text((d) => d.col.label);

    function redraw() {
      $rows.select('.bar').transition().style('width', (d) => scale(d.weight) + 'px');
    }

    redraw();

    $popup.select('.cancel').on('click', () => {
      $popup.remove();
      this.column.setWeights(weights);
    });
    $popup.select('.reset').on('click', () => {
      children.forEach((d, i) => d.weight = weights[i] * 100);
      $rows.select('input').property('value', (d) => d.weight);
      redraw();
    });
    $popup.select('.ok').on('click', () => {
      this.column.setWeights(children.map((d) => d.weight));
      $popup.remove();
    });
  }
}
