/**
 * Created by sam on 28.10.2016.
 */

import Impl from '../lineup';
import * as React from 'react';
import {IColumnDesc} from '../model';
import {LocalDataProvider} from '../provider'

export interface ILineUpProps<T> {
  data: T[];
  desc: IColumnDesc[];
}


export interface ILineUpState<T> {
  selection: any[]
}

export default class LineUp<T> extends React.Component<ILineUpProps<T>, ILineUpState<T>> {
private plot: Impl = null;
  private parent: HTMLDivElement = null;

  private updatedByMe = false;

  constructor(props: ILineUpProps<T>, context?: any) {
    super(props, context);

    this.state = {
      selection: [] as T[]
    };
  }

  componentDidMount() {
    //create impl
    const data = new LocalDataProvider(this.props.data, this.props.desc);
    data.deriveDefault();
    this.plot = new Impl(this.parent, data, this.props);
    this.plot.update();
  }

  shouldComponentUpdate(nextProps: ILineUpProps<T>, nextState: ILineUpState<T>) {
    //i changed the state to reflect the changes in the impl selection
    if (this.updatedByMe) {
      return false;
    }
    //check selection changes
    const new_ = this.state.selection;
    const old = nextState.selection;
    if (new_.length !== old.length) {
      return true;
    }
    return new_.some((d,i) => d !== old[i]);
  };

  componentDidUpdate() {
    this.updatedByMe = false;
    this.plot.update();
  }

  render() {
    return (
      <div className="lu-react" ref={(div) => this.parent = div}>
      </div>
    );
  }
}

(LineUp as any).propTypes = {
  data: React.PropTypes.array.isRequired,
  desc: React.PropTypes.array.isRequired,
};

(LineUp as any).defaultProps = {
  data: [],
  desc: []
};

