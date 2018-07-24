/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import CPUOverview from './view';
import { getUrlParams } from '../../../store/urlParams';
import { getCpuSamples, loadCpuSamples } from '../../../store/cpusamples';

function mapStateToProps(state = {}) {
  return {
    urlParams: getUrlParams(state),
    cpuSamples: getCpuSamples(state),
    location: state.location,
    license: state.license
  };
}

const mapDispatchToProps = {
  loadCpuSamples
};

export default connect(mapStateToProps, mapDispatchToProps)(CPUOverview);
