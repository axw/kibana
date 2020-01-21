/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ProfileAPIResponse } from '../../server/lib/profiles/get_profile';
import { IUrlParams } from '../context/UrlParamsContext/types';
import { useUiFilters } from '../context/UrlParamsContext';
import { useFetcher } from './useFetcher';

const INITIAL_DATA: ProfileAPIResponse = {
  stacks: []
};

export function useServiceProfileData(urlParams: IUrlParams) {
  const { serviceName, start, end } = urlParams;
  const uiFilters = useUiFilters(urlParams);
  const { data = INITIAL_DATA, error, status } = useFetcher(
    callApmApi => {
      if (serviceName && start && end) {
        return callApmApi({
          pathname: '/api/apm/services/{serviceName}/profile',
          params: {
            path: { serviceName },
            query: {
              start,
              end,
              uiFilters: JSON.stringify(uiFilters)
            }
          }
        });
      }
    },
    [serviceName, start, end, uiFilters]
  );

  return {
    data,
    status,
    error
  };
}
