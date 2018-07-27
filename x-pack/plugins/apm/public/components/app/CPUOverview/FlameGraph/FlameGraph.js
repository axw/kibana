/** @flow */

import type { ChartData, ChartNode } from './types';

import React, { PureComponent } from 'react';
import ReactDOM from 'react-dom';
import { FixedSizeList as List } from 'react-window';
import memoize from 'memoize-one';
import ItemRenderer from './ItemRenderer';
import { rowHeight } from './constants';
import { asTime } from '../../../../utils/formatters';

type Props = {|
  data: ChartData,
  height: number,
  duration: number,
|};

type State = {|
  focusedNode: ChartNode,
  hoveredNode: ChartNode,
|};

export default class FlameGraph extends PureComponent<Props, State> {
  // Select the root node by default.
  state: State = {
    focusedNode: this.props.data.nodes[this.props.data.root],
    hoveredNode: null,
  };

  // Shared context between the App and individual List item renderers.
  // Memoize this wrapper object to avoid breaking PureComponent's sCU.
  // Attach the memoized function to the instance,
  // So that multiple instances will maintain their own memoized cache.
  getItemData = memoize((data, focusedNode, hoveredNode, focusNode, hoverNode, nodeDetails, width) => ({
    data,
    focusedNode,
    hoveredNode,
    focusNode,
    hoverNode,
    nodeDetails,
    scale: value => value / focusedNode.width * width,
  }));

  componentDidMount() {
    const parentNode = ReactDOM.findDOMNode(this).parentNode;
    const {width, height} = parentNode.getBoundingClientRect();
    this.setState({width: width, height: height});
  }

  render() {
    const { data, height } = this.props;
    const { focusedNode, hoveredNode, width } = this.state;
    if (!width) {
      return (<div/>);
    }

    const itemData = this.getItemData(data, focusedNode, hoveredNode, this.focusNode, this.hoverNode, this.nodeDetails, width);

    return (
      <List
        height={height}
        innerTagName="svg"
        itemCount={data.height}
        itemData={itemData}
        itemSize={rowHeight}
        width={width}
      >
        {ItemRenderer}
      </List>
    );
  }

  focusNode = (chartNode: ChartNode) =>
    this.setState({
      focusedNode: chartNode,
    });

  hoverNode = (chartNode: ChartNode) =>
    this.setState({
      hoveredNode: chartNode,
    });

  // TODO(axw) also show flat/self value? e.g.
  //
  //   "1ms in this node, 9ms total"
  nodeDetails = (chartNode: ChartNode) => (
    <div>
    <p>{asTime(chartNode.value/1000)} ({chartNode.value/this.props.duration*100}% of {asTime(this.props.duration/1000)})</p>
    </div>
  );
}
