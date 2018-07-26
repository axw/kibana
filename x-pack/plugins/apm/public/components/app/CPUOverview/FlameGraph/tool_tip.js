import React, {
  Component,
  cloneElement,
  Fragment,
} from 'react';
import ReactDOM from 'react-dom';

import PropTypes from 'prop-types';
import classNames from 'classnames';

import { EuiPortal } from '@elastic/eui';
import { EuiToolTipPopover } from '@elastic/eui/lib/components/tool_tip/tool_tip_popover';
import { calculatePopoverPosition } from '@elastic/eui/lib/services';

import makeId from '@elastic/eui/lib/components/form/form_row/make_id';

const positionsToClassNameMap = {
  top: 'euiToolTip--top',
  right: 'euiToolTip--right',
  bottom: 'euiToolTip--bottom',
  left: 'euiToolTip--left',
};

export const POSITIONS = Object.keys(positionsToClassNameMap);

// FlameGraphToolTip is a hacked up EuiToolTip which is always visible,
// and does not require children to be passed in. Instead, it creates
// an anchor span and uses that to obtain the parent DOM node's bounds.
export class FlameGraphToolTip extends Component {
  constructor(props) {
    super(props);

    this.state = {
      calculatedPosition: this.props.position,
      toolTipStyles: {},
      id: this.props.id || makeId(),
    };
  }

  positionToolTip = (toolTipBounds) => {
    const parentNode = ReactDOM.findDOMNode(this.anchor).parentNode;
    const parentBounds = parentNode.getBoundingClientRect();
    const requestedPosition = this.props.position;

    const { position, left, top } = calculatePopoverPosition(parentBounds, toolTipBounds, requestedPosition);

    const toolTipStyles = {
      top: top + window.scrollY,
      left,
    };

    this.setState({
      calculatedPosition: position,
      toolTipStyles,
    });
  };

  render() {
    const {
      children,
      className,
      content,
      title,
      ...rest
    } = this.props;

    const classes = classNames(
      'euiToolTip',
      positionsToClassNameMap[this.state.calculatedPosition],
      className
    );

    const anchor = (
      <span ref={anchor => this.anchor = anchor} className="euiToolTipAnchor"/>
    );

    return (
      <Fragment>
      {anchor}
      <EuiPortal>
        <EuiToolTipPopover
          className={classes}
          style={this.state.toolTipStyles}
          positionToolTip={this.positionToolTip}
          title={title}
          id={this.state.id}
          role="tooltip"
          {...rest}
        >
          {content}
        </EuiToolTipPopover>
      </EuiPortal>
      </Fragment>
    );
  }
}

FlameGraphToolTip.propTypes = {
  /**
   * The main content of your tooltip.
   */
  content: PropTypes.node.isRequired,

  /**
   * An optional title for your tooltip.
   */
  title: PropTypes.node,

  /**
   * Suggested position. If there is not enough room for it this will be changed.
   */
  position: PropTypes.oneOf(POSITIONS),

  /**
   * Passes onto the tooltip itself, not the trigger.
   */
  className: PropTypes.string,

  /**
   * Unless you provide one, this will be randomly generated.
   */
  id: PropTypes.string,
};

FlameGraphToolTip.defaultProps = {
  position: 'top',
};
