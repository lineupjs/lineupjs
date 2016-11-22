/**
 * Created by sam on 28.10.2016.
 */

import '../style.scss';
import Impl, {ILineUpConfig} from '../lineup';
import * as React from 'react';
import {IColumnDesc} from '../model';
import LocalDataProvider from '../provider/LocalDataProvider';

export interface ILineUpProps<T> {
  data: T[];
  desc: IColumnDesc[];
  options?: ILineUpConfig;
  selection?: T[];
  onSelectionChanged?(selection: T[]): void;
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
  static propTypes = {
    data: React.PropTypes.array.isRequired,
    desc: React.PropTypes.array.isRequired,
    options: React.PropTypes.any,
    onSelectionChanged: React.PropTypes.func,
    selection: React.PropTypes.any
  };

  static defaultProps = {
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
    console.log('create lineup instance');
    const data = new LocalDataProvider(this.props.data, this.props.desc);
    data.on('selectionChanged', this.onSelectionChanged.bind(this));
    data.selectAll(this.props.selection ? this.props.selection.map((d) => this.item2index(d)) : []);
    data.deriveDefault();
    this.plot = new Impl(this.parent, data, this.props);
    this.plot.update();
  }

  shouldComponentUpdate?(nextProps: ILineUpProps<T>) {
    return !deepEqual(this.props.selection, nextProps.selection);
  }

  private onSelectionChanged(indices: number[]) {
    if (this.props.onSelectionChanged) {
      this.props.onSelectionChanged(indices.map((d) => this.index2item(d)));
    }
  }

  componentDidUpdate() {
    this.plot.data.setSelection(this.props.selection ? this.props.selection.map((d) => this.item2index(d)) : []);
  }

  render() {
    return (
      <div className="lu-react" ref={(div) => this.parent = div}>
      </div>
    );
  }
}
