import ICellRendererFactory from './ICellRendererFactory';
import Column from '../model/Column';
import {INumberColumn, isNumberColumn} from '../model/INumberColumn';
import IDOMCellRenderer, {IDOMGroupRenderer} from './IDOMCellRenderers';
import {IDataRow} from '../provider/ADataProvider';
import {attr, forEachChild} from '../utils';
import {renderMissingDOM} from './missing';
import CompositeNumberColumn from '../model/CompositeNumberColumn';
import CategoricalNumberColumn from '../model/CategoricalNumberColumn';
import {default as NumbersColumn, isNumbersColumn} from '../model/NumbersColumn';
import {IGroup} from '../model/Group';
import {isMissingValue} from '../model/missing';


/**
 * a renderer rendering a bar for numerical columns
 */
export default class DotCellRenderer implements ICellRendererFactory {
  readonly title = 'Dot(s)';

  private colorOf(d: any, i: number, col: Column) {
    if (col instanceof CompositeNumberColumn || col instanceof CategoricalNumberColumn) {
      return col.getColor(d, i);
    }
    return col.color;
  }

  canRender(col: Column) {
    return isNumberColumn(col);
  }

  private static getDOMRenderer(col: INumberColumn & Column) {
    const dots = isNumbersColumn(col) ? col.getDataLength() : 1;
    let tmp = '';
    for(let i = 0; i < dots; ++i) {
      tmp += `<div style='background-color: ${col.color}' title=''></div>`;
    }

    const render = (n: HTMLElement, vs: number[], labels: string[], colors: (string|null)[]) => {
      //adapt the number of children
      if (n.children.length !== vs.length) {
        let tmp = '';
        for (let i = 0; i < vs.length; ++i) {
          tmp += `<div style='background-color: ${colors[i]}' title='${labels[i]}'></div>`;
        }
        n.innerHTML = tmp;
      }
      forEachChild(n, (d: HTMLElement, i) => {
        const v = vs[i];
        attr(<HTMLElement>d, {
          title: labels[i]
        }, {
          display: isMissingValue(v) ? 'none': null,
          left: `${Math.round(v * 100)}%`,
          // jitter
          top: vs.length > 1 ? `${Math.round(Math.random() * 80 + 10)}%` : null,
          'background-color': colors[i]
        });
      });
    };
    return {template: `<div>${tmp}</div>`, render};
  }

  createDOM(col: INumberColumn & Column): IDOMCellRenderer {
    const {template, render} = DotCellRenderer.getDOMRenderer(col);
    return {
      template,
      update: (n: HTMLElement, row: IDataRow) => {
        if (renderMissingDOM(n, col, row)) {
          return;
        }
        const color = this.colorOf(row.v, row.dataIndex, col);
        const v = col.getValue(row.v, row.dataIndex);
        if (!isNumbersColumn(col)) {
          return render(n, [v], [col.getLabel(row.v, row.dataIndex)], [color]);
        }
        const vs: number[] = v.filter((vi: number) => !isMissingValue(vi));
        return render(n, vs, vs.map(NumbersColumn.DEFAULT_FORMATTER), vs.map((_: any) => color));
      }
    };
  }

  createGroupDOM(col: INumberColumn & Column): IDOMGroupRenderer {
    const {template, render} = DotCellRenderer.getDOMRenderer(col);
    return {
      template,
      update: (n: HTMLElement, _group: IGroup, rows: IDataRow[]) => {
        const vs = rows.map((r) => col.getValue(r.v, r.dataIndex));
        const colors = rows.map((r) => this.colorOf(r.v, r.dataIndex, col));

        if (!isNumbersColumn(col)) {
          return render(n, vs, rows.map((r) => col.getLabel(r.v, r.dataIndex)), colors);
        }
        // concatenate all columns
        const all = (<number[]>[]).concat(...vs.filter((vi: number) => !isMissingValue(vi)));
        return render(n, all, all.map(NumbersColumn.DEFAULT_FORMATTER), vs.map((_v: number[], i) => colors[i]));
      }
    };
  }

  // TODO canvas
}
