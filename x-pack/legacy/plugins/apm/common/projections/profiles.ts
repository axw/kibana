/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Setup,
  SetupTimeRange,
  SetupUIFilters
} from '../../server/lib/helpers/setup_request';
import { SERVICE_NAME, PROCESSOR_EVENT } from '../elasticsearch_fieldnames';
import { rangeFilter } from '../../server/lib/helpers/range_filter';

export function getProfilesProjection({
  setup,
  serviceName,
  serviceNodeName
}: {
  setup: Setup & SetupTimeRange & SetupUIFilters;
  serviceName: string;
  serviceNodeName?: string;
}) {
  const { start, end, uiFiltersES, indices } = setup;

  const filter = [
    { term: { [SERVICE_NAME]: serviceName } },
    { term: { [PROCESSOR_EVENT]: 'profile' } },
    { range: rangeFilter(start, end) },
    ...uiFiltersES
  ];

  return {
    index: indices['apm_oss.profileIndices'],
    body: {
      query: {
        bool: {
          filter
        }
      }
    }
  };
}
