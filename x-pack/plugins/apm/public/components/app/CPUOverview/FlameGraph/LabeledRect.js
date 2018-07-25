/** @flow */

import React from 'react';
import { minWidthToDisplayText, textHeight } from './constants';
import {
  EuiToolTip,
  EuiText,
} from '@elastic/eui';

type Props = {|
  backgroundColor: string,
  color: string,
  height: number,
  isDimmed?: boolean,
  label: string,
  onClick: Function,
  onMouseOver: Function,
  onMouseOut: Function,
  width: number,
  x: number,
  y: number,
|};

const spanStyle = {
  transition: 'all ease-in-out 200ms',
  display: 'block',
};

const gStyle = {
  transition: 'all ease-in-out 200ms'
};

const rectStyle = {
  cursor: 'pointer',
  stroke: '#ffffff',
  transition: 'all ease-in-out 200ms'
};

const foreignObjectStyle = {
  transition: 'all ease-in-out 200ms',
  display: 'block',
  pointerEvents: 'none'
};

const divStyle = {
  pointerEvents: 'none',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
  overflow: 'hidden',
  fontSize: '12px',
  fontFamily: 'sans-serif',
  marginLeft: '4px',
  marginRight: '4px',
  lineHeight: '1.5',
  padding: '0',
  fontWeight: '400',
  textAlign: 'left',
  transition: 'all ease-in-out 200ms',
  userSelect: 'none'
};

const LabeledRect = ({
  backgroundColor,
  color,
  height,
  isDimmed = false,
  isHovered = false,
  label,
  onClick,
  onMouseOver,
  onMouseOut,
  width,
  x,
  y,
}: Props) => (
  <g style={gStyle} transform={`translate(${x},${y})`}>
    <title>{label}</title>
    <rect width={width} height={height} fill="white" style={rectStyle} />
    <rect
      width={width}
      height={height}
      fill={backgroundColor}
      onClick={onClick}
      onMouseOver={onMouseOver}
      onMouseOut={onMouseOut}
      style={Object.assign({}, rectStyle, {opacity: isDimmed ? 0.5 : 1})}
    />
    {width >= minWidthToDisplayText && (
      <foreignObject
        width={width}
        height={height}
        style={Object.assign({}, foreignObjectStyle, {
          opacity: isDimmed ? 0.5 : 1,
          paddingLeft: x < 0 ? -x : 0,
	})}
        y={height < textHeight ? -textHeight : 0}
      >
        <div style={Object.assign({}, divStyle, {color})}>
          {label}
        </div>
      </foreignObject>
    )}
  </g>
);

export default LabeledRect;
