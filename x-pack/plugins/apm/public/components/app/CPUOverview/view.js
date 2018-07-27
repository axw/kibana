/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import withErrorHandler from '../../shared/withErrorHandler';
import { HeaderContainer } from '../../shared/UIComponents';
import TabNavigation from '../../shared/TabNavigation';
import { getKey } from '../../../store/apiHelpers';
import { FlameGraph } from './FlameGraph';
import { asTime } from '../../../utils/formatters';
import {
  EuiToolTip,
  EuiText,
} from '@elastic/eui';

function maybeLoadList(props) {
  const { serviceName, start, end } = props.urlParams;
  const keyArgs = {
    serviceName,
    start,
    end,
  };
  const key = getKey(keyArgs, false);
  if (serviceName && start && end && props.cpuSamples.key !== key) {
    props.loadCpuSamples(keyArgs);
  }
}

class CPUOverview extends Component {
  componentDidMount() {
    maybeLoadList(this.props);
  }

  componentWillReceiveProps(nextProps) {
    maybeLoadList(nextProps);
  }

  render() {
    const { license, location, cpuSamples } = this.props;
    const { serviceName } = this.props.urlParams;

    // TODO(axw) calculate flamegraph height from amount of data?

    return (
      <div>
        <HeaderContainer>
          <h1>{serviceName}</h1>
        </HeaderContainer>
        <TabNavigation />
        {cpuSamples.status == "SUCCESS" &&
          <FlameGraph data={cpuSamples.data.tree} height={1000} duration={cpuSamples.data.durationNs}/>
	}
      </div>
    );
  }
}

CPUOverview.propTypes = {
  location: PropTypes.object.isRequired
};

export default withErrorHandler(CPUOverview, ['cpuSamples']);
