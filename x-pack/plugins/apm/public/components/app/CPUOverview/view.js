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
import { FlameGraph } from 'react-flame-graph';

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

    return (
      <div>
        <HeaderContainer>
          <h1>{serviceName}</h1>
        </HeaderContainer>
        <TabNavigation />

        {cpuSamples.data.tree &&
        <FlameGraph data={cpuSamples.data.tree} height={800} width={800} />
	}
      </div>
    );
  }
}

CPUOverview.propTypes = {
  location: PropTypes.object.isRequired
};

export default withErrorHandler(CPUOverview, ['cpuSamples']);
