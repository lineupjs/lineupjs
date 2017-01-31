/**
 * Created by sam on 28.10.2016.
 */

import '../style.scss';
import Impl, {ILineUpConfig} from '../lineup';
import * as React from 'react';
import {IColumnDesc} from '../model';
import LocalDataProvider from '../provider/LocalDataProvider';
import ADataProvider from '../provider/ADataProvider';

export interface ILineUpProps<T> {
  data: T[];
  desc: IColumnDesc[];
  options?: ILineUpConfig;
  selection?: T[];
  onSelectionChanged?(selection: T[]): void;
  defineLineUp?(data: ADataProvider): void;
}

function deepEqual<T>(a: T[], b: T[]) {
  if (a === b) {
    return true;
  }
  if (a.length !== b.length) {
    return false;
  }
  return a.every((ai, i) => ai === b[i]);
}

export default class LineUp<T> extends React.Component<ILineUpProps<T>, {}> {
  static readonly propTypes = {
    data: React.PropTypes.array.isRequired,
    desc: React.PropTypes.array.isRequired,
    options: React.PropTypes.any,
    onSelectionChanged: React.PropTypes.func,
    selection: React.PropTypes.any,
    defineLineUp: React.PropTypes.func
  };

  static readonly defaultProps = {
    data: [],
    desc: []
  };

  private plot: Impl = null;
  private parent: HTMLDivElement = null;

  constructor(props: ILineUpProps<T>, context?: any) {
    super(props, context);
  }

  item2index(item: T) {
    return this.props.data.indexOf(item);
  }

  index2item(index: number) {
    return this.props.data[index];
  }

  componentDidMount() {
    //create impl
    const data = new LocalDataProvider(this.props.data, this.props.desc);
    data.on('selectionChanged', this.onSelectionChanged.bind(this));
    data.selectAll(this.props.selection ? this.props.selection.map((d) => this.item2index(d)) : []);
    if (this.props.defineLineUp) {
      this.props.defineLineUp(data);
    } else {
      data.deriveDefault();
    }
    this.plot = new Impl(this.parent, data, this.props.options);
    this.plot.update();
  }

  shouldComponentUpdate(nextProps: ILineUpProps<T>) {
    return !deepEqual(this.props.selection, nextProps.selection) || !deepEqual(this.props.data, nextProps.data);
  }

  private onSelectionChanged(indices: number[]) {
    if (this.props.onSelectionChanged) {
      this.props.onSelectionChanged(indices.map((d) => this.index2item(d)));
    }
  }

  componentDidUpdate() {
    const provider = (this.plot.data as LocalDataProvider);
    if (!deepEqual(provider.data, this.props.data)) {
      const data = new LocalDataProvider(this.props.data, this.props.desc);
      data.on('selectionChanged', this.onSelectionChanged.bind(this));
      data.selectAll(this.props.selection ? this.props.selection.map((d) => this.item2index(d)) : []);
      if (this.props.defineLineUp) {
        this.props.defineLineUp(data);
      } else {
        data.deriveDefault();
      }
      this.plot.changeDataStorage(data);
    } else {
      this.plot.data.setSelection(this.props.selection ? this.props.selection.map((d) => this.item2index(d)) : []);
    }
    this.plot.update();
  }

  render() {
    return (
      <div className="lu-react" ref={(div) => this.parent = div}>
      </div>
    );
  }
}
