/** @flow */

import type { ChartData, ChartNode } from './types';

import React, { PureComponent } from 'react';
import { FixedSizeList as List } from 'react-window';
import memoize from 'memoize-one';
import ItemRenderer from './ItemRenderer';
import { rowHeight } from './constants';

type Props = {|
  data: ChartData,
  height: number,
  width: number,
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
  getItemData = memoize((data, focusedNode, hoveredNode, focusNode, hoverNode, width) => ({
    data,
    focusedNode,
    hoveredNode,
    focusNode,
    hoverNode,
    scale: value => value / focusedNode.width * width,
  }));

  render() {
    const { data, height, width } = this.props;
    const { focusedNode, hoveredNode } = this.state;

    const itemData = this.getItemData(data, focusedNode, hoveredNode, this.focusNode, this.hoverNode, width);

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
}
