/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGrid,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiFlexGroup
} from '@elastic/eui';
import * as d3 from 'd3';
import 'd3-flame-graph/dist/d3-flamegraph.css';
import { flamegraph } from 'd3-flame-graph';
import React, { useEffect, useMemo } from 'react';
import { useServiceProfileData } from '../../../hooks/useServiceProfileData';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { PROJECTION } from '../../../../common/projections/typings';
import { LocalUIFilters } from '../../shared/LocalUIFilters';

export function ServiceProfile() {
  const { urlParams } = useUrlParams();
  const { serviceName } = urlParams;
  const { data } = useServiceProfileData(urlParams);
  const { start, end } = urlParams;

  const localFiltersConfig: React.ComponentProps<typeof LocalUIFilters> = useMemo(
    () => ({
      filterNames: ['host', 'containerId', 'podName', 'serviceVersion'],
      params: {
        serviceName
      },
      projection: PROJECTION.PROFILES,
      showCount: false
    }),
    [serviceName]
  );

  const containerRef = React.createRef();
  useEffect(() => {
    const root = {
      name: 'root',
      value: data.stacks.reduce((acc, cur) => acc + cur.value, 0),
      children: data.stacks
    };
    const containerElem = containerRef.current;
    const chart = flamegraph()
      .width(containerElem.offsetWidth)
      .minFrameSize(5)
      .inverted(true)
      .selfValue(false);
    d3.select(containerRef.current)
      .datum(root)
      .call(chart);
  });

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={1}>
        <LocalUIFilters {...localFiltersConfig} />
      </EuiFlexItem>
      <EuiFlexItem grow={7}>
        <div ref={containerRef} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
