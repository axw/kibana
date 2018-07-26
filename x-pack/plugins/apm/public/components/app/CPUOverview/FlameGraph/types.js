/** @flow */

export type ChartNode = {|
  backgroundColor: string,
  color: string,
  depth: number,
  left: number,
  uid: any,
  name: string,
  width: number,
  value: number,
|};

export type ChartData = {|
  height: number,
  levels: Array<Array<any>>,
  nodes: { [uid: any]: ChartNode },
  root: any,
|};

export type ItemData = {|
  data: ChartData,
  focusedNode: ChartNode,
  hoveredNode: ChartNode,
  focusNode: (chartNode: ChartNode) => void,
  hoverNode: (chartNode: ChartNode) => void,
  nodeDetails: (chartNode: ChartNode) => any,
  scale: (value: number) => number,
|};

export type RawData = {|
  name: string,
  value: number,
  children?: Array<RawData>,
|};
